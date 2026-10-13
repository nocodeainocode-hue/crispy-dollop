import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * İmza videosu yalnızca telefonda kalır: sunucuya yüklenmez.
 * Kamera kaydı geçici (cache) klasördedir; kalıcı belge klasörüne kopyalanır, eski video silinir.
 * Web'de (yalnızca geliştirme) kalıcı dosya sistemi yok; tarayıcı oturumu boyunca blob adresi kullanılır.
 */
export async function saveVowLocally(uri: string, mime: string, previous?: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const ext = mime === 'video/quicktime' ? 'mov' : mime === 'video/webm' ? 'webm' : 'mp4';
  const dir = new Directory(Paths.document, 'vow');
  dir.create({ idempotent: true, intermediates: true });
  const src = new File(uri);
  const dest = new File(dir, `vow-${Date.now()}.${ext}`);
  await src.copy(dest, { overwrite: true });
  try { src.delete(); } catch {}
  if (previous) deleteVowLocally(previous);
  return dest.uri;
}

export function deleteVowLocally(uri?: string) {
  if (!uri || Platform.OS === 'web') return;
  try { const f = new File(uri); if (f.exists) f.delete(); } catch {}
}

export function vowExists(uri?: string) {
  if (!uri) return false;
  if (Platform.OS === 'web') return true;
  try { return new File(uri).exists; } catch { return false; }
}

/** Kullanıcı isterse videosunu şahitleriyle kendisi paylaşır (WhatsApp, e-posta…); uygulama kimseye göndermez. */
export async function shareVow(uri: string, title: string) {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return false;
  const mov = /\.mov$/i.test(uri);
  await Sharing.shareAsync(uri, { mimeType: mov ? 'video/quicktime' : 'video/mp4', UTI: mov ? 'com.apple.quicktime-movie' : 'public.mpeg-4', dialogTitle: title });
  return true;
}
