package com.quitvow.shield

import android.Manifest
import android.app.Notification
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
 * İki bildirim:
 * 1) Ön plan servisinin kalıcı, sessiz bildirimi ("Bahis engeli açık"): Android ön plan servisi için zorunlu kılar; dokununca uygulama açılır.
 * 2) Engel bir bahis sitesini durdurduğunda kısa bir bildirim: "site açılmadı" anını boş bir hata olmaktan çıkarır.
 *    Dokununca uygulama kriz modunda açılır. Art arda bildirim yağmasın diye en fazla 2 dakikada bir gösterilir.
 */
object ShieldNotifier {
  private const val CHANNEL_BLOCKS = "shield_blocks"
  private const val CHANNEL_STATUS = "shield_status"
  private const val BLOCK_ID = 7175
  const val ONGOING_ID = 7176
  private const val MIN_GAP_MS = 2 * 60 * 1000L
  const val EXTRA_OPEN = "quitvow.open"
  const val ACTION_OPEN = "com.quitvow.shield.OPEN"

  private class Texts(val blocksChannel: String, val statusChannel: String, val blockedTitle: String, val blockedBody: String, val onTitle: String, val onBody: String)

  private fun texts(ctx: Context): Texts =
    if (ShieldStore.locale(ctx) == "en") Texts(
      "Betting blocker", "Betting blocker status",
      "A betting site was blocked.", "If an urge is rising, open crisis mode →",
      "Betting blocker is on", "Betting and casino sites are closed on this phone.",
    ) else Texts(
      "Bahis engeli", "Bahis engeli durumu",
      "Bir bahis sitesi engellendi.", "Dürtü yükseliyorsa kriz moduna geç →",
      "Bahis engeli açık", "Bu telefonda bahis ve casino siteleri kapalı.",
    )

  private fun channel(ctx: Context, id: String, name: String, importance: Int) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(NotificationManager::class.java)
    if (nm.getNotificationChannel(id) == null) nm.createNotificationChannel(NotificationChannel(id, name, importance).apply { setShowBadge(false) })
  }

  private fun launchApp(ctx: Context): PendingIntent? {
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return null
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(ctx, ONGOING_ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** Ön plan servisinin kalıcı bildirimi: sessiz, düşük öncelik; kullanıcı kanalı kısabilir. */
  fun ongoing(ctx: Context): Notification {
    val t = texts(ctx)
    channel(ctx, CHANNEL_STATUS, t.statusChannel, NotificationManager.IMPORTANCE_LOW)
    return NotificationCompat.Builder(ctx, CHANNEL_STATUS)
      .setSmallIcon(R.drawable.quitvow_shield_notification)
      .setContentTitle(t.onTitle)
      .setContentText(t.onBody)
      .setContentIntent(launchApp(ctx))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_DEFERRED)
      .build()
  }

  fun blocked(ctx: Context) {
    val p = ShieldStore.prefs(ctx)
    val now = System.currentTimeMillis()
    if (now - p.getLong("notifiedAt", 0) < MIN_GAP_MS) return
    if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    p.edit().putLong("notifiedAt", now).apply()

    val t = texts(ctx)
    channel(ctx, CHANNEL_BLOCKS, t.blocksChannel, NotificationManager.IMPORTANCE_DEFAULT)
    // Uygulama arka plandayken Android isteği ana ekrana iletmeyebiliyor: ara ekran isteği kaydedip uygulamayı öne getirir
    val launch = Intent(ctx, ShieldOpenActivity::class.java).apply {
      action = ACTION_OPEN
      putExtra(EXTRA_OPEN, "crisis")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val pi = PendingIntent.getActivity(ctx, BLOCK_ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val n = NotificationCompat.Builder(ctx, CHANNEL_BLOCKS)
      .setSmallIcon(R.drawable.quitvow_shield_notification)
      .setContentTitle(t.blockedTitle)
      .setContentText(t.blockedBody)
      .setStyle(NotificationCompat.BigTextStyle().bigText(t.blockedBody))
      .setContentIntent(pi)
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .build()
    runCatching { NotificationManagerCompat.from(ctx).notify(BLOCK_ID, n) }
  }
}
