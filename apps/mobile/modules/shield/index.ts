import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

/** Telefondaki kumar engeli (Android, telefon içi VPN ile DNS filtresi). Expo Go'da, web'de ve iOS'ta yoktur: null döner. */
export type ShieldStatus = {
  running: boolean;          // filtre şu an çalışıyor
  wanted: boolean;           // kullanıcı engeli açtı (kendisi kapatana kadar)
  prepared: boolean;         // sistemin VPN izni verildi
  privateDnsBypass: boolean; // Ayarlar'daki "Özel DNS" (sabit sunucu) filtreyi atlatıyor
  alwaysOn: boolean;         // Ayarlar > VPN > "Her zaman açık" bu uygulama için açık (Android 10+)
  blockedToday: number;      // bugün durdurulan site sayısı (aynı site bir dakika içinde bir kez sayılır)
  lastBlockedAt: number;     // son engelleme zamanı (ms), 0: hiç
  listSize: number;          // indirilmiş liste boyutu; 0: liste henüz inmedi (kurallar yine çalışır)
  listUpdatedAt: number;     // listenin indirildiği zaman (ms), 0: hiç
  rulesVersion: number;
  listVersion: string | null;
};

type Native = {
  getStatus(): ShieldStatus;
  prepare(): Promise<boolean>;
  start(): boolean;
  stop(): boolean;
  setAuth(apiUrl: string, token: string | null): void;
  setLocale(lang: 'tr' | 'en'): void;
  takeOpenRequest(): string | null;
  refresh(): Promise<ShieldStatus>;
  check(name: string): Promise<'DOH' | 'LIST' | 'RULE' | null>;
  openVpnSettings(): boolean;
  addListener(event: 'onStatus', fn: (s: ShieldStatus) => void): EventSubscription;
  addListener(event: 'onOpen', fn: (e: { screen: string }) => void): EventSubscription;
};

export const Shield: Native | null = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('QuitVowShield') : null;

/** Engel fiilen koruyor mu: çalışıyor ve "Özel DNS" ile atlatılmıyor. */
export const shieldOn = (s: ShieldStatus | null | undefined): boolean => !!s && s.running && !s.privateDnsBypass;

/** Sunucuya bildirilecek engel durumu: kullanıcı hiç açmadıysa "unknown" (şahitlere "kapandı" maili gitmez). */
export function shieldReport(s: ShieldStatus | null): 'on' | 'off' | 'unknown' {
  if (!s || !s.wanted) return 'unknown';
  return shieldOn(s) ? 'on' : 'off';
}
