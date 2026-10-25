package com.quitvow.shield

import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.content.ContextCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Telefon içi "VPN": trafik dışarıya gitmez. Tünele yalnızca sahte bir DNS sunucusu adresi (ve bilinen genel çözümleyicilerin
 * adresleri) yönlendirilir; telefonun bütün ad sorguları buraya gelir. Kumar adresleri "böyle bir ad yok" yanıtıyla düşürülür,
 * gerisi telefonun kendi DNS sunucusuna iletilir. Diğer trafik tünele girmez: pil ve hız etkisi yok denecek kadar azdır.
 *
 * Ön plan servisi olarak çalışır (Android'in arka plan servislerini bir dakika içinde durdurmasına takılmaz); Android 14+ için
 * tür "systemExempted"dir: sistem bunu VPN izni verilmiş uygulamalara tanır (BIND_VPN_SERVICE + kullanıcı onayı).
 */
class ShieldVpnService : VpnService() {
  companion object {
    const val ACTION_START = "com.quitvow.shield.START"
    const val ACTION_STOP = "com.quitvow.shield.STOP"
    private val TUN_ADDR = byteArrayOf(10, 111, 222.toByte(), 1)
    private val DNS_ADDR = byteArrayOf(10, 111, 222.toByte(), 2)
    private const val HEARTBEAT_HOURS = 3L
    private const val UPSTREAM_TIMEOUT_MS = 2500
    private val FALLBACK_UPSTREAMS: List<InetAddress> by lazy { listOf("1.1.1.1", "8.8.8.8", "9.9.9.9").map { InetAddress.getByName(it) } }

    @Volatile var running = false
      private set
    /** Modül (JS tarafı) durum değişikliğini dinler */
    @Volatile var listener: (() -> Unit)? = null
    @Volatile private var instance: ShieldVpnService? = null

    /** Ayarlar > VPN > "Her zaman açık" bu uygulama için açık mı (Android 10+; bilinmiyorsa false). */
    fun alwaysOn(): Boolean {
      val s = instance ?: return false
      return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && runCatching { s.isAlwaysOn }.getOrDefault(false)
    }

    fun start(ctx: Context) {
      // Ön plan servisi: arka plandan (açılış alıcısı) da başlatılabilir; onStartCommand ilk iş startForeground çağırır
      ContextCompat.startForegroundService(ctx, Intent(ctx, ShieldVpnService::class.java).setAction(ACTION_START))
    }
    fun stop(ctx: Context) {
      // Tünel kuruluyken sistem servise BAĞLI kalır (onRevoke iletebilmek için); bu yüzden stopService tek başına onDestroy'u
      // çağırmaz ve engel açık kalır. Tünel doğrudan kapatılır: fd kapanınca sistem bağı bırakır, servis de durur.
      val s = instance
      if (s != null) { s.shutdown(); s.stopForegroundCompat(); s.stopSelf() }
      else runCatching { ctx.stopService(Intent(ctx, ShieldVpnService::class.java)) }
    }
    /** Kurallar/liste güncellenince çalışan filtreyi durdurmadan yeniler */
    fun reload(ctx: Context) {
      val s = instance ?: return
      val r = ShieldStore.loadRules(ctx)
      s.matcher = ShieldStore.loadMatcher(ctx, r)
      s.blockLog = BlockLog()
    }

    /** Kullanıcı Ayarlar'da "Özel DNS" ile sabit bir sunucu girdiyse sorgular bizi atlar: engel fiilen kapalıdır. */
    fun privateDnsBypass(ctx: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
      val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      @Suppress("DEPRECATION")
      return runCatching {
        cm.allNetworks.any { n ->
          val caps = cm.getNetworkCapabilities(n)
          val lp = cm.getLinkProperties(n)
          caps != null && !caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) && lp != null && lp.isPrivateDnsActive && lp.privateDnsServerName != null
        }
      }.getOrDefault(false)
    }
  }

  private var tun: ParcelFileDescriptor? = null
  private var reader: Thread? = null
  private var out: FileOutputStream? = null
  @Volatile private var matcher: Matcher? = null
  @Volatile private var blockLog = BlockLog()
  @Volatile private var resolverNets: Cidr = Cidr.EMPTY
  @Volatile private var upstreams: List<InetAddress> = emptyList()
  private val forwarders = Executors.newFixedThreadPool(8)
  private var timers: ScheduledExecutorService? = null
  private var cm: ConnectivityManager? = null
  private var netWatch: ConnectivityManager.NetworkCallback? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) { shutdown(); stopForegroundCompat(); stopSelf(); return START_NOT_STICKY }
    // startForegroundService sözleşmesi: önce bildirim, sonra iş. Ayarlar > VPN > "Her zaman açık" ile sistem de başlatır (action yok).
    // Ön plana geçilemezse (Android 14+ tür izni yok: VPN onayı geri alınmış) servis hemen durur; yoksa sistem 10 sn sonra uygulamayı düşürür.
    if (!foreground()) { ShieldStore.reportShield(this, "off"); listener?.invoke(); stopSelf(); return START_NOT_STICKY }
    if (!startShield()) { stopForegroundCompat(); stopSelf(); return START_NOT_STICKY }
    return START_STICKY
  }

  private fun foreground(): Boolean {
    val n = ShieldNotifier.ongoing(this)
    return runCatching {
      if (Build.VERSION.SDK_INT >= 34) startForeground(ShieldNotifier.ONGOING_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
      else startForeground(ShieldNotifier.ONGOING_ID, n)
    }.isSuccess
  }

  @Suppress("DEPRECATION")
  private fun stopForegroundCompat() {
    runCatching { if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE) else stopForeground(true) }
  }

  private fun startShield(): Boolean {
    if (running) return true
    val rules = ShieldStore.loadRules(this)
    matcher = ShieldStore.loadMatcher(this, rules)
    resolverNets = Cidr.parse(rules.resolvers)
    cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    upstreams = findUpstreams()
    val builder = Builder()
      .setSession("QuitVow")
      .addAddress(InetAddress.getByAddress(TUN_ADDR), 32)
      .addDnsServer(InetAddress.getByAddress(DNS_ADDR))
      .addRoute(InetAddress.getByAddress(DNS_ADDR), 32)
      .setBlocking(true)
    // Bilinen genel çözümleyiciler de tünele: sistem DNS'ini atlayan uygulama/tarayıcı (sabit 8.8.8.8, DoH IP'si) filtreyi aşamaz
    for (r in rules.resolvers) Cidr.parseOne(r)?.let { (net, bits) -> runCatching { builder.addRoute(InetAddress.getByAddress(net), bits) } }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) builder.setMetered(false)
    // Kendi uygulamamız tünel dışında: sunucuya durum bildirimi ve liste indirme filtre bozulsa da çalışır
    runCatching { builder.addDisallowedApplication(packageName) }
    val fd = runCatching { builder.establish() }.getOrNull() ?: run { ShieldStore.reportShield(this, "off"); listener?.invoke(); return false }
    tun = fd
    out = FileOutputStream(fd.fileDescriptor)
    running = true
    instance = this
    ShieldStore.setWanted(this, true)
    reader = Thread({ readLoop(fd) }, "quitvow-shield").also { it.start() }
    watchNetwork()
    timers = Executors.newSingleThreadScheduledExecutor().also { t ->
      // Düzenli sinyal: engel açık. Sinyal kesilirse (uygulama silindi, zorla durduruldu) sunucu 24 saat sonra şahitlere haber verir.
      t.scheduleWithFixedDelay({ ShieldStore.reportShield(this, if (privateDnsBypass(this)) "off" else "on") }, 0, HEARTBEAT_HOURS, TimeUnit.HOURS)
      // Kurallar ve liste günde bir yenilenir; liste hiç inmediyse hemen
      val first = if (ShieldStore.hasList(this)) 60L else 3L
      t.scheduleWithFixedDelay({ if (runCatching { ShieldStore.refresh(this) }.getOrDefault(false)) reload(this) }, first, 24 * 60 * 60, TimeUnit.SECONDS)
    }
    listener?.invoke()
    return true
  }

  /** Ağ değişince (Wi-Fi ↔ mobil) üst DNS sunucuları yenilenir; yoksa eski ağın sunucusu zaman aşımına düşer. */
  private fun watchNetwork() {
    val cm = cm ?: return
    val cb = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) { upstreams = findUpstreams() }
      override fun onLost(network: Network) { upstreams = findUpstreams() }
      override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) { upstreams = findUpstreams() }
    }
    val req = NetworkRequest.Builder()
      .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      .addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
      .build()
    if (runCatching { cm.registerNetworkCallback(req, cb) }.isSuccess) netWatch = cb
  }

  /** Telefonun gerçek ağının DNS sunucuları (VPN değil), etkin ağ önce; bulunamazsa genel sunucular. */
  private fun findUpstreams(): List<InetAddress> {
    val cm = cm ?: return FALLBACK_UPSTREAMS
    return runCatching {
      val active = cm.activeNetwork
      @Suppress("DEPRECATION")
      val nets = (listOfNotNull(active) + cm.allNetworks.toList()).distinct().filter { n ->
        val c = cm.getNetworkCapabilities(n)
        c != null && !c.hasTransport(NetworkCapabilities.TRANSPORT_VPN) && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      }
      val sys = nets.flatMap { cm.getLinkProperties(it)?.dnsServers ?: emptyList() }
      (sys + FALLBACK_UPSTREAMS).distinct()
    }.getOrDefault(FALLBACK_UPSTREAMS)
  }

  private fun readLoop(fd: ParcelFileDescriptor) {
    val input = FileInputStream(fd.fileDescriptor)
    val buf = ByteArray(32767)
    while (running) {
      val n = try { input.read(buf) } catch (_: Exception) { break }
      if (n <= 0) continue
      val ip = Packets.parseIp4(buf, n) ?: continue
      val toDns = ip.dst.contentEquals(DNS_ADDR)
      if (!toDns && !resolverNets.contains(ip.dst)) continue
      when (ip.proto) {
        Packets.PROTO_UDP -> {
          val udp = Packets.parseUdp4(buf, n) ?: continue
          if (udp.dstPort != 53) continue // DoQ/DoH3 (UDP 853/443) sessizce düşer
          handleDns(buf, udp)
        }
        // DoT (853), DoH (443), DNS/TCP (53): istemci beklemesin diye hemen reddedilir
        Packets.PROTO_TCP -> {
          val t = Packets.parseTcp4(buf, n) ?: continue
          if ((t.flags and Packets.TCP_RST) == 0) write(Packets.tcpRst(t))
        }
      }
    }
  }

  private fun handleDns(buf: ByteArray, udp: Packets.Udp4) {
    val q = Packets.parseQuery(buf, udp.payloadOffset, udp.payloadLength)
    val reason = if (q != null) matcher?.check(q.name) else null
    if (q != null && reason != null) {
      // Aynı ad için art arda gelen sorgular (A, AAAA, HTTPS, yeniden deneme) bir kez sayılır ve bir kez bildirilir
      if (reason != Matcher.Reason.DOH && blockLog.first(q.name)) {
        ShieldStore.countBlocked(this)
        ShieldNotifier.blocked(this)
      }
      write(Packets.buildUdp4(udp.dst, 53, udp.src, udp.srcPort, Packets.nxdomain(buf, udp.payloadOffset, q)))
      return
    }
    val payload = buf.copyOfRange(udp.payloadOffset, udp.payloadOffset + udp.payloadLength)
    val from = udp.dst // yanıt, sorgunun gittiği adresten dönmeli (sahte DNS ya da 8.8.8.8)
    runCatching { forwarders.execute { forward(payload, from, udp.src, udp.srcPort) } }
  }

  private fun forward(query: ByteArray, from: ByteArray, client: ByteArray, clientPort: Int) {
    for (server in upstreams.take(3)) {
      try {
        DatagramSocket().use { s ->
          protect(s) // bu soket tünele girmesin, doğrudan gerçek ağdan gitsin
          s.soTimeout = UPSTREAM_TIMEOUT_MS
          s.send(DatagramPacket(query, query.size, server, 53))
          val resp = ByteArray(4096)
          val p = DatagramPacket(resp, resp.size)
          s.receive(p)
          write(Packets.buildUdp4(from, 53, client, clientPort, resp, p.length))
        }
        return
      } catch (_: Exception) { /* sıradaki sunucuyu dene */ }
    }
  }

  private fun write(packet: ByteArray) {
    val o = out ?: return
    synchronized(o) { runCatching { o.write(packet) } }
  }

  /** Kullanıcı Ayarlar'dan VPN'i kapattı ya da başka bir VPN uygulaması açıldı */
  override fun onRevoke() {
    shutdown()
    ShieldStore.reportShield(this, "off")
    listener?.invoke()
    stopForegroundCompat()
    stopSelf()
    super.onRevoke()
  }

  private fun shutdown() {
    if (!running && tun == null) return
    running = false
    if (instance === this) instance = null
    timers?.shutdownNow(); timers = null
    netWatch?.let { w -> runCatching { cm?.unregisterNetworkCallback(w) } }; netWatch = null
    runCatching { tun?.close() }
    tun = null; out = null
    reader?.interrupt(); reader = null
    listener?.invoke()
  }

  override fun onDestroy() {
    val wasRunning = running
    shutdown()
    // Sistem servisi kapattıysa (kullanıcı değil) ve kullanıcı engeli istiyorsa: durum artık "kapalı"
    if (wasRunning && ShieldStore.wanted(this)) ShieldStore.reportShield(this, "off")
    forwarders.shutdownNow()
    super.onDestroy()
  }
}
