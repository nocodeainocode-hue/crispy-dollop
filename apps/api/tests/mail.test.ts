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
