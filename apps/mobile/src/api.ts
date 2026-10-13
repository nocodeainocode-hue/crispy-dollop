import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dict, currentLang } from './i18n';

// Android emülatöründe host makine 10.0.2.2'dir. Gerçek telefonda .env içine EXPO_PUBLIC_API_URL=http://<bilgisayar-LAN-IP>:4000 yaz.
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export class ApiError extends Error { constructor(public status: number, m: string) { super(m); } }

// Token: native'de SecureStore, web'de (SecureStore yok) AsyncStorage
const makeTokenStore = (key: string) => ({
  get: async () => (Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)).catch(() => null),
  set: async (t: string) => { await (Platform.OS === 'web' ? AsyncStorage.setItem(key, t) : SecureStore.setItemAsync(key, t)); },
  del: async () => { await (Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key)).catch(() => {}); },
});
export const tokenStore = makeTokenStore('lockin.token');          // kullanıcı oturumu
export const guardianTokens = makeTokenStore('lockin.gtoken');     // vasi oturumu

export async function api<T = any>(path: string, opts: { method?: string; token?: string | null; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: { 'Accept-Language': currentLang(), ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, dict().net.unreachable);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? dict().net.http(res.status));
  return data as T;
}
