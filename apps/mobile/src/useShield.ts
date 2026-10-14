import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Shield, type ShieldStatus } from '../modules/shield';

/** Engel durumunu canlı izler. Engel modülü yoksa (Expo Go, web, iOS) null döner. */
export function useShield(): ShieldStatus | null {
  const [s, setS] = useState<ShieldStatus | null>(() => Shield?.getStatus() ?? null);
  useEffect(() => {
    if (!Shield) return;
    const read = () => setS(Shield!.getStatus());
    const sub = Shield.addListener('onStatus', setS);
    const app = AppState.addEventListener('change', st => { if (st === 'active') read(); });
    const t = setInterval(read, 10_000); // engellenen sayısı ve "Özel DNS" durumu için
    return () => { sub.remove(); app.remove(); clearInterval(t); };
  }, []);
  return s;
}
