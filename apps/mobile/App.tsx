import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { Provider, useApp } from './src/store';
import { ServerProvider, useServer } from './src/server';
import GuardianApp from './src/screens/GuardianApp';
import Setup from './src/screens/Setup';
import Guardians, { Completed, VowScreen } from './src/screens/Pending';
import Plan from './src/screens/Plan';
import Profile from './src/screens/Profile';
import Home from './src/screens/Home';
import Verify from './src/screens/Verify';
import Crisis from './src/screens/Crisis';
import Relapse from './src/screens/Relapse';
import Exit from './src/screens/Exit';
import Journal from './src/screens/Journal';
import Calm from './src/screens/Calm';
import type { Scr } from './src/nav';
import { c, applyTheme, BAHCE, type ThemeName } from './src/theme';
import { StepTransition } from './src/components/motion';

function Root() {
  const a = useApp();
  const srv = useServer();
  const [scr, setScr] = useState<Scr>('home');
  const system = useColorScheme();
  // Kriz ekranı bilinçli olarak her temada koyu-kırmızı: dikkati toplayan an
  const inCrisis = a.role !== 'guardian' && a.onboarded && !!srv.token && (a.crisisUntil > Date.now() || scr === 'crisis');
  const theme: ThemeName = inCrisis && !BAHCE ? 'dark' : a.theme === 'system' ? (system === 'light' ? 'light' : 'dark') : a.theme;
  applyTheme(theme); // çocuklar bu render'da yeni paleti okur; aşağıdaki key içeriği yeniden kurar

  if (!a.ready || !srv.authReady) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><ActivityIndicator color={c.acc} /></View>;

  // [ekran anahtarı, içerik]: anahtar değişince StepTransition yumuşak geçiş oynatır
  let key = scr as string;
  let el: React.ReactNode;
  if (a.role === 'guardian') { key = 'guardian'; el = <GuardianApp />; }                         // Vasi modu: ayrı oturum, ayrı ekranlar
  else if (!a.onboarded || !srv.token) { key = 'setup'; el = <Setup />; }                         // Kullanıcı modu (varsayılan); sağ üstteki "VASİ" ile geçilir
  else if (a.crisisUntil > Date.now() || scr === 'crisis') { key = 'crisis'; el = <Crisis go={setScr} />; } // Kriz kilidi: süre dolana kadar başka ekrana geçilemez // Kriz her zaman en önde: paywall ya da başka bir ekran engelleyemez
  else if (a.pactStatus === 'completed' && !a.paywallDismissed) {
    // Deneme bitti: paket seçimi (paywall). Paket bittiyse: tamamlama + yeni pakt. İkisinde de "şimdi değil" -> ücretsiz mod (aşağıdaki normal ekranlar)
    const later = () => { a.set({ paywallDismissed: true }); setScr('home'); };
    if (a.goalDays <= 7) { key = 'paywall'; el = <Plan go={setScr} paywall onLater={later} />; } else { key = 'completed'; el = <Completed onLater={later} />; }
  }
  else {
    switch (scr) {
      case 'verify': el = <Verify go={setScr} />; break;
      case 'relapse': el = <Relapse go={setScr} />; break;
      case 'exit': el = <Exit go={setScr} />; break;
      case 'journal': el = <Journal go={setScr} />; break;
      case 'calm': el = <Calm onBack={() => setScr('home')} />; break;
      case 'vow': el = <VowScreen onBack={() => setScr('home')} />; break;
      case 'guardians': el = <Guardians go={setScr} />; break;
      case 'plan': el = <Plan go={setScr} />; break;
      case 'profile': el = <Profile go={setScr} />; break;
      default: key = 'home'; el = <Home go={setScr} />;
    }
  }
  // Kurulum kendi adım geçişini yönetir; çift animasyon olmasın diye sarmalama
  return (
    <View key={theme} style={{ flex: 1, backgroundColor: c.outer }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {key === 'setup' ? el : <StepTransition k={key} dir={0}>{el}</StepTransition>}
    </View>
  );
}

export default function App() {
  const [loaded, fontError] = useFonts(BAHCE
    ? { Fraunces_600SemiBold, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold, Caveat_600SemiBold }
    : { Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });
  // Açılış güvenlik ağı: yazı tipi yüklenemez ya da 3 sn içinde gelmezse sistem yazı tipiyle açılır (boş ekranda takılma olmaz).
  const [late, setLate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLate(true), 3000); return () => clearTimeout(t); }, []);
  if (!loaded && !fontError && !late) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return <SafeAreaProvider><Provider><ServerProvider><Root /></ServerProvider></Provider></SafeAreaProvider>;
}
