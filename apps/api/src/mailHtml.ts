/**
 * Düz metin mailini markalı HTML'e çevirir. Şablonlar (mail.ts) değişmez: metin sürümü aynen gider,
 * HTML yalnızca onun görünümüdür (e-posta istemcileri için tablo düzeni ve satır içi stil).
 *  - boş satırla ayrılan bloklar paragraf olur, "• " satırları liste, "1) " satırları adım olur
 *  - 4 boşlukla girintili satır (davet kodu) ve giriş kodu büyük kutuda gösterilir
 *  - bağlantılar tıklanabilir olur
 * Görünüm: "Büyüyen Bahçe" paleti (kâğıt zemin, ada çayı bant, sage kod kutusu, kil bağlantı). Web yazı tipi yok:
 * e-posta güvenli yığın (başlıkta Georgia, gövdede Arial). Renkler sabit hex çünkü e-posta istemcisi tema token'ı okumaz;
 * değerler apps/mobile/src/palette.ts DAY paletiyle aynıdır.
 */
const C = {
  paper: '#F4ECDB',      // dış zemin (bg)
  card: '#FBF6EA',       // kart (surf)
  band: '#3B6748',       // başlık bandı (act, ada çayı)
  cream: '#FBF6EA',      // bant üstü yazı (onAct)
  clayWash: '#EDC3A8',   // wordmark "Vow" (clayWash)
  mustard: '#DCA83F',    // küçük vurgu çizgisi
  codeBg: '#CBD9BE',     // kod kutusu (sageWash)
  codeEdge: '#8FAA87',   // kod kutusu kenarı (sage)
  ink: '#24352A',        // metin (fg)
  link: '#A24622',       // bağlantı (kil)
  foot: '#4B5B4B',       // alt bilgi (dim)
  rule: '#E8DCC0',       // ince çizgi (cell)
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Arial,Helvetica,sans-serif';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (s: string) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:${C.link};text-decoration:underline;word-break:break-all">${u}</a>`);

const P = `margin:0 0 14px;font-size:16px;line-height:1.6;color:${C.ink}`;
const UL = `margin:0 0 16px;padding:0 0 0 20px;font-size:16px;line-height:1.6;color:${C.ink}`;
const CODE = `margin:18px 0 22px;padding:16px 12px;background:${C.codeBg};border:2px solid ${C.codeEdge};border-radius:22px 16px 24px 14px;text-align:center;font-family:Menlo,Consolas,'Courier New',monospace;font-size:30px;letter-spacing:6px;font-weight:700;color:${C.ink}`;

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
      parts.push(`<ul style="${UL}">${lines.map(l => `<li style="margin:0 0 6px">${link(l.replace(/^•\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    // Başlık satırı + madde işaretleri karışık bloklar (örn. "Şahit olmak şu demek:" + • satırları)
    const out: string[] = [];
    let items: string[] = [];
    const flush = () => { if (items.length) { out.push(`<ul style="${UL}">${items.map(i => `<li style="margin:0 0 6px">${link(i)}</li>`).join('')}</ul>`); items = []; } };
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
<body style="margin:0;padding:0;background:${C.paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border-radius:24px 30px 24px 28px;overflow:hidden">
<tr><td style="background:${C.band};padding:20px 28px;border-bottom:3px solid ${C.mustard}"><span style="font-family:${SERIF};font-size:24px;font-weight:700;letter-spacing:.3px;color:${C.cream}">Quit<span style="color:${C.clayWash}">Vow</span></span></td></tr>
<tr><td style="padding:28px 28px 8px;font-family:${SANS};color:${C.ink}">
<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:24px;line-height:1.3;font-weight:700;color:${C.ink}">${esc(m.subject)}</h1>
${parts.join('\n')}
</td></tr>
<tr><td style="padding:8px 28px 26px;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.foot};border-top:1px solid ${C.rule}">
<p style="margin:14px 0 0">QuitVow bir tedavi değildir. Acil bir durumda 112'yi ara. · QuitVow is not a treatment; in an emergency call your local emergency number.</p>
<p style="margin:8px 0 0"><a href="https://quitvow.com.tr" style="color:${C.foot}">quitvow.com.tr</a> · destek@quitvow.com.tr</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
