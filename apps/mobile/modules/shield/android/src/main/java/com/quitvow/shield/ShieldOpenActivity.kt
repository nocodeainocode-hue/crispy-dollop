package com.quitvow.shield

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Engel bildirimine dokununca açılan görünmez ara ekran. Uygulama arka plandayken Android, ana ekranı öne getirip
 * bildirimdeki isteği iletmeyebiliyor; bu yüzden isteği ("crisis") kaydeder, uygulamayı öne getirir ve hemen kapanır.
 * Uygulama öne gelince JS tarafı kaydı okuyup kriz modunu açar (ShieldModule.takeOpenRequest).
 */
class ShieldOpenActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    ShieldStore.setOpenRequest(this, intent?.getStringExtra(ShieldNotifier.EXTRA_OPEN) ?: "crisis")
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    finish()
  }
}
