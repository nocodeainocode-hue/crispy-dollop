import { describe, it, expect } from 'vitest';
import { createTransport } from '../src/mail.js';

const mail = { to: 'ana@test.io', subject: 'Konu', body: 'Metin', kind: 'invite' };

describe('mail gönderim yolu', () => {
  it('RESEND_API_KEY varsa Resend HTTPS API kullanılır (SMTP’ye göre öncelikli)', async () => {
    const calls: any[] = [];
    const fake = (async (url: string, init: any) => { calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 }); }) as any;
    const send = createTransport({ resendApiKey: 're_test', smtpUrl: 'smtps://u:p@smtp.example.com:465', mailFrom: 'QuitVow <no-reply@quitvow.com.tr>' }, fake)!;
    await send(mail);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init.headers.Authorization).toBe('Bearer re_test');
    const sent = JSON.parse(calls[0].init.body);
    expect(sent).toMatchObject({ from: 'QuitVow <no-reply@quitvow.com.tr>', to: ['ana@test.io'], subject: 'Konu', text: 'Metin' });
    expect(sent.html).toContain('Metin'); // metin sürümü değişmez, HTML aynı içeriği markalı gösterir
  });

  it('Resend hata dönerse gönderim başarısız sayılır', async () => {
    const fake = (async () => new Response('domain not verified', { status: 403 })) as any;
    const send = createTransport({ resendApiKey: 're_test', smtpUrl: undefined, mailFrom: 'x@y.z' }, fake)!;
    await expect(send(mail)).rejects.toThrow('Resend 403: domain not verified');
  });

  it('hiçbir yol yoksa gönderim kapalıdır', () => {
    expect(createTransport({ resendApiKey: undefined, smtpUrl: undefined, mailFrom: 'x@y.z' })).toBeNull();
  });
});

import { renderMailHtml } from '../src/mailHtml.js';

describe('renderMailHtml', () => {
  it('giriş kodunu büyük kutuda gösterir', () => {
    const h = renderMailHtml({ kind: 'login_code', subject: 'QuitVow giriş kodun', body: 'Giriş kodun: 123456\nKod 10 dakika geçerli.' });
    expect(h).toContain('123 456');
    expect(h).toContain('Kod 10 dakika geçerli.');
    expect(h).toContain('Quit<span');
  });
  it('Bahçe paletini kullanır: kâğıt zemin, krem kart, ada çayı bant, sage kod kutusu, kil bağlantı', () => {
    const h = renderMailHtml({ kind: 'invite', subject: 'Davet', body: 'Merhaba,\n\nİndir: https://play.google.com/store/apps/details?id=com.quitvow.app\n\n    ABCDE-12345' });
    expect(h).toContain('background:#F4ECDB'); // dış zemin
    expect(h).toContain('background:#FBF6EA'); // kart
    expect(h).toContain('background:#3B6748'); // başlık bandı
    expect(h).toMatch(/color:#FBF6EA">Quit<span style="color:#EDC3A8">Vow<\/span>/); // iki tonlu wordmark: krem + kil yıkama
    expect(h).toContain('background:#CBD9BE'); // kod kutusu
    expect(h).toMatch(/background:#CBD9BE[^"]*color:#24352A/); // kod yazısı
    expect(h).toContain('color:#A24622;text-decoration:underline'); // bağlantı
    expect(h).toContain('color:#4B5B4B'); // alt bilgi
    expect(h).toContain('color:#24352A'); // metin
  });
  it('e-posta güvenli yazı tipleri: başlıkta Georgia, gövdede Arial; web yazı tipi ve eski koyu/kırmızı renkler yok', () => {
    const h = renderMailHtml({ kind: 'support', subject: 'Konu', body: 'Metin' });
    expect(h).toContain('font-family:Georgia');
    expect(h).toContain('font-family:Arial');
    expect(h).not.toMatch(/Fraunces|Nunito|Caveat|@font-face|fonts\.googleapis/i);
    expect(h).not.toMatch(/#0a0a0c|#ff4b3e|#d4351c|#efece7/i);
  });
  it('davet mailinde maddeleri liste, kodu kutu ve bağlantıyı link yapar', () => {
    const body = 'Merhaba Ayşe,\n\nŞahit olmak şu demek:\n• Bilgilendirilirsin.\n• Ücret ödemezsin.\n\nNasıl kabul edersin?\n1) Uygulamayı indir: https://play.google.com/store/apps/details?id=com.quitvow.app\n2) Davet kodunu yaz:\n\n    ABCDE-12345\n\nKod kişiye özeldir.';
    const h = renderMailHtml({ kind: 'invite', subject: 'Davet', body });
    expect(h).toContain('<li style="margin:0 0 6px">Bilgilendirilirsin.</li>');
    expect(h).toContain('ABCDE-12345</div>');
    expect(h).toContain('<a href="https://play.google.com/store/apps/details?id=com.quitvow.app"');
  });
  it('kullanıcı metnini kaçırır (HTML enjekte edilemez)', () => {
    const h = renderMailHtml({ kind: 'support', subject: 'Destek', body: 'Ali: "<script>alert(1)</script>"' });
    expect(h).not.toContain('<script>');
    expect(h).toContain('&lt;script&gt;');
  });
});

import { T } from '../src/mail.js';
import { config } from '../src/config.js';

describe('mail metinleri: indirim ve puan/kutlama vaadi yok', () => {
  it('varsayılan ayar indirimi kapatır (Play tarafında karşılığı yok)', () => {
    expect(config.completionDiscountPct).toBe(0);
  });
  it('packCompleted: indirim cümlesi yalnızca discountPct > 0 ise çıkar (TR/EN)', () => {
    for (const l of ['tr', 'en']) {
      expect(T(l).packCompleted('Deniz', 30, null, 0).body).not.toMatch(/indirim|%|off your next/i);
      expect(T(l).packCompleted('Deniz', 30, 12, 0).body).not.toMatch(/indirim|%|off your next/i);
    }
    expect(T('tr').packCompleted('Deniz', 30, null, 40).body).toContain('%40 indirim');
    expect(T('en').packCompleted('Deniz', 30, null, 40).body).toContain('40% off your next pack');
  });
  it('pactActive Bahçe diliyle: hücre yok, yaprak var (TR/EN)', () => {
    expect(T('tr').pactActive('Deniz').body).toContain('Her gün bir yaprak');
    expect(T('tr').pactActive('Deniz').body).not.toMatch(/hücre/i);
    expect(T('en').pactActive('Deniz').body).toContain('One leaf a day');
    expect(T('en').pactActive('Deniz').body).not.toMatch(/\bcell\b/i);
  });
  it('tamamlama maillerinin konusunda kutlama emojisi yok; hiçbir mailde puan/ceza vaadi yok (TR/EN)', () => {
    for (const l of ['tr', 'en']) {
      const t = T(l);
      const all = [
        t.code('123456'), t.invite('Ali', 'Ece', 'Spor bahisi', 'ABCDE12345', 'https://x.test'), t.invite('Ali', 'Ece', null, 'ABCDE12345', 'https://x.test'),
        t.pactActive('Ali'), t.relapse('Ali', true), t.relapse('Ali', false, true), t.crisis('Ali'), t.unlockRequested('Ali', 'https://x.test'), t.unlockProgress('Ece', 1),
        t.support('Ece', 'Yanındayım'), t.inviteStatus('Ece', true), t.inviteStatus('Ece', false), t.shieldOff('Ali'), t.heartbeatMissed('Ali'), t.closed('Ali'),
        t.completed('Ali', 30, null), t.completed('Ali', 30, 12), t.packCompleted('Ali', 30, null, 0), t.packCompleted('Ali', 30, 12, 0), t.weekly('Ali', 5),
      ];
      for (const m of all) {
        expect(m.subject + m.body).not.toMatch(/🎉|confetti|konfeti|\bpuan\b|\bpoints\b|\bceza\b|penalt|punish/i);
      }
    }
  });
});
