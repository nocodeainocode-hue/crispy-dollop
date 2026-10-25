import nodemailer from 'nodemailer';
import type { Config } from './config.js';
import { run, type Db } from './db.js';
import { fmtCode, uid } from './security.js';
import { asLocale, type Locale } from './i18n.js';
import { renderMailHtml } from './mailHtml.js';

export type Mail = { to: string; subject: string; body: string; kind: string };
export type Mailer = (m: Mail) => Promise<void>;

type Send = (m: Mail) => Promise<unknown>;

/** Gönderim yolu: RESEND_API_KEY (HTTPS; SMTP'yi kapatan barındırmalarda, örn. Railway Hobby) ya da SMTP_URL. İkisi de yoksa null. */
export function createTransport(cfg: Pick<Config, 'resendApiKey' | 'smtpUrl' | 'mailFrom'>, fetchFn: typeof fetch = fetch): Send | null {
  if (cfg.resendApiKey) return async (m) => {
    const r = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.mailFrom, to: [m.to], subject: m.subject, text: m.body, html: renderMailHtml(m) }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
  };
  if (cfg.smtpUrl) {
    const t = nodemailer.createTransport(cfg.smtpUrl);
    return (m) => t.sendMail({ from: cfg.mailFrom, to: m.to, subject: m.subject, text: m.body, html: renderMailHtml(m) });
  }
  return null;
}

/** Her mail önce outbox'a yazılır (denetim/destek için); gönderim yolu varsa ayrıca gönderilir. Hata akışı bozmaz. */
export function createMailer(db: Db, cfg: Config, fetchFn?: typeof fetch): Mailer {
  const send = createTransport(cfg, fetchFn);
  return async (m) => {
    const id = uid();
    await run(db, 'INSERT INTO outbox(id,to_addr,subject,body,kind,status,created_at) VALUES(?,?,?,?,?,?,?)',
      id, m.to, m.subject, m.body, m.kind, send ? 'queued' : 'logged', Date.now());
    if (!cfg.prod) {
      console.log(`[mail:${m.kind}] → ${m.to} · ${m.subject}`);
      // Geliştirmede SMTP yok: kodları konsola da yaz ki telefonda denerken admin paneline bakmak gerekmesin
      if (m.kind === 'login_code') console.log(`   >>> GİRİŞ KODU (${m.to}): ${/(\d{6})/.exec(m.body)?.[1]}`);
      if (m.kind === 'invite') console.log(`   >>> ŞAHİT DAVET KODU (${m.to}): ${/([0-9A-Z]{5}-[0-9A-Z]{5})/.exec(m.body)?.[1]}`);
    }
    if (!send) return;
    // Gönderim akışı bekletmez; sonucu outbox'a yazılır
    send(m)
      .then(() => run(db, "UPDATE outbox SET status='sent' WHERE id=?", id))
      .catch(e => run(db, "UPDATE outbox SET status='failed', error=? WHERE id=?", String(e?.message ?? e), id))
      .catch(() => {});
  };
}

// E-posta şablonları (tr/en). Şahitlere giden metinler sabit/şablon: kullanıcı kurulumda bunları onaylamıştır.
// Dil: pakt sahibinin dili (users.locale). Şahide giden e-posta da sahibin dilindedir.
const TR = {
  code: (code: string) => ({ subject: 'QuitVow giriş kodun', body: `Giriş kodun: ${code}\nKod 10 dakika geçerli. Sen istemediysen bu maili yok say.` }),
  invite: (ownerName: string, guardian: string, habit: string | null, code: string, appUrl: string) => {
    const owner = ownerName || 'Bir yakının';
    return {
      subject: `${owner} seni QuitVow uygulamasında şahidi olarak seçti`,
      body: `Merhaba ${guardian},

${habit ? `${owner}, ${habit} alışkanlığını bırakma sözü verdi ve yanında olmanı istiyor.` : `${owner} kişisel bir hedef için söz verdi ve yanında olmanı istiyor. Hedefin ayrıntısını seninle paylaşmamayı seçti.`}

Şahit olmak şu demek:
• ${habit ? 'Tekrar oynarsa' : 'Sözünü tutamazsa'} bilgilendirilirsin (yargılamadan destek olman beklenir).
• Çıkış talebinde onay anahtarından birini sen tutarsın.
• Hiçbir ücret ödemezsin; özel yazılarına ve imza videosuna erişmezsin, bunlar yalnızca onun telefonunda kalır.

Nasıl kabul edersin?
1) QuitVow uygulamasını indir: ${appUrl}
2) Uygulamayı açınca sağ üstteki ŞAHİT butonuna dokun.
3) Davet kodunu yaz:

    ${fmtCode(code)}

Kod kişiye özeldir, paylaşma. Kabul etmek zorunda değilsin; reddedersen ${owner}'a başka biri aranması söylenir.`,
    };
  },
  pactActive: (owner: string) => ({ subject: 'Paktın aktif', body: `${owner || 'Sen'}, paktın başladı. Her gün bir hücre. Şahitlerin davetini kabul ettikçe "iki anahtar" devreye girer: paktan çıkmak için o an kabul etmiş şahitlerin onayı ve 72 saat bekleme gerekir.` }),
  relapse: (owner: string, self: boolean, hidden = false) => ({
    subject: `${who(owner, 'tr')} bugün zorlandı`,
    body: `${who(owner, 'tr')} sözünü tutamadı ve bunu ${self ? 'kendisi bildirdi (dürüstlük önemli)' : 'senin/sizin fark etmenizle'} paylaştı.\n\nŞimdi yapılacak en iyi şey: yargılamadan arayıp "yanındayım" demek. ${hidden ? 'Utanç, toparlanmanın önündeki en büyük engeldir.' : 'Utanç, kumarın en büyük yakıtıdır.'}\nÖnerilen cümle: "Bugün zorlandığını biliyorum, yanındayım. Konuşmak ister misin?"`,
  }),
  crisis: (owner: string) => ({ subject: `${who(owner, 'tr')} şu an krizde`, body: `${who(owner, 'tr')} "Krizdeyim" butonuna bastı. 15 dakikalık kilit başladı. Mümkünse şimdi arayın veya mesaj atın.` }),
  unlockRequested: (owner: string, link: string) => ({
    subject: `${who(owner, 'tr')} paktan çıkmak istiyor`,
    body: `${who(owner, 'tr')} çıkış talebi başlattı. Çıkış için 2 şahidin onayı ve 72 saat bekleme gerekir.\n\nÖnce konuşun: bu bir kriz mi, gerçek bir karar mı?\nOnay/ret için: ${link}`,
  }),
  unlockProgress: (guardian: string, n: number) => ({ subject: 'Çıkış talebi güncellendi', body: `${guardian} çıkış talebini onayladı (${n}/2).` }),
  support: (guardian: string, text: string) => ({ subject: `${guardian} sana destek mesajı gönderdi`, body: `${guardian}: "${text}"` }),
  inviteStatus: (guardian: string, accepted: boolean) => accepted
    ? { subject: `Şahit daveti: ${guardian} kabul etti`, body: `${guardian} davetini kabul etti. ` }
    : { subject: `Şahit daveti: ${guardian} reddetti`, body: `${guardian} davetini reddetti. Lütfen yerine başka bir şahit seç.` },
  shieldOff: (owner: string, hidden = false) => ({ subject: `${who(owner, 'tr')} ${hidden ? 'koruma özelliğini' : 'bahis engelini'} kapattı`, body: `${who(owner, 'tr')} adlı kişinin telefonundaki ${hidden ? 'koruma özelliği' : 'bahis engeli'} kapatıldı veya devre dışı kaldı. Bu, tekrar oynadığı anlamına gelmez ama risk işareti olabilir. Yargılamadan arayıp nasıl olduğunu sor; engeli birlikte yeniden açın.` }),
  heartbeatMissed: (owner: string) => ({ subject: `${who(owner, 'tr')}: 24 saattir sinyal yok`, body: `${who(owner, 'tr')} adlı kişinin QuitVow uygulamasından 24 saattir sinyal alınamıyor (uygulama silinmiş, telefon kapalı veya internet kesik olabilir). Mümkünse bir arayıp hal hatır sor.` }),
  closed: (owner: string) => ({ subject: `${who(owner, 'tr')} paktı sonlandırdı`, body: `${who(owner, 'tr')} paktı sona erdirdi. Şahitlik görevin bitti, teşekkürler.` }),
  completed: (owner: string, days: number, cleanDays: number | null, _hidden = false) => ({
    subject: `${who(owner, 'tr')} ${days} günlük paketini tamamladı 🎉`,
    body: cleanDays === null
      ? `${who(owner, 'tr')} ${days} günlük paketini hiç bozmadan tamamladı. Senin desteğinle.\n\nBir tebrik mesajı ya da arama, bu emeği görmenin en güzel yolu.`
      : `${who(owner, 'tr')} ${days} günlük paketini sonuna kadar götürdü; son ${cleanDays} günü temiz. Arada zorlandığı günler oldu ama bırakmadı. Senin desteğinle.\n\nBir tebrik mesajı ya da arama, bu emeği görmenin en güzel yolu.`,
  }),
  packCompleted: (owner: string, days: number, cleanDays: number | null, discountPct: number) => ({
    subject: 'Paketini tamamladın',
    body: `${owner || 'Merhaba'}, ${days} günlük paketini tamamladın${cleanDays === null ? ', hem de hiç bozmadan' : `; son ${cleanDays} günün temiz`}. Bu senin emeğin.\n\nUygulamada tamamlama belgen hazır; istersen paylaşabilirsin.${discountPct ? `\nBir sonraki paketinde %${discountPct} indirim hakkın var.` : ''}\n\nBırakmak tek seferlik bir olay değil; devam etmek istersen QuitVow yanında.`,
  }),
  weekly: (owner: string, days: number, hidden = false) => ({
    subject: `${who(owner, 'tr')} için bu hafta iyi geçti`,
    body: `${who(owner, 'tr')} bu hafta 7 günün ${days}'${days === 1 || days === 5 ? 'inde' : days === 3 || days === 4 ? 'ünde' : days === 6 ? 'sında' : 'sinde'} günlük kontrolünü yaptı ve ${hidden ? 'sözünü bozduğunu' : 'tekrar oynadığını'} bildirmedi.\n\nKısa bir "seninle gurur duyuyorum" mesajı, sandığından çok iş görür.`,
  }),
};

const EN: typeof TR = {
  code: (code: string) => ({ subject: 'Your QuitVow sign-in code', body: `Your sign-in code: ${code}\nThe code is valid for 10 minutes. If you didn't request it, ignore this email.` }),
  invite: (ownerName: string, guardian: string, habit: string | null, code: string, appUrl: string) => {
    const owner = ownerName || 'Someone close to you';
    return {
      subject: `${owner} chose you as their witness on QuitVow`,
      body: `Hi ${guardian},

${habit ? `${owner} has promised to quit ${habit} and would like you by their side.` : `${owner} has made a promise towards a personal goal and would like you by their side. They chose not to share the details of the goal.`}

Being a witness means:
• You'll be told if they ${habit ? 'gamble again' : "can't keep their promise"} (you're expected to support, not judge).
• If they ask to leave the pact, you hold one of the approval keys.
• You pay nothing and can't see their private notes or vow video; those stay only on their phone.

How to accept
1) Download the QuitVow app: ${appUrl}
2) Open the app and tap the WITNESS button at the top right.
3) Enter your invite code:

    ${fmtCode(code)}

The code is personal, so don't share it. You don't have to accept; if you decline, ${owner} will be asked to choose someone else.`,
    };
  },
  pactActive: (owner: string) => ({ subject: 'Your pact is active', body: `${owner || 'Hi'}, your pact has started. One cell a day. As your witnesses accept, the "two keys" come into play: leaving the pact needs approval from the witnesses who have accepted at that point and a 72-hour wait.` }),
  relapse: (owner: string, self: boolean, hidden = false) => ({
    subject: `${who(owner, 'en')} had a hard day`,
    body: `${who(owner, 'en')} couldn't keep their promise and ${self ? 'reported it themselves (honesty matters)' : 'it came to light because you noticed'}.\n\nThe best thing to do now: call without judgement and say "I'm here for you". ${hidden ? 'Shame is the biggest obstacle to getting back on track.' : 'Shame is what keeps gambling going.'}\nSuggested words: "I know today was hard. I'm here for you. Do you want to talk?"`,
  }),
  crisis: (owner: string) => ({ subject: `${who(owner, 'en')} is in crisis right now`, body: `${who(owner, 'en')} pressed the "I'm in crisis" button. A 15-minute lock has started. If you can, call or message them now.` }),
  unlockRequested: (owner: string, link: string) => ({
    subject: `${who(owner, 'en')} wants to leave the pact`,
    body: `${who(owner, 'en')} has started an exit request. Leaving needs approval from 2 witnesses and a 72-hour wait.\n\nTalk first: is this a crisis or a real decision?\nTo approve or decline: ${link}`,
  }),
  unlockProgress: (guardian: string, n: number) => ({ subject: 'Exit request updated', body: `${guardian} approved the exit request (${n}/2).` }),
  support: (guardian: string, text: string) => ({ subject: `${guardian} sent you a message of support`, body: `${guardian}: "${text}"` }),
  inviteStatus: (guardian: string, accepted: boolean) => accepted
    ? { subject: `Witness invite: ${guardian} accepted`, body: `${guardian} accepted your invite. ` }
    : { subject: `Witness invite: ${guardian} declined`, body: `${guardian} declined your invite. Please choose another witness.` },
  shieldOff: (owner: string, hidden = false) => ({ subject: `${who(owner, 'en')} turned off the ${hidden ? 'protection feature' : 'betting blocker'}`, body: `The ${hidden ? 'protection feature' : 'betting blocker'} on ${who(owner, 'en')}'s phone was turned off or stopped working. This doesn't mean they gambled, but it can be a warning sign. Call without judgement, ask how they're doing, and turn the blocker back on together.` }),
  heartbeatMissed: (owner: string) => ({ subject: `No signal from ${who(owner, 'en')} for 24 hours`, body: `We haven't received a signal from ${who(owner, 'en')}'s QuitVow app for 24 hours (the app may have been deleted, the phone may be off, or there may be no internet). If you can, give them a call and check in.` }),
  closed: (owner: string) => ({ subject: `${who(owner, 'en')} ended the pact`, body: `${who(owner, 'en')} has ended the pact. Your role as witness is over. Thank you.` }),
  completed: (owner: string, days: number, cleanDays: number | null, _hidden = false) => ({
    subject: `${who(owner, 'en')} completed their ${days}-day pack 🎉`,
    body: cleanDays === null
      ? `${who(owner, 'en')} completed their ${days}-day pack without a single slip. With your support.\n\nA congratulations message or a call is the best way to recognise the effort.`
      : `${who(owner, 'en')} saw their ${days}-day pack through to the end; the last ${cleanDays} days were clean. There were hard days along the way, but they didn't give up. With your support.\n\nA congratulations message or a call is the best way to recognise the effort.`,
  }),
  packCompleted: (owner: string, days: number, cleanDays: number | null, discountPct: number) => ({
    subject: 'You completed your pack',
    body: `${owner || 'Hi'}, you completed your ${days}-day pack${cleanDays === null ? ' without a single slip' : `; your last ${cleanDays} days were clean`}. That's your work.\n\nYour completion certificate is ready in the app if you'd like to share it.${discountPct ? `\nYou've earned ${discountPct}% off your next pack.` : ''}\n\nQuitting isn't a one-time event; if you want to keep going, QuitVow is here.`,
  }),
  weekly: (owner: string, days: number, hidden = false) => ({
    subject: `A good week for ${who(owner, 'en')}`,
    body: `${who(owner, 'en')} did their daily check-in on ${days} of the last 7 days and didn't report ${hidden ? 'breaking their promise' : 'gambling'}.\n\nA short "I'm proud of you" message goes further than you'd think.`,
  }),
};

/** Adı yoksa nötr bir ifade */
function who(name: string, l: Locale) { return name || (l === 'en' ? 'The person you support' : 'Şahidi olduğun kişi'); }
/** Dile göre şablon seti: T(o.locale).crisis(o.name) */
export const T = (l: unknown) => (asLocale(l) === 'en' ? EN : TR);
