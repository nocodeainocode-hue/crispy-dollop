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
    expect(JSON.parse(calls[0].init.body)).toEqual({ from: 'QuitVow <no-reply@quitvow.com.tr>', to: ['ana@test.io'], subject: 'Konu', text: 'Metin' });
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
