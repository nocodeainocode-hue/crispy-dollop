package com.quitvow.shield

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Engel bir bahis sitesini durdurduğunda kısa bir bildirim: "site açılmadı" anını boş bir hata olmaktan çıkarır.
 * Dokununca uygulama kriz modunda açılır. Art arda bildirim yağmasın diye en fazla 2 dakikada bir gösterilir.
 */
object ShieldNotifier {
  private const val CHANNEL = "shield_blocks"
  private const val ID = 7175
  private const val MIN_GAP_MS = 2 * 60 * 1000L
  const val EXTRA_OPEN = "quitvow.open"
  const val ACTION_OPEN = "com.quitvow.shield.OPEN"

  private fun texts(ctx: Context): Triple<String, String, String> =
    if (ShieldStore.locale(ctx) == "en") Triple("Betting blocker", "A betting site was blocked.", "If an urge is rising, open crisis mode →")
    else Triple("Bahis engeli", "Bir bahis sitesi engellendi.", "Dürtü yükseliyorsa kriz moduna geç →")

  fun blocked(ctx: Context) {
    val p = ShieldStore.prefs(ctx)
    val now = System.currentTimeMillis()
    if (now - p.getLong("notifiedAt", 0) < MIN_GAP_MS) return
    if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    p.edit().putLong("notifiedAt", now).apply()

    val (channelName, title, body) = texts(ctx)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = ctx.getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(CHANNEL) == null) nm.createNotificationChannel(NotificationChannel(CHANNEL, channelName, NotificationManager.IMPORTANCE_DEFAULT))
    }
    // Uygulama arka plandayken Android isteği ana ekrana iletmeyebiliyor: ara ekran isteği kaydedip uygulamayı öne getirir
    val launch = Intent(ctx, ShieldOpenActivity::class.java).apply {
      action = ACTION_OPEN
      putExtra(EXTRA_OPEN, "crisis")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val pi = PendingIntent.getActivity(ctx, ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val n = NotificationCompat.Builder(ctx, CHANNEL)
      .setSmallIcon(R.drawable.quitvow_shield_notification)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(pi)
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .build()
    runCatching { NotificationManagerCompat.from(ctx).notify(ID, n) }
  }
}
