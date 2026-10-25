package com.quitvow.shield

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS köprüsü: engeli açma/kapama, durum, kural güncelleme. */
class ShieldModule : Module() {
  private val ctx: Context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private var pendingConsent: Promise? = null
  private var matcher: Matcher? = null // yalnızca "dene" için; liste yenilenince sıfırlanır
  @Volatile private var pendingOpen: String? = null // bildirimden gelen açılış isteği (JS alana kadar saklanır)

  private fun status(): Map<String, Any?> {
    val c = ctx
    return mapOf(
      "running" to ShieldVpnService.running,
      "wanted" to ShieldStore.wanted(c),
      "prepared" to (VpnService.prepare(c) == null),
      "privateDnsBypass" to ShieldVpnService.privateDnsBypass(c),
      "alwaysOn" to ShieldVpnService.alwaysOn(),
      "blockedToday" to ShieldStore.blockedToday(c),
      "lastBlockedAt" to ShieldStore.lastBlockedAt(c).toDouble(),
      "listSize" to ShieldStore.listSize(c),
      "listUpdatedAt" to ShieldStore.listUpdatedAt(c).toDouble(),
      "rulesVersion" to ShieldStore.rulesVersion(c),
      "listVersion" to ShieldStore.listVersion(c),
    )
  }

  override fun definition() = ModuleDefinition {
    Name("QuitVowShield")
    Events("onStatus", "onOpen")

    OnCreate {
      ShieldVpnService.listener = { runCatching { sendEvent("onStatus", status()) } }
      // Bildirime dokunulunca (uygulama açıkken) ara ekran isteği hemen JS'e iletilir; kapalıysa kayıt takeOpenRequest ile okunur
      openListener = { screen -> pendingOpen = screen; runCatching { sendEvent("onOpen", mapOf("screen" to screen)) } }
    }
    OnDestroy { ShieldVpnService.listener = null; openListener = null }

    Function("getStatus") { status() }

    /** Sistemin VPN izin penceresini gösterir (bir kez). true: izin var. */
    AsyncFunction("prepare") { promise: Promise ->
      val intent = VpnService.prepare(ctx)
      if (intent == null) { promise.resolve(true); return@AsyncFunction }
      val activity = appContext.currentActivity ?: run { promise.resolve(false); return@AsyncFunction }
      pendingConsent?.resolve(false)
      pendingConsent = promise
      activity.startActivityForResult(intent, REQUEST_VPN)
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, payload ->
      if (payload.requestCode == REQUEST_VPN) {
        pendingConsent?.resolve(payload.resultCode == Activity.RESULT_OK)
        pendingConsent = null
      }
    }

    Function("start") {
      if (VpnService.prepare(ctx) != null) return@Function false
      ShieldStore.setWanted(ctx, true)
      ShieldVpnService.start(ctx)
      true
    }

    /** Kullanıcının kendi isteğiyle kapatması: şahitlere haber gider (aktif pakt varsa). */
    Function("stop") {
      ShieldStore.setWanted(ctx, false)
      ShieldVpnService.stop(ctx)
      ShieldStore.reportShield(ctx, "off")
      true
    }

    Function("setAuth") { apiUrl: String, token: String? -> ShieldStore.setAuth(ctx, apiUrl, token) }
    Function("setLocale") { lang: String -> ShieldStore.setLocale(ctx, lang) }

    /** Uygulama engel bildiriminden açıldıysa hangi ekranı istediğini bir kez verir ("crisis"), sonra siler. */
    Function("takeOpenRequest") {
      pendingOpen?.let { pendingOpen = null; return@Function it }
      ShieldStore.takeOpenRequest(ctx)?.let { return@Function it }
      // Uygulama kapalıyken bildirimden açıldıysa istek, açılış isteğinin içindedir
      val intent = appContext.currentActivity?.intent
      val v = intent?.getStringExtra(ShieldNotifier.EXTRA_OPEN)
      if (v != null) intent.removeExtra(ShieldNotifier.EXTRA_OPEN)
      v
    }
    OnNewIntent { intent ->
      val v = intent.getStringExtra(ShieldNotifier.EXTRA_OPEN) ?: return@OnNewIntent
      intent.removeExtra(ShieldNotifier.EXTRA_OPEN)
      pendingOpen = v
      runCatching { sendEvent("onOpen", mapOf("screen" to v)) }
    }

    AsyncFunction("refresh") {
      val changed = runCatching { ShieldStore.refresh(ctx) }.getOrDefault(false)
      if (changed) { matcher = null; ShieldVpnService.reload(ctx) }
      status()
    }

    /** Bir adresin engelli olup olmadığını söyler ("dene" ekranı için). */
    AsyncFunction("check") { name: String ->
      val m = matcher ?: ShieldStore.loadMatcher(ctx).also { matcher = it }
      m.check(name)?.name
    }

    Function("openVpnSettings") {
      runCatching { ctx.startActivity(Intent(Settings.ACTION_VPN_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess
    }
  }

  companion object {
    private const val REQUEST_VPN = 7174
    /** ShieldOpenActivity → modül: bildirimden gelen açılış isteği (uygulama süreci yaşıyorsa anında) */
    @Volatile var openListener: ((String) -> Unit)? = null
  }
}
