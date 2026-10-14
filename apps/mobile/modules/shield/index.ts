import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

/** Telefondaki kumar engeli (Android, telefon içi VPN ile DNS filtresi). Expo Go'da, web'de ve iOS'ta yoktur: null döner. */
export type ShieldStatus = {
  running: boolean;          // filtre şu an çalışıyor
  wanted: boolean;           // kullanıcı engeli açtı (kendisi kapatana kadar)
  prepared: boolean;         // sistemin VPN izni verildi
  privateDnsBypass: boolean; // Ayarlar'daki "Özel DNS" filtreyi atlatıyor
  blockedToday: number;
  listSize: number;
  rulesVersion: number;
  listVersion: string | null;
};

type Native = {
  getStatus(): ShieldStatus;
  prepare(): Promise<boolean>;
  start(): boolean;
  stop(): boolean;
  setAuth(apiUrl: string, token: string | null): void;
  refresh(): Promise<ShieldStatus>;
  check(name: string): Promise<'DOH' | 'LIST' | 'RULE' | null>;
  openVpnSettings(): void;
  addListener(event: 'onStatus', fn: (s: ShieldStatus) => void): EventSubscription;
};

export const Shield: Native | null = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('QuitVowShield') : null;

/** Sunucuya bildirilecek engel durumu: kullanıcı hiç açmadıysa "unknown" (şahitlere "kapandı" maili gitmez). */
export function shieldReport(s: ShieldStatus | null): 'on' | 'off' | 'unknown' {
  if (!s || !s.wanted) return 'unknown';
  return s.running && !s.privateDnsBypass ? 'on' : 'off';
}
