package com.quitvow.shield

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Engel bildirimine dokununca açılan görünmez ara ekran. Uygulama arka plandayken Android, ana ekranı öne getirip
 * bildirimdeki isteği iletmeyebiliyor; bu yüzden isteği ("crisis") kaydeder, süreç yaşıyorsa modüle de anında bildirir,
 * uygulamayı öne getirir ve hemen kapanır. JS tarafı kaydı okuyup kriz modunu açar (ShieldModule.takeOpenRequest / onOpen).
 */
class ShieldOpenActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val screen = intent?.getStringExtra(ShieldNotifier.EXTRA_OPEN) ?: "crisis"
    ShieldStore.setOpenRequest(this, screen)
    ShieldModule.openListener?.invoke(screen)
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    finish()
  }
}
