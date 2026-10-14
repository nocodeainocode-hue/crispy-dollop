package com.quitvow.shield

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Telefon içi "VPN": trafik dışarıya gitmez. Tünele yalnızca sahte bir DNS sunucusu adresi yönlendirilir; telefonun bütün
 * ad sorguları buraya gelir. Kumar adresleri "böyle bir ad yok" yanıtıyla düşürülür, gerisi telefonun kendi DNS sunucusuna iletilir.
 * Diğer trafik tünele girmez: pil ve hız etkisi yok denecek kadar azdır.
 */
class ShieldVpnService : VpnService() {
  companion object {
    const val ACTION_START = "com.quitvow.shield.START"
    const val ACTION_STOP = "com.quitvow.shield.STOP"
    private val TUN_ADDR = byteArrayOf(10, 111, 222.toByte(), 1)
    private val DNS_ADDR = byteArrayOf(10, 111, 222.toByte(), 2)
    private const val HEARTBEAT_HOURS = 3L

    @Volatile var running = false
      private set
    /** Modül (JS tarafı) durum değişikliğini dinler */
    @Volatile var listener: (() -> Unit)? = null

    fun start(ctx: Context) { ctx.startService(Intent(ctx, ShieldVpnService::class.java).setAction(ACTION_START)) }
    fun stop(ctx: Context) { ctx.startService(Intent(ctx, ShieldVpnService::class.java).setAction(ACTION_STOP)) }
    @Volatile private var instance: ShieldVpnService? = null
    /** Kurallar/liste güncellenince çalışan filtreyi durdurmadan yeniler */
    fun reload(ctx: Context) { instance?.let { s -> s.matcher = ShieldStore.loadMatcher(ctx) } }

    /** Kullanıcı Ayarlar'da "Özel DNS" ile sabit bir sunucu girdiyse sorgular bizi atlar: engel fiilen kapalıdır. */
    fun privateDnsBypass(ctx: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
      val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      @Suppress("DEPRECATION")
      return cm.allNetworks.any { n ->
        val caps = cm.getNetworkCapabilities(n)
        val lp = cm.getLinkProperties(n)
        caps != null && !caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) && lp != null && lp.isPrivateDnsActive && lp.privateDnsServerName != null
      }
    }
  }

  private var tun: ParcelFileDescriptor? = null
  private var reader: Thread? = null
  private var out: FileOutputStream? = null
  @Volatile private var matcher: Matcher? = null
  private var upstreams: List<InetAddress> = emptyList()
  private val forwarders = Executors.newFixedThreadPool(4)
  private var timers: ScheduledExecutorService? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) { shutdown(); stopSelf(); return START_NOT_STICKY }
    // Ayarlar > VPN > "Her zaman açık" ile sistem de başlatabilir (intent action'ı yoktur)
    startShield()
    return START_STICKY
  }

  private fun startShield() {
    if (running) return
    matcher = ShieldStore.loadMatcher(this)
    upstreams = findUpstreams()
    val builder = Builder()
      .setSession("QuitVow")
      .addAddress(InetAddress.getByAddress(TUN_ADDR), 32)
      .addDnsServer(InetAddress.getByAddress(DNS_ADDR))
      .addRoute(InetAddress.getByAddress(DNS_ADDR), 32)
      .setBlocking(true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) builder.setMetered(false)
    // Kendi uygulamamız tünel dışında: sunucuya durum bildirimi filtre bozulsa da gider
    runCatching { builder.addDisallowedApplication(packageName) }
    val fd = builder.establish() ?: run { ShieldStore.reportShield(this, "off"); listener?.invoke(); stopSelf(); return }
    tun = fd
    out = FileOutputStream(fd.fileDescriptor)
    running = true
    instance = this
    ShieldStore.setWanted(this, true)
    reader = Thread({ readLoop(fd) }, "quitvow-shield").also { it.start() }
    timers = Executors.newSingleThreadScheduledExecutor().also { t ->
      // Düzenli sinyal: engel açık. Sinyal kesilirse (uygulama silindi, zorla durduruldu) sunucu 24 saat sonra şahitlere haber verir.
      t.scheduleWithFixedDelay({ ShieldStore.reportShield(this, if (privateDnsBypass(this)) "off" else "on") }, 0, HEARTBEAT_HOURS, TimeUnit.HOURS)
      // Kurallar ve liste günde bir yenilenir
      t.scheduleWithFixedDelay({ if (runCatching { ShieldStore.refresh(this) }.getOrDefault(false)) matcher = ShieldStore.loadMatcher(this) }, 1, 24 * 60, TimeUnit.MINUTES)
    }
    listener?.invoke()
  }

  /** Telefonun gerçek ağının DNS sunucuları (VPN değil); bulunamazsa genel sunucular. */
  private fun findUpstreams(): List<InetAddress> {
    val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    @Suppress("DEPRECATION")
    val sys = cm.allNetworks.filter { n ->
      val c = cm.getNetworkCapabilities(n)
      c != null && !c.hasTransport(NetworkCapabilities.TRANSPORT_VPN) && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }.flatMap { cm.getLinkProperties(it)?.dnsServers ?: emptyList() }
      .filter { it.address.size == 4 }
    return (sys + listOf(InetAddress.getByName("1.1.1.1"), InetAddress.getByName("8.8.8.8"))).distinct()
  }

  private fun readLoop(fd: ParcelFileDescriptor) {
    val input = FileInputStream(fd.fileDescriptor)
    val buf = ByteArray(32767)
    while (running) {
      val n = try { input.read(buf) } catch (_: Exception) { break }
      if (n <= 0) continue
      val udp = Packets.parseUdp4(buf, n) ?: continue
      if (udp.dstPort != 53 || !udp.dst.contentEquals(DNS_ADDR)) continue
      val q = Packets.parseQuery(buf, udp.payloadOffset, udp.payloadLength)
      if (q != null && matcher?.check(q.name) != null) {
        ShieldStore.countBlocked(this)
        write(Packets.buildUdp4(DNS_ADDR, 53, udp.src, udp.srcPort, Packets.nxdomain(buf, udp.payloadOffset, q)))
        continue
      }
      val payload = buf.copyOfRange(udp.payloadOffset, udp.payloadOffset + udp.payloadLength)
      forwarders.execute { forward(payload, udp.src, udp.srcPort) }
    }
  }

  private fun forward(query: ByteArray, client: ByteArray, clientPort: Int) {
    for (server in upstreams.take(3)) {
      try {
        DatagramSocket().use { s ->
          protect(s) // bu soket tünele girmesin, doğrudan gerçek ağdan gitsin
          s.soTimeout = 4000
          s.send(DatagramPacket(query, query.size, server, 53))
          val resp = ByteArray(4096)
          val p = DatagramPacket(resp, resp.size)
          s.receive(p)
          write(Packets.buildUdp4(DNS_ADDR, 53, client, clientPort, resp, p.length))
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
    super.onRevoke()
  }

  private fun shutdown() {
    if (!running && tun == null) return
    running = false
    if (instance === this) instance = null
    timers?.shutdownNow(); timers = null
    runCatching { tun?.close() }
    tun = null; out = null
    reader?.interrupt(); reader = null
    listener?.invoke()
  }

  override fun onDestroy() {
    val wasRunning = running
    shutdown()
    if (wasRunning && ShieldStore.wanted(this)) ShieldStore.reportShield(this, "off")
    forwarders.shutdownNow()
    super.onDestroy()
  }
}
