package com.quitvow.shield

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.VpnService

/**
 * Telefon yeniden başlayınca ya da uygulama güncellenince, kullanıcı engeli açık bıraktıysa yeniden başlatır.
 * Bu iki yayın, arka plandan ön plan servisi başlatma yasağından muaftır.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!ShieldStore.wanted(ctx) || VpnService.prepare(ctx) != null) return
    runCatching { ShieldVpnService.start(ctx) }
  }
}
