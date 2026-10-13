// Türkçe (kök: /). Değerlerde basit HTML (<br>, <span>) kullanılabilir.
export default {
  name: 'Türkçe',
  hint: 'Bu sayfanın Türkçesi var',
  meta: {
    title: 'QuitVow · Kumarı bırakmak için irade değil, sistem',
    description: "QuitVow; şahitler, kriz modu ve günlük takiple kumarı ve bahsi bırakmana yardım eden bir taahhüt uygulaması. Android için yakında Google Play'de.",
    ogTitle: 'QuitVow · İrade değil, sistem.',
    ogDescription: 'Şahitler, iki anahtarlı çıkış, kriz modu ve her gün dolan bir hücre. Kumarı bırakmak için bir taahhüt uygulaması.',
    ogLocale: 'tr_TR',
  },
  nav: { chip: 'Android · yakında', language: 'Dil' },
  hero: {
    kicker: 'Kumarı bırakma sistemi',
    title: 'İrade değil,<br>sistem.',
    lead: 'Yalnız verilen söz kriz anında kolay bozulur. QuitVow sözünü güvendiğin insanlara, önceden yazılmış kurallara ve her gün dolan bir takvime bağlar.',
    soonSmall: 'Android', soon: "Google Play'de yakında",
    note: 'İlk 7 gün ücretsiz. Gerçek parayla işlem yok, banka bağlantısı yok.',
  },
  img: {
    home: 'QuitVow ana ekranı: 90 günlük pakette 23. gün, dolan hücreler ve Krizdeyim butonu',
    crisis: 'Kriz modu: neden notu, gelecekteki sana mektup, şahitlere giden bildirim ve Sakinleş bölümü',
    guardians: 'Kurulumda şahit ekleme adımı',
    sudoku: 'Sudoku oyunu: dört zorluk seviyesi ve ipucu düğmesi',
  },
  how: {
    kicker: 'Nasıl çalışır', title: 'Dört parça.<br>Tek sistem.',
    rows: [
      { no: '01', title: 'Sözleşme', text: 'Hangi tür kumarı bıraktığını, seni neyin tetiklediğini ve neden bıraktığını yazarsın. Süreni seçip imzalarsın. İstersen sözünü 60 saniyelik bir videoyla kaydedersin.' },
      { no: '02', title: 'Şahitler', text: "Güvendiğin bir ya da iki kişi. E-postayla davet alırlar, QuitVow uygulamasına şahit olarak girerler; istersen ne bıraktığını görmezler. Hazır değilsen şahitsiz başlarsın, çıkışı 7 günlük zaman kilidi korur." },
      { no: '03', title: 'Her gün bir hücre', text: 'Ana ekranda bırakma süren hücre hücre dolar. Günlük kontrolle gününü işaretlersin; ilerleme gözünün önünde durur.' },
      { no: '04', title: 'İki anahtar', text: 'Sözleşmeden erken çıkmak için şahitlerinin onayı ve 72 saatlik bekleme gerekir. Dürtü anında tek dokunuşla vazgeçemezsin.' },
    ],
  },
  crisis: {
    kicker: 'Kriz anında', title: 'Dürtü geldiğinde<br>tek başına değilsin.',
    lead: '"Krizdeyim"e bastığında dürtünün dalga gibi yükselip söndüğünü gösteren kriz modu açılır.',
    ticks: [
      'Kendi yazdığın "neden" notun ve gelecekteki sana mektubun <span>karşına çıkar.</span>',
      'Şahitlerine e-postayla haber verilir; <span>tek dokunuşla onları arayabilirsin.</span>',
      'Sakinleş: balon patlat, sudoku, hafıza kartları, XOX, 5-4-3-2-1 egzersizi.',
      'ALO 182, Yeşilay 115 ve 112 <span>her zaman bir dokunuş uzakta.</span>',
    ],
  },
  guardians: {
    kicker: 'Şahitler', title: 'Sır olmaktan<br>çıkar.',
    lead: 'Kumar çoğu zaman gizlilik ve utanç içinde büyür. Şahitlerin seni yargılamak için değil, sırrı paylaşılır kılmak için orada.',
    ticks: [
      'Yalnızca senin önceden onayladığın şablon mesajlar gider.',
      'Şahitler kendi uygulama ekranlarından seni takip eder ve çıkış taleplerini onaylar.',
      'Kendin bildirirsen sonuçlar hafifler: <span>dürüstlük ödüllendirilir.</span>',
    ],
  },
  science: {
    kicker: 'Bilimsel arka plan', title: 'Her adımın arkasında<br>bir araştırma var.',
    cards: [
      { title: 'Kararı önceden ver', text: 'Dürtü anında karar verme gücümüz düşer. Bu yüzden kurallar sakinken yazılır; o an pazarlığa açık değildir.', src: 'Loewenstein, 1996 · precommitment' },
      { title: '"Eğer–o zaman" planları', text: 'Tetiklerini bilmek somut plan yapmayı mümkün kılar. Bu planlar yalnızca "yapacağım" demekten daha güçlü değişim sağlar.', src: 'Gollwitzer, American Psychologist, 1999' },
      { title: 'Sosyal destek', text: 'Bağımlılık tedavisinde sosyal destek, iyileşmeyle ilişkili en güçlü etkenlerden biri olarak öne çıkar.', src: 'Bağımlılık tedavi literatürü (genel bulgu)' },
      { title: 'Dürtü sörfü', text: 'Dürtü bir dalga gibi yükselip söner. Onu bastırmadan izlemeyi ve dikkatini başka yere vermeyi öğrenirsin.', src: 'Bowen &amp; Marlatt, Psychology of Addictive Behaviors, 2009' },
    ],
  },
  games: {
    kicker: 'Sakinleş', title: 'Oyna ama<br>kazanma peşine düşme.',
    lead: 'Sakinleşme oyunları dikkatini dağıtmak için var. Bilinçli olarak rastgele ödül, puan avı ya da "bir tur daha" döngüsü yok; kumar mekaniğine benzeyen hiçbir şey yok.',
    ticks: [
      'Sudoku <span>· kolaydan ekstra zora 4 seviye, ipucu</span>',
      'Balon patlat <span>· dokun, patlasın, acele yok</span>',
      "Hafıza kartları, XOX, 5-4-3-2-1, 7'şer geri sayma",
    ],
  },
  packs: {
    kicker: 'Paketler', title: 'Önce dene.<br>Sonra süreni seç.', unit: 'gün',
    plans: [
      { cls: ' free', days: '7', text: 'Ücretsiz deneme. Hesap başına bir kez.' },
      { cls: '', days: '30', text: 'İlk ayı atlat. Detaylı tetik analizi ve uzman raporu.' },
      { cls: '', days: '60', text: 'Alışkanlığın kökünü kurut. Analiz ve rapor.' },
      { cls: '', days: '90', text: 'En kalıcı yol. Analiz ve rapor.' },
    ],
    note: 'Fiyatlar yayında duyurulacak. Kriz modu, sakinleşme oyunları, şahit bildirimleri ve yardım hatları her zaman ücretsiz. Abonelik değildir, otomatik yenilenmez.',
  },
  privacy: {
    kicker: 'Gizlilik', title: 'İzlemiyoruz.<br>Para tutmuyoruz.',
    rows: [
      { no: '01', title: 'Banka bağlantısı yok', text: 'Harcamalarını izlemeyiz. "Tahmini korunan" tutar yalnızca senin girdiğin tahmine göre hesaplanır.' },
      { no: '02', title: 'Gerçek parayla işlem yok', text: 'QuitVow emanet almaz, para tutmaz, iade ya da ceza kesmez.' },
      { no: '03', title: 'Notların ve videon telefonunda kalır', text: '"Neden bırakıyorum" notun, gelecekteki sana mektubun ve imza videon sunucuya gönderilmez. Videonu istersen şahitlerinle kendin paylaşırsın.' },
      { no: '04', title: 'Tek dokunuşla silinir', text: 'Hesabını ve paktını uygulama içinden kalıcı olarak silebilirsin.' },
    ],
  },
  footer: {
    kicker: 'Ücretsiz destek hatları',
    privacy: 'Gizlilik ve KVKK', privacyHref: 'gizlilik/', terms: 'Kullanım koşulları', termsHref: 'kosullar/',
    lines: [
      { tel: '182', name: 'ALO 182', sub: 'Psikolojik destek', cls: '' },
      { tel: '115', name: 'Yeşilay · 115', sub: 'Bağımlılık danışmanlığı', cls: '' },
      { tel: '112', name: 'Acil · 112', sub: 'Hayati tehlike varsa hemen ara', cls: 'urgent' },
    ],
    disclaimer: 'QuitVow bir tedavi değildir ve başarı garantisi vermez. Kumar bozukluğunda en iyi desteklenen yöntem bilişsel davranışçı terapidir; profesyonel destek almanı öneririz.',
  },
};
