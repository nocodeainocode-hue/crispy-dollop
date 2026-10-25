import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BAHCE } from './theme';
import { setHapticsEnabled } from './haptics';

/** Alışkanlık paketi kimliği. Her paketin metinleri i18n sözlüğünde `habits.<id>` altında. */
export type HabitId = 'gambling';
export const HABITS: HabitId[] = ['gambling'];
export type Guardian = { id: string; name: string; phone: string; email?: string; status?: 'invited' | 'accepted' | 'declined' | 'removed'; approved?: boolean };
export type PactStatus = 'none' | 'pending' | 'active' | 'completed' | 'closed';
export type Penalty = { id: string; label: string; on: boolean };
export type Entry = { id: string; at: number; kind: 'tetik' | 'kriz' | 'nuks' | 'iyi'; mood: string; trigger: string; note: string; helper?: string }; // helper: "bugün seni ne tuttu?" cevabı
export type Unlock = { id?: string; requestedAt: number; approvals: string[]; need?: number; solo?: boolean; readyAt?: number; approved?: boolean; ready?: boolean } | null;

export type State = {
  ready: boolean;
  onboarded: boolean;
  habit: HabitId;
  habitLabel: string;
  reason: string;
  letter: string;
  monthlyLoss: number;
  gamblingTypes: string[]; // alışkanlık paketindeki tür kimlikleri (eski kayıtlarda metin olabilir)
  triggerTimes: string[];  // tetik zamanı kimlikleri
  plan: string;
  guardians: Guardian[];
  penalties: Penalty[];
  startedAt: number;
  points: number;
  entries: Entry[];
  unlock: Unlock;
  crisisUntil: number;
  lastCheckIn: number;
  checkIns: number[];
  name: string;
  goalDays: number;
  nextVerifyAt: number;
  pactStatus: PactStatus;
  email: string;
  vowSeconds: number;
  vowUri: string; // imza videosu yalnızca telefonda (belge klasörü); sunucuya yüklenmez
  role: 'none' | 'user' | 'guardian';
  paywallDismissed: boolean; // deneme/pakt bitince "şimdi değil" denildi: ücretsiz mod
  startingNew: boolean;
  lang: 'tr' | 'en' | null; // null: cihaz dili
  hideHabit: boolean; // vasiler alışkanlığı görmez, yalnızca "kişisel bir hedef"
  streakStartedAt: number; // temiz seri başlangıcı (tekrar oynayınca sıfırlanır; paket süresi startedAt'ten sabit)
  relapses: number[];      // tekrar oynama zamanları (hücrelerde işaretlenir)
  weeklyDigest: boolean;   // şahitlere haftalık iyi haber
  theme: 'dark' | 'light' | 'system'; // görünüm (varsayılan koyu: marka)
  haptics: boolean;        // dokunsal geri bildirim (varsayılan açık); haptics.ts bayrağıyla eşitlenir
  shieldSeen: boolean;     // Bahis engeli ekranı bir kez açıldı: Ana ekrandaki davet şeridi kalkar
};

const init: State = {
  ready: false, onboarded: false, habit: 'gambling', habitLabel: '', reason: '', letter: '',
  monthlyLoss: 0, gamblingTypes: [], triggerTimes: [], plan: '', guardians: [], penalties: [], startedAt: Date.now(), points: 100, entries: [],
  unlock: null, crisisUntil: 0, lastCheckIn: 0, checkIns: [], name: '', goalDays: 90, nextVerifyAt: 0, pactStatus: 'none', email: '', vowSeconds: 0, vowUri: '', role: 'none', paywallDismissed: false, startingNew: false, lang: null, hideHabit: false, streakStartedAt: Date.now(), relapses: [], weeklyDigest: false, theme: BAHCE ? 'system' : 'dark', haptics: true, shieldSeen: false,
};


/** Yerel takvim günü anahtarı (YYYY-AA-GG): günlük kontrolün "günde bir" kuralı için. */
export const localDay = (t: number = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** Eski kayıtları yeni şemaya taşır: 'kumar' → 'gambling'. */
const migrate = (s: State): State => ({ ...s, habit: HABITS.includes(s.habit) ? s.habit : 'gambling' });
export const UNLOCK_WAIT_MS = 72 * 3600 * 1000;
export const CRISIS_MS = 15 * 60 * 1000;

type Ctx = State & {
  set: (p: Partial<State>) => void;
  addEntry: (e: Omit<Entry, 'id' | 'at'>) => void;
  reset: () => void;
};
const C = createContext<Ctx>(null as any);
const KEY = 'lockin.v4'; // eski marka adı bilerek korundu: değişirse telefondaki kayıt sıfırlanır. v3: para alanlı eski şema; paket modeline geçişte sıfırlandı

export function Provider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(init);
  useEffect(() => {
    // Web'de http://localhost:8099/?reset ile kayıtlı veriyi silip onboarding'e dön
    if (typeof window !== 'undefined' && window.location?.search?.includes('reset')) {
      AsyncStorage.removeItem(KEY).finally(() => { window.location.replace(window.location.pathname); });
      return;
    }
    AsyncStorage.getItem(KEY).then(v => setS(migrate({ ...init, ...(v ? JSON.parse(v) : {}), ready: true }))).catch(() => setS(p => ({ ...p, ready: true })));
  }, []);
  useEffect(() => { setHapticsEnabled(s.haptics !== false); }, [s.haptics]); // eski kayıtta alan yoksa açık
  useEffect(() => { if (s.ready) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, [s]);
  const set = useCallback((p: Partial<State>) => setS(x => ({ ...x, ...p })), []);
  const addEntry = useCallback((e: Omit<Entry, 'id' | 'at'>) =>
    setS(x => ({ ...x, entries: [{ ...e, id: String(Date.now()), at: Date.now() }, ...x.entries] })), []);
  const reset = useCallback(() => { setS(x => ({ ...init, ready: true, lang: x.lang, theme: x.theme, haptics: x.haptics })); }, []); // dil, görünüm ve titreşim tercihi çıkışta korunur
  return <C.Provider value={{ ...s, set, addEntry, reset }}>{children}</C.Provider>;
}
export const useApp = () => useContext(C);
