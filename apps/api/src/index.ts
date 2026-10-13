import { config } from './config.js';
import { createApp } from './app.js';
import { checkMissedHeartbeats, retryPlayConsume, sendWeeklyDigests } from './service.js';

const { app, ctx } = await createApp();
setInterval(() => checkMissedHeartbeats(ctx).catch(e => console.error('heartbeat kontrolü:', e)), 15 * 60_000).unref();
setInterval(() => sendWeeklyDigests(ctx).catch(e => console.error('haftalık iyi haber:', e)), 60 * 60_000).unref();
setInterval(() => retryPlayConsume(ctx).catch(e => console.error('play tüketme yeniden deneme:', e)), 15 * 60_000).unref();
app.listen(config.port, () => console.log(`QuitVow API → http://localhost:${config.port}  (veritabanı: ${ctx.db.kind}, google play: ${ctx.play ? 'bağlı' : 'yok'})`));
