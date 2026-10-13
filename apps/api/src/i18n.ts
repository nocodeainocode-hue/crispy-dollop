import type express from 'express';

export type Locale = 'tr' | 'en';
/** Bilinmeyen değer Türkçeye düşer (ilk pazar). */
export const asLocale = (v: unknown): Locale => (v === 'en' ? 'en' : 'tr');
/**
 * İstek dili: mobil uygulama `Accept-Language: tr|en` gönderir. Tarayıcıların gönderdiği "en-US,en;q=0.9" gibi
 * değerler bilinçli olarak yok sayılır (Türkçe admin paneli, tarayıcı İngilizce diye İngilizceye dönmesin).
 */
export const reqLocale = (req: express.Request): Locale => asLocale(String(req.headers['accept-language'] ?? '').trim());

// Hata mesajları kodda Türkçe yazılır; İngilizce karşılıkları burada. tests/i18n.test.ts her HttpError metninin karşılığı olduğunu denetler.
export const EN_ERRORS: Record<string, string> = {
  'Aynı kişiyi iki kez ekleyemezsin': "You can't add the same person twice",
  'Kendini şahit olarak ekleyemezsin': "You can't add yourself as a witness",
  'Satın alma bu hesapla eşleşmedi': "The purchase doesn't match this account",
  'E-posta veya şifre hatalı': 'Wrong email or password',
  'Giriş gerekli': 'Sign-in required',
  'Kod geçersiz veya süresi doldu': 'The code is invalid or has expired',
  'Kod hatalı': 'Wrong code',
  'Kullanıcı yok': 'User not found',
  'Oturum geçersiz': 'Session is no longer valid',
  'Bu paket için satın alma gerekli': 'This pack requires a purchase',
  'Uzman raporu paket gerektirir': 'The specialist report requires a pack',
  'Ücretsiz deneme zaten kullanıldı; devam için 30, 60 veya 90 günlük paket gerekir': 'The free trial has already been used; a 30, 60 or 90-day pack is needed to continue',
  'Bekleme süresi dolmadı': 'The waiting period is not over yet',
  'Şahitlik geçerli değil': 'This witnesseship is no longer valid',
  'Davet bulunamadı veya iptal edildi': 'Invite not found or cancelled',
  'Pakt yok': 'No pact',
  'Şahit yok': 'Witness not found',
  'Bekleyen çıkış talebi yok': 'No pending exit request',
  'Bu daveti daha önce reddettin': 'You already declined this invite',
  'Bu kişi zaten şahit': 'This person is already a witness',
  'Bu pakt çok önce bitti; yeni bir pakt kurmalısın': 'This pact ended a long time ago; set up a new pact',
  'Bu satın alma başka bir hesaba ait': 'This purchase belongs to another account',
  'Bugünkü kontrolünü zaten yaptın': "You've already done today's check-in",
  'En fazla 3 şahit': 'At most 3 witnesses',
  'Kabul ettikten sonra şahitlikten ayrılmak için kişiyle konuş': 'Once you have accepted, talk to the person before stepping down as witness',
  'Mevcut paketinden daha uzun bir paket seçmelisin': 'Choose a pack longer than your current one',
  'Uygun bir pakt yok': 'No eligible pact',
  'Zaten aktif bir paktın var': 'You already have an active pact',
  'Zaten bekleyen bir çıkış talebi var': 'There is already a pending exit request',
  'Çıkış talebi yok': 'No exit request',
  'Çok fazla deneme. Biraz bekle.': 'Too many attempts. Please wait a moment.',
  'Google Play doğrulaması bu sunucuda yapılandırılmamış': 'Google Play verification is not configured on this server',
  'Ad veya dil gerekli': 'A name or language is required',
  'Bulunamadı': 'Not found',
  'Dosya çok büyük': 'File too large',
  'Sunucu hatası': 'Server error',
};
// Değişken içeren mesajlar
const EN_PATTERNS: [RegExp, string][] = [
  [/^Yeterli onay yok \((\d+)\/(\d+)\)$/, 'Not enough approvals ($1/$2)'],
];

export function translateError(msg: string, l: Locale): string {
  if (l === 'tr') return msg;
  if (EN_ERRORS[msg]) return EN_ERRORS[msg];
  for (const [re, en] of EN_PATTERNS) if (re.test(msg)) return msg.replace(re, en);
  return msg; // doğrulama (zod) mesajları zaten İngilizce
}
