# Dil ve alışkanlık paketi altyapısı

## Nasıl çalışır

**Mobil (`apps/mobile/src/i18n/`)**
- `tr.ts`: ana sözlük. Uygulamadaki bütün metinler burada.
- `en.ts`: İngilizce. `Dict` tipini birebir uygulamak zorunda; eksik ya da fazla anahtar tip hatası verir (`npx tsc --noEmit`).
- `index.ts`:
  - `useL()` sözlüğü döndürür. Dil, kullanıcının Profil'de seçtiği dil; seçmediyse cihaz dili (Türkçe değilse İngilizce).
  - `useH()` seçili alışkanlığın paketini döndürür.
  - `money()` cihazın para birimini kullanır.
  - `useHelp()` cihaz bölgesine göre yardım hatlarını döndürür.
- Alışkanlığa özel her şey `habits.<id>` altında durur: türler, tetikler, duygular, kurulum metinleri, kriz adımları, "tekrar oynadım" ifadeleri ve sözleşme.
- Günlük kayıtları seçenekleri kimlik olarak saklar (`match`, `stressed`…). Dil değişince eski kayıtlar da yeni dilde görünür; kimliklerden önceki eski Türkçe kayıtlar olduğu gibi gösterilir.
- Yardım hatları `src/helplines.ts` içinde ülke koduna göre tutuluyor (şimdilik TR, US, GB). Listede olmayan ülkede yalnızca 112 gösterilir. **Yayından önce her numara resmi kaynaktan doğrulanmalı.**

**Sunucu (`apps/api/src/`)**
- `users.locale` (`tr`/`en`): uygulama giriş sırasında ve Profil'den dil değişince bildirir. E-postalar pakt sahibinin dilinde gider; vasiye giden e-postalar da buna dahil.
- `mail.ts`: e-posta şablonları `TR` ve `EN`; kullanım `T(o.locale).crisis(o.name)`.
- `i18n.ts`: hata mesajlarının İngilizce karşılıkları. Uygulama `Accept-Language: tr|en` gönderir. Tarayıcının "en-US,…" başlığı bilinçli olarak yok sayılır; admin paneli Türkçe kalır.
- `tests/i18n.test.ts`: koddaki her `HttpError` mesajının İngilizce karşılığı olmasını zorunlu tutar. Yeni hata mesajı eklenip çevirisi unutulursa test kırılır.

## Yeni dil eklemek (örn. Almanca)
1. `src/i18n/de.ts` dosyasını `const de: Dict = {...}` olarak `en.ts` örneğiyle yaz.
2. `src/i18n/index.ts` içinde `Lang`, `LANGS` ve `DICTS` listelerine ekle; `deviceLang()` içine `de` için kural koy.
3. Sunucuda `mail.ts` içine `DE` şablonlarını, `i18n.ts` içine çevirileri ekle; `asLocale` ve zod `locale` enum'unu genişlet.
4. `helplines.ts` içine o ülkelerin hatlarını ekle ve numaraları doğrula.
5. Mağaza metinlerini ve landing page'i çevir.

## Landing page (`site/`)
- `src/template.html` tek şablon, `src/i18n/<dil>.mjs` metinler, `src/img/<dil>/` o dildeki uygulama ekran görüntüleri.
- `node build.mjs` → `dist/`: Türkçe kökte (`/`), diğer diller kendi klasöründe (`/en/`). Yayına giden klasör `dist/`.
- Alan adı belli olunca `SITE_URL=https://alanadi.com node build.mjs` ile derle; arama motorları için hreflang ve canonical etiketleri eklenir.
- Ziyaretçiyi otomatik yönlendirmez; tarayıcı dili farklıysa üstte kapatılabilir bir öneri şeridi gösterir. Arama motorları her dili ayrı sayfa olarak görür.
- Derleme, bir dil dosyasında eksik ya da fazla anahtar varsa durur.
- **Yeni dil (örn. `de`):** `src/i18n/de.mjs` dosyasını `en.mjs` örneğiyle yaz, `src/img/de/` altına 4 ekran görüntüsünü koy (`home`, `crisis`, `guardians`, `sudoku`; 540×1080 webp), `build.mjs` içindeki `LANGS` listesine `'de'` ekle. Yardım hatlarını o ülkeler için doğrula.

## Yeni alışkanlık paketi eklemek (örn. puff/sigara)
1. `store.tsx` → `HabitId` tipine ve `HABITS` listesine `'vaping'` ekle.
2. Her dil dosyasında `habits.vaping` bloğunu `habits.gambling` ile aynı şekilde doldur. Tip sistemi eksik alanı gösterir.
3. Kurulumun ilk adımına alışkanlık seçimi ekle (şu an tek paket olduğu için seçim ekranı yok) ve `app.set({ habit })` ile kaydet.
4. Alışkanlığa özel yardım hatlarını `helplines.ts` içinde alışkanlık parametresine bağla.
5. Sunucu e-postalarında alışkanlığa özel ifadeler var: "tekrar oynadı", "bahis engeli", "Utanç, kumarın…". Bunları `habit` parametresine bağla. `pacts` tablosuna `habit` sütunu gerekir.
6. Alkol paketi tıbbi güvenlik uyarısı (ani bırakmanın riskleri, doktora yönlendirme) hazır olmadan açılmamalı.
