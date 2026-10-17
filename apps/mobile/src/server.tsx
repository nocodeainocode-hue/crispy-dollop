import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api, tokenStore, ApiError } from './api';
import { saveVowLocally, deleteVowLocally } from './vowStore';
import { useApp, localDay, type Guardian } from './store';
import { currentLang, type Lang } from './i18n';

type NewGuardian = { name: string; email: string; phone?: string };
type PactInput = { habitLabel: string; goalDays: number; guardians: NewGuardian[]; hideHabit?: boolean };

type SrvCtx = {
  token: string | null;
  authReady: boolean;
  requestCode: (email: string, name: string) => Promise<void>;
  verify: (email: string, code: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  createPact: (p: PactInput) => Promise<void>;
  saveVow: (uri: string, seconds: number, mime: string) => Promise<void>;
  sync: () => Promise<void>;
  checkin: (urge?: number) => Promise<void>;
  relapse: (self: boolean, note: string) => Promise<void>;
  crisis: () => Promise<{ notified: number }>;
  updateName: (name: string) => Promise<void>;
  setLocale: (l: Lang) => Promise<void>;
  setHideHabit: (hide: boolean) => Promise<void>;
  setWeeklyDigest: (on: boolean) => Promise<void>;
  me: () => Promise<{ email: string; name: string; trialUsed: boolean; demoPurchases: boolean; playEnabled?: boolean; billingRef?: string; nextPackDiscount?: number }>;
  playPurchase: (productId: string, purchaseToken: string) => Promise<void>;
  upgrade: (goalDays: number) => Promise<void>;
  report: () => Promise<any>;
  requestUnlock: () => Promise<void>;
  cancelUnlock: () => Promise<void>;
  completeUnlock: () => Promise<void>;
  resendInvite: (guardianId: string) => Promise<void>;
  addGuardian: (g: NewGuardian) => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const S = createContext<SrvCtx>(null as any);
export const useServer = () => useContext(S);

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const setToken = (t: string | null) => { tokenRef.current = t; setTokenState(t); };

  useEffect(() => { tokenStore.get().then(t => { setToken(t); setAuthReady(true); }); }, []);

  const call = useCallback(async <T,>(path: string, body?: unknown, method?: string) => {
    try { return await api<T>(path, { token: tokenRef.current, body, method }); }
    catch (e) { if (e instanceof ApiError && e.status === 401 && tokenRef.current) { await tokenStore.del(); setToken(null); } throw e; }
  }, []);

  /** Sunucudaki pakt durumunu yerel duruma yansıtır (vasiler, çıkış talebi, başlangıç, süre). */
  const apply = useCallback((p: any | null) => {
    if (!p) { if (app.pactStatus !== 'none') app.set({ pactStatus: 'none', onboarded: false, unlock: null }); return; }
    if (app.startingNew && p.status === 'completed') return; // yeni pakt kurulurken eski tamamlanmışı yoksay
    const guardians: Guardian[] = p.guardians.map((g: any) => ({ id: g.id, name: g.name, phone: g.phone ?? '', email: g.email, status: g.status }));
    app.set({
      pactStatus: p.status, onboarded: true, startingNew: false, ...(p.status === 'active' ? { paywallDismissed: false } : {}), goalDays: p.goalDays,
      startedAt: p.startedAt ?? Date.now(), lastCheckIn: Math.max(app.lastCheckIn, p.lastCheckIn ?? 0), guardians, unlock: p.unlock, hideHabit: !!p.hideHabit,
      streakStartedAt: p.streakStartedAt ?? p.startedAt ?? Date.now(), relapses: p.relapses ?? [], weeklyDigest: !!p.weeklyDigest,
    });
  }, [app.pactStatus, app.set]);

  const sync = useCallback(async () => { if (!tokenRef.current) return; apply(await call('/pacts/current')); }, [call, apply]);

  // Açılışta, ön plana dönüşte ve 30 sn'de bir senkron; aktif paktta 15 dk'da bir cihaz sinyali
  useEffect(() => {
    if (!token) return;
    const tick = () => sync().catch(() => {});
    tick();
    const t = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') tick(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [token]);
  useEffect(() => {
    if (!token || app.pactStatus !== 'active') return;
    // shield: Android engel modülü (VPN/DNS) bağlanınca 'on'/'off' olarak güncellenecek; şimdilik 'unknown'
    const beat = () => call('/pacts/current/heartbeat', { platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web', shield: 'unknown' }).catch(() => {});
    beat();
    const t = setInterval(beat, 15 * 60_000);
    return () => clearInterval(t);
  }, [token, app.pactStatus]);

  const value: SrvCtx = {
    token, authReady,
    requestCode: async (email, name) => { await api('/auth/request-code', { body: { email, name, locale: currentLang() } }); },
    verify: async (email, code, name) => {
      const r = await api<{ token: string; user: { email: string; name: string } }>('/auth/verify', { body: { email, code, name, locale: currentLang() } });
      await tokenStore.set(r.token); setToken(r.token); app.set({ email: r.user.email, name: app.name || r.user.name });
    },
    logout: async () => { await tokenStore.del(); setToken(null); },
    createPact: async p => { apply(await call('/pacts', p)); },
    // İmza videosu yalnızca telefonda: kalıcı klasöre kopyalanır, sunucuya gönderilmez
    saveVow: async (uri, seconds, mime) => { const vowUri = await saveVowLocally(uri, mime, app.vowUri); app.set({ vowUri, vowSeconds: seconds }); },
    sync,
    checkin: async urge => { await call('/pacts/current/checkin', { urge, day: localDay() }); },
    relapse: async (self, note) => { const p = await call('/pacts/current/relapse', { self, note }); apply(p); },
    crisis: () => call<{ notified: number }>('/pacts/current/crisis', {}), // çağıran taraf hatayı gösterir; kriz ekranı asla beklemez
    updateName: async name => { await call('/me', { name }, 'PATCH'); app.set({ name }); },
    setWeeklyDigest: async weeklyDigest => { apply(await call('/pacts/current', { weeklyDigest }, 'PATCH')); },
    setHideHabit: async hideHabit => { apply(await call('/pacts/current', { hideHabit }, 'PATCH')); },
    setLocale: async locale => { if (tokenRef.current) await call('/me', { locale }, 'PATCH'); },
    me: () => call('/me'),
    playPurchase: async (productId, purchaseToken) => { await call('/purchases/play', { productId, purchaseToken }); },
    upgrade: async n => { apply(await call('/pacts/current/upgrade', { goalDays: n })); },
    report: () => call('/pacts/current/report'),
    requestUnlock: async () => { await call('/pacts/current/unlock', {}); await sync(); },
    cancelUnlock: async () => { await call('/pacts/current/unlock/cancel', {}); await sync(); },
    completeUnlock: async () => { await call('/pacts/current/unlock/complete', {}); await sync(); },
    resendInvite: async id => { await call(`/pacts/current/guardians/${id}/resend`, {}); },
    addGuardian: async g => { await call('/pacts/current/guardians', g); await sync(); },
    deleteAccount: async () => { await call('/me', undefined, 'DELETE'); deleteVowLocally(app.vowUri); await tokenStore.del(); setToken(null); app.reset(); },
  };
  return <S.Provider value={value}>{children}</S.Provider>;
}
