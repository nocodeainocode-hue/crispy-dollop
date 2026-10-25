/**
 * Düz metin mailini markalı HTML'e çevirir. Şablonlar (mail.ts) değişmez: metin sürümü aynen gider,
 * HTML yalnızca onun görünümüdür (e-posta istemcileri için tablo düzeni ve satır içi stil).
 *  - boş satırla ayrılan bloklar paragraf olur, "• " satırları liste, "1) " satırları adım olur
 *  - 4 boşlukla girintili satır (davet kodu) ve giriş kodu büyük kutuda gösterilir
 *  - bağlantılar tıklanabilir olur
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (s: string) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#d4351c;text-decoration:underline;word-break:break-all">${u}</a>`);

const P = 'margin:0 0 14px;font-size:16px;line-height:1.6;color:#1b1b1f';
const CODE = 'margin:18px 0 22px;padding:16px 12px;background:#f3f0ec;border:1px solid #e4dfd8;border-radius:12px;text-align:center;font-family:Menlo,Consolas,monospace;font-size:30px;letter-spacing:6px;font-weight:700;color:#0a0a0c';

function codeBox(code: string) { return `<div style="${CODE}">${esc(code)}</div>`; }

export function renderMailHtml(m: { subject: string; body: string; kind?: string }): string {
  const parts: string[] = [];

  // Giriş kodu mailleri: kodu öne çıkar
  const login = m.kind === 'login_code' ? /(\d{6})/.exec(m.body)?.[1] : undefined;

  for (const block of m.body.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n');
    // Girintili tek satır = kod
    if (lines.length === 1 && /^ {4,}\S/.test(lines[0])) { parts.push(codeBox(lines[0].trim())); continue; }

    const bullets = lines.every(l => /^•\s/.test(l));
    if (bullets) {
      parts.push(`<ul style="margin:0 0 16px;padding:0 0 0 20px;font-size:16px;line-height:1.6;color:#1b1b1f">${lines.map(l => `<li style="margin:0 0 6px">${link(l.replace(/^•\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    // Başlık satırı + madde işaretleri karışık bloklar (örn. "Şahit olmak şu demek:" + • satırları)
    const out: string[] = [];
    let items: string[] = [];
    const flush = () => { if (items.length) { out.push(`<ul style="margin:0 0 16px;padding:0 0 0 20px;font-size:16px;line-height:1.6;color:#1b1b1f">${items.map(i => `<li style="margin:0 0 6px">${link(i)}</li>`).join('')}</ul>`); items = []; } };
    let text: string[] = [];
    const flushText = () => { if (text.length) { out.push(`<p style="${P}">${text.map(t => link(t).replace(/^(\d\))/, '<strong>$1</strong>')).join('<br>')}</p>`); text = []; } };
    for (const l of lines) {
      if (/^•\s/.test(l)) { flushText(); items.push(l.replace(/^•\s+/, '')); }
      else if (/^\d\)\s/.test(l)) { flush(); text.push(l); }
      else if (/^ {4,}\S/.test(l)) { flush(); flushText(); out.push(codeBox(l.trim())); }
      else { flush(); text.push(l); }
    }
    flush(); flushText();
    parts.push(out.join(''));
  }

  if (login) parts.unshift(codeBox(login.replace(/(\d{3})(\d{3})/, '$1 $2')));

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(m.subject)}</title></head>
<body style="margin:0;padding:0;background:#efece7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efece7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0a0a0c;padding:20px 28px"><span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:.5px;color:#ffffff">Quit<span style="color:#ff4b3e">Vow</span></span></td></tr>
<tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#0a0a0c">${esc(m.subject)}</h1>
${parts.join('\n')}
</td></tr>
<tr><td style="padding:8px 28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7a766f;border-top:1px solid #efece7">
<p style="margin:14px 0 0">QuitVow bir tedavi değildir. Acil bir durumda 112'yi ara. · QuitVow is not a treatment; in an emergency call your local emergency number.</p>
<p style="margin:8px 0 0"><a href="https://quitvow.com.tr" style="color:#7a766f">quitvow.com.tr</a> · destek@quitvow.com.tr</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
