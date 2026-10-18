// Hedef arama: "kumar bağımlılığı belirtileri", "kumar bağımlılığı testi", "kumar bağımlısı mıyım", "bahis bağımlılığı testi"
export default {
  lang: 'tr',
  path: 'kumar-bagimliligi-belirtileri-test',
  title: 'Kumar Bağımlılığı Belirtileri ve Testi: Ben Bağımlı mıyım? 9 Soruda Kendini Değerlendir',
  metaTitle: 'Kumar Bağımlılığı Belirtileri ve Testi: Ben Bağımlı mıyım?',
  description: 'Kumar bağımlılığı belirtileri nelerdir? 9 soruluk kendini değerlendirme testiyle bahis ve kumar alışkanlığının hangi düzeyde olduğunu gör; sonuca göre ne yapacağını öğren.',
  published: '2026-10-18',
  updated: '2026-10-18',
  readMinutes: 6,
  intro: '"Ben bağımlı mıyım yoksa sadece çok mu oynuyorum?" sorusu, kumarı bırakmak isteyenlerin ilk sorusudur. Aşağıdaki 9 soru, kumar oynama bozukluğunun tanı ölçütlerine dayanan bir kendini değerlendirme aracıdır. Tanı koymaz; ama dürüst bir ilk bakış sunar.',
  faq: [
    { q: 'Kumar bağımlılığının belirtileri nelerdir?', a: 'Planladığından fazla oynamak, bırakmaya çalışıp başaramamak, kaybı telafi etmek için tekrar oynamak, kumarı saklamak, borçlanmak, iş, ilişki ve okulu riske atmak ve oynamadığında huzursuz olmak sık görülen belirtilerdir. Ayrıntılı liste yukarıdaki testte.' },
    { q: 'Kumar bağımlılığı testi tanı koyar mı?', a: 'Hayır. Çevrimiçi ve kendi kendine yapılan testler yalnızca bir fikir verir. Kesin tanı, bir psikiyatrist ya da klinik psikolog tarafından, bir görüşme ve değerlendirmeyle konur.' },
    { q: 'Kumar bağımlılığı bir hastalık mı?', a: 'Evet. Kumar oynama bozukluğu, uluslararası sınıflandırmalarda (DSM-5 ve ICD-11) bağımlılıklar arasında yer alan, tedavisi olan bir ruh sağlığı sorunudur. Karakter zayıflığı ya da irade eksikliği değildir.' },
    { q: 'Kumar oynuyorum ama borçlanmadım, yine de sorun mu?', a: 'Borç olmaması sorun olmadığı anlamına gelmez. Zaman, ilişki, uyku, duygusal denge ya da iş üzerindeki etki de önemli ölçütlerdir. Oynamayı kontrol etmekte zorlanıyor ya da gizliyorsan, erken önlem almak en kolay dönemdir.' },
    { q: 'Test sonucum yüksek çıktı, ne yapmalıyım?', a: 'Panik yapma; bu bir etiket değil, bir bilgi. İlk adım, bir uzmana (ALO 182, Yeşilay 115) ulaşmak ve güvendiğin bir kişiye anlatmaktır. Bahis uygulamalarını silmek, parayı kontrol altına almak ve bırakma planı yazmak da hemen başlayabileceğin adımlardır.' },
  ],
  body: `
<p>Kumarın bağımlılığa dönüşüp dönüşmediğini anlamanın yolu, oynadığın <b>süre ya da para miktarı</b> değil, kumarın hayatın üzerindeki <b>etkisi ve kontrol kaybı</b>dır. Aynı miktarı harcayan iki kişiden biri sorun yaşarken diğeri yaşamayabilir. Bu yüzden sorulara cevap vermek, rakamlardan daha anlamlıdır.</p>

<h2 id="test">9 soruda kendini değerlendir</h2>
<p>Aşağıdaki ifadelerden son <b>12 ay</b> içinde sana uyanları işaretle. Yalnızca sana kalıyor, hiçbir yere kaydedilmez.</p>

<ul class="selftest" id="selftest">
  <li><label><input type="checkbox"> Aynı heyecanı almak için giderek daha fazla para ile oynamam gerekti.</label></li>
  <li><label><input type="checkbox"> Kumarı azaltmaya ya da bırakmaya çalıştığımda huzursuz ya da sinirli oldum.</label></li>
  <li><label><input type="checkbox"> Kumarı kontrol etmeye, azaltmaya ya da bırakmaya defalarca çalıştım ama başaramadım.</label></li>
  <li><label><input type="checkbox"> Çoğu zaman kumarı düşünüyorum (geçmiş oyunları yeniden yaşamak, yeni bahis planlamak, para bulmanın yollarını düşünmek).</label></li>
  <li><label><input type="checkbox"> Kendimi kötü, kaygılı ya da çaresiz hissettiğimde sık sık kumara yöneliyorum.</label></li>
  <li><label><input type="checkbox"> Kaybettikten sonra, kaybımı geri kazanmak için ertesi gün genellikle tekrar oynuyorum.</label></li>
  <li><label><input type="checkbox"> Kumar oynadığım konusunda yakınlarıma yalan söylüyorum ya da gerçeği gizliyorum.</label></li>
  <li><label><input type="checkbox"> Kumar yüzünden önemli bir ilişkiyi, işimi, eğitimimi ya da fırsatımı riske attım ya da kaybettim.</label></li>
  <li><label><input type="checkbox"> Kumar yüzünden oluşan mali sıkıntıyı gidermek için başkalarından para istedim ya da borçlandım.</label></li>
</ul>
<div id="testresult" role="status" aria-live="polite">Henüz bir şey işaretlemedin.</div>

<script>
(function () {
  var boxes = document.querySelectorAll('#selftest input');
  var out = document.getElementById('testresult');
  function update() {
    var n = 0;
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) n++;
    var t;
    if (n === 0) t = 'Henüz bir şey işaretlemedin.';
    else if (n < 4) t = n + ' / 9: Bu sonuç bir bozukluk tanı eşiğinin altında. Yine de kumar hayatında bir yer tutuyor ve seni rahatsız ediyorsa, erken önlem almak en kolay dönemdir.';
    else if (n < 6) t = n + ' / 9: Hafif düzeyde kumar oynama bozukluğu ile uyumlu olabilir. Bir uzmanla konuşmanı, parayı ve erişimi kısıtlamanı ve güvendiğin birine anlatmanı öneririz.';
    else if (n < 8) t = n + ' / 9: Orta düzeyde kumar oynama bozukluğu ile uyumlu olabilir. Profesyonel destek (ALO 182, Yeşilay 115) almanı ve bırakma planını bir şahitle birlikte kurmanı öneririz.';
    else t = n + ' / 9: Ağır düzeyde kumar oynama bozukluğu ile uyumlu olabilir. Lütfen en kısa sürede bir uzmandan destek al ve yakınlarına durumu anlat. Yalnız olmak zorunda değilsin.';
    out.textContent = t + ' Bu bir tanı değildir.';
  }
  for (var i = 0; i < boxes.length; i++) boxes[i].addEventListener('change', update);
})();
</script>

<h2 id="sonuc">Sonuç ne anlama geliyor?</h2>
<p>Kumar oynama bozukluğu tanı ölçütlerinde son 12 ayda <b>9 maddeden en az 4'ü</b> görülüyorsa bozukluktan söz edilebilir. Genel olarak <b>4-5 madde hafif</b>, <b>6-7 madde orta</b>, <b>8-9 madde ağır</b> olarak değerlendirilir. Yukarıdaki sorular bu ölçütlerin kendi kelimelerimizle yeniden yazılmış hâlidir. Sonuç bir tanı değildir; yalnızca bir uzmanla konuşman gerekip gerekmediğine dair bir ipucu verir.</p>

<h2 id="erken-isaretler">Testte çıkmayan erken işaretler</h2>
<ul>
  <li>"Ben kontrol edebilirim" diyorsun ama her seferinde planlanandan fazla oynuyorsun.</li>
  <li>Kumar parasını "kendi parası" ve "gerçek para" diye ayırmaya başladın.</li>
  <li>Kazandığında bile bırakamıyor, kaybettiğinde de hemen geri dönüyorsun.</li>
  <li>Bahis, maç ya da oyun saatleri günün düzenini belirliyor.</li>
  <li>Kumar dışındaki aktiviteler ilgini çekmiyor.</li>
  <li>Bahis ve kumar hakkında konuşulduğunda savunmacı davranıyorsun.</li>
</ul>

<h2 id="nedenler">Kumar neden bağımlılık yapar?</h2>
<p>Kumar, beynin ödül sistemini <b>belirsiz ödül</b> ile çalıştırır: ne zaman kazanacağını bilmemek, heyecanı güçlendirir. "Ramak kala" anları ve küçük kazançlar, sistemin devam etmeni sağlamasına yol açar. Online bahis ve mobil uygulamalar, 7/24 erişim, hızlı oyun ve kolay ödeme gibi özellikleriyle bu döngüyü hızlandırır. Bu yüzden bağımlılık bir irade zayıflığı değil, <b>ödül sisteminin kapıldığı bir döngüdür.</b></p>

<h2 id="ne-yapmali">Sonuca göre ne yapmalı?</h2>
<ol>
  <li><b>Konuş:</b> Güvendiğin birine "kumar oynamaya devam ediyorum, bırakmak istiyorum" de. Sırrı paylaşmak yükü hafifletir.</li>
  <li><b>Uzmanla görüş:</b> ALO 182 ile psikolojik destek randevusu al; Yeşilay 115 hattından bağımlılık danışmanlığı iste. En iyi desteklenen yöntem bilişsel davranışçı terapidir.</li>
  <li><b>Erişimi kes:</b> Bahis uygulamalarını sil, hesapları kapat, kartları kaldır, parayı kontrol altına al.</li>
  <li><b>Tetiklerini yaz:</b> Ne zaman, nerede, hangi duyguyla oynuyorsun? Bir hafta not tut.</li>
  <li><b>Kriz planı yaz:</b> Dürtü geldiğinde ilk 20 dakikada ne yapacağını önceden belirle.</li>
</ol>

{{quitvow}}

<h2 id="yardim">Destek hatları</h2>
<ul>
  <li><b>ALO 182:</b> psikolojik destek randevusu</li>
  <li><b>Yeşilay 115:</b> bağımlılık danışmanlığı</li>
  <li><b>112:</b> kendine zarar verme düşüncesi ya da hayati tehlike varsa hemen</li>
</ul>
<p>Bu sayfadaki test bir tanı aracı değildir; yalnızca farkındalık sağlar. Tanı ve tedavi için bir uzmana başvur.</p>

{{faq}}
`,
};
