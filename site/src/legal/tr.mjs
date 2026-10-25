// Türkçe yasal metinler. Sunucu kodundaki gerçek veri akışına göre yazıldı; kod değişirse burası da güncellenmeli.
export default (co) => ({
  back: '← Ana sayfa',
  updatedLabel: 'Son güncelleme',
  privacy: {
    path: 'gizlilik',
    title: 'Gizlilik Politikası ve KVKK Aydınlatma Metni',
    body: `
<p>Bu metin, QuitVow mobil uygulamasını ve quitvow.com.tr sitesini kullanırken kişisel verilerinin nasıl işlendiğini, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında açıklar. Kısaca: <b>Banka ya da hesap bilgini istemeyiz, reklam ve analiz aracı kullanmayız, "neden" notun, mektubun, günlüğün ve imza videon yalnızca telefonunda kalır.</b></p>

<h2>1. Veri sorumlusu</h2>
<p>${co.legalName} (Amerika Birleşik Devletleri, New Mexico'da kurulu şirket)<br>${co.address}<br>E-posta: <a href="mailto:${co.email}">${co.email}</a></p>
<p>Türkiye'de yaşayan kullanıcıların verileri için 6698 sayılı KVKK kapsamındaki yükümlülüklerimize uyarız.</p>

<h2>2. Yalnızca telefonunda kalan veriler</h2>
<p>Aşağıdakiler sunucumuza hiç gönderilmez; yalnızca cihazında saklanır ve uygulamayı silince ya da hesabını silince cihazdan da silinir:</p>
<ul>
<li>"Neden bırakıyorum" notun ve gelecekteki sana mektubun,</li>
<li>imza videon (yalnızca sen istersen, cihazının paylaşım menüsüyle kendin paylaşırsın),</li>
<li>günlük kayıtların (dürtü notları, tetikler, o gün sana kimin yardım ettiği), seçtiğin tetikleyici saatler ve görünüm/dil tercihlerin.</li>
</ul>
<p><b>Bahis engeli (Android, isteğe bağlı):</b> Engeli açarsan uygulama, Android'in VPN altyapısını kullanarak telefonunun içinde bir adres filtresi çalıştırır. İnternet trafiğin hiçbir sunucuya yönlendirilmez. Girmeye çalıştığın adresler yalnızca telefonunda, kumar listesiyle karşılaştırılır; bu adresler kaydedilmez ve bize gönderilmez. Engellenmeyen adres sorguları telefonunun kendi DNS sunucusuna iletilir. Telefonunda yalnızca "bugün kaç site engellendi" sayısı tutulur. Engel listesi ve kuralları sunucumuzdan indirilir.</p>

<h2>3. Sunucumuzda işlenen veriler</h2>
<ul>
<li><b>Hesap:</b> e-posta adresin, adın (isteğe bağlı), dil tercihin. Giriş, e-postana gönderilen 6 haneli kodla yapılır; şifre tutmayız.</li>
<li><b>Pakt bilgileri:</b> bıraktığın alışkanlığın türü (örn. "spor bahisi"), paket süresi, başlangıç ve temiz gün tarihleri, şahitsiz başlama ve "ne bıraktığımı şahitlerime gösterme" tercihlerin.</li>
<li><b>Kullanım olayları:</b> günlük kontrolün yapıldığı an ve isteğe bağlı dürtü puanın (0–10), kriz butonuna basılma anı, kendi bildirdiğin tekrar oynama tarihleri, erken çıkış talepleri ve şahit onayları, uygulamanın açık olduğunu gösteren son sinyal zamanı, cihaz platformu (Android/iOS) ve (açtıysan) bahis engelinin açık mı kapalı mı olduğu.</li>
<li><b>Şahitlerin bilgileri:</b> eklediğin şahitlerin adı ve e-posta adresi, davetin durumu.</li>
<li><b>Gönderilen e-postaların kaydı:</b> sana ve şahitlerine giden e-postaların alıcısı, konusu ve metni (destek ve hataları izlemek için).</li>
<li><b>Satın almalar</b> (paket satışı açıldığında): satın alınan paket ve Google Play sipariş/doğrulama bilgisi. Kart bilgin Google'da kalır, bize gelmez.</li>
<li><b>Teknik kayıtlar:</b> isteklerin kötüye kullanımını önlemek için IP adresin kısa süreli olarak bellekte tutulur; barındırma sağlayıcımız standart erişim kayıtları tutabilir.</li>
</ul>
<p>Bıraktığın alışkanlık türü ve dürtü puanların sağlığınla ilgili özel nitelikli kişisel veri sayılabilir. Bu verileri, kurulumun son adımında verdiğin <b>açık rızaya</b> dayanarak işleriz. Rızanı istediğin an hesabını silerek geri alabilirsin.</p>

<h2>4. Amaçlar ve hukuki sebepler</h2>
<ul>
<li>Hesabını açmak, pakt takvimini ve iki anahtarlı çıkışı çalıştırmak (KVKK m.5/2-c: sözleşmenin kurulması ve ifası),</li>
<li>seçtiğin şahitlere davet, tekrar oynama, çıkış talebi, uzun süre sinyal gelmemesi, bahis engelinin kapatılması ve (seçersen) haftalık iyi haber e-postaları göndermek (açık rıza ve sözleşmenin ifası),</li>
<li>sağlıkla ilişkilendirilebilecek veriler için: açık rıza (KVKK m.6),</li>
<li>güvenlik, kötüye kullanımın önlenmesi ve yasal yükümlülükler (KVKK m.5/2-ç, f).</li>
</ul>
<p>Verilerini reklam, profilleme ya da satış amacıyla kullanmayız ve üçüncü kişilere satmayız.</p>

<h2>5. Şahitler hakkında</h2>
<p>Bir şahidi eklemeden önce o kişinin bilgisini ve onayını almak senin sorumluluğundadır. Şahidine giden ilk e-postada kim tarafından neden davet edildiği yazar; daveti kabul etmeyebilir ya da reddedebilir. Reddeden ya da kaldırılan şahide bir daha bildirim gitmez. Şahitler bu metindeki haklarını aynı şekilde kullanabilir.</p>

<h2>6. Verilerin aktarıldığı hizmet sağlayıcılar</h2>
<p>Hizmeti çalıştırmak için aşağıdaki veri işleyenlerle çalışırız. Bazıları yurt dışındadır; yurt dışına aktarım KVKK m.9 kapsamında, kurulumda verdiğin açık rızaya dayanır.</p>
<ul>
<li><b>Supabase Inc.</b> (ABD) — veritabanı; veriler AB'de, Frankfurt'taki (Almanya) sunucularda tutulur.</li>
<li><b>Railway Corp.</b> (ABD) — uygulama sunucusunun barındırılması.</li>
<li><b>Resend</b> (ABD) — e-postaların gönderimi.</li>
<li><b>Google LLC</b> — uygulamanın dağıtımı ve (açıldığında) Google Play üzerinden ödeme.</li>
<li><b>Netlify Inc.</b> (ABD) — bu web sitesinin barındırılması.</li>
</ul>
<p>Yasal bir zorunluluk olmadıkça verilerini başka kimseyle paylaşmayız.</p>

<h2>7. Saklama süreleri</h2>
<ul>
<li>Hesap, pakt, şahit ve kullanım olayı kayıtları: hesabını silene kadar. Hesabını sildiğinde bunlar hemen ve kalıcı olarak silinir.</li>
<li>Sana giden e-postaların kaydı: hesabını sildiğinde hemen; aksi halde 90 gün sonra otomatik olarak.</li>
<li>Şahitlerine giden e-postaların kaydı: 90 gün sonra otomatik olarak.</li>
<li>Giriş kodları: 10 dakika geçerlidir, süresi dolunca silinir.</li>
<li>Satın alma kayıtları: yasal saklama yükümlülüğü süresince (paket satışı açıldığında).</li>
</ul>

<h2>8. Hesabını ve verilerini silme</h2>
<p>Uygulamada <b>Profil → Hesabımı ve verilerimi sil</b> adımıyla hesabını ve sunucudaki tüm verilerini anında silebilirsin; telefonundaki veriler de silinir. Aktif bir paktın varsa şahitlerine paktın kapandığı bildirilir. Uygulamaya erişemiyorsan, hesabına bağlı e-posta adresinden <a href="mailto:${co.email}">${co.email}</a> adresine "hesabımı sil" yazman yeterlidir; talebini en geç 30 gün içinde yerine getiririz.</p>

<h2>9. Güvenlik</h2>
<p>Tüm bağlantılar şifrelidir (HTTPS/TLS). Veritabanına yalnızca sunucumuz erişir; davet kodları ve giriş kodları yalnızca özetlenmiş (hash) olarak saklanır. Yönetim paneli, imza videolarını, "neden" notlarını ve mektupları göremez; bunlar zaten sunucuda yoktur.</p>

<h2>10. Haklarına (KVKK m.11)</h2>
<p>Verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini ya da silinmesini isteme, aktarıldığı kişileri öğrenme, itiraz etme ve zararının giderilmesini isteme haklarına sahipsin. Başvurunu <a href="mailto:${co.email}">${co.email}</a> adresine iletebilirsin; en geç 30 gün içinde yanıtlarız. Yanıtımızdan memnun kalmazsan Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsin.</p>

<h2>11. Yaş sınırı</h2>
<p>QuitVow kumar alışkanlığıyla ilgilidir ve 18 yaşından küçüklere yönelik değildir. 18 yaşından küçük olduğunu öğrendiğimiz hesapları sileriz.</p>

<h2>12. Değişiklikler</h2>
<p>Bu metni güncelleyebiliriz. Önemli bir değişiklikte uygulama içinde ya da e-postayla haber veririz. Güncel metin her zaman bu adreste yer alır.</p>
`,
  },
  terms: {
    path: 'kosullar',
    title: 'Kullanım Koşulları',
    body: `
<p>QuitVow'u indirerek ya da kullanarak bu koşulları kabul etmiş olursun. Hizmeti ${co.legalName} ("biz") sunar.</p>

<h2>1. QuitVow nedir, ne değildir</h2>
<p>QuitVow, kumar ve bahis alışkanlığını bırakmak isteyenler için bir taahhüt ve takip aracıdır: sözleşme, şahitler, kriz modu ve günlük takip sunar. <b>QuitVow bir tedavi, tıbbi cihaz ya da psikolojik danışmanlık hizmeti değildir ve başarı garantisi vermez.</b> Kumar bağımlılığında profesyonel destek almanı öneririz. Kendine ya da başkasına zarar verme düşüncen varsa hemen <b>112</b>'yi ara. Türkiye'de ücretsiz destek için: ALO 182, Yeşilay Danışmanlık Merkezi 115.</p>

<h2>2. Kimler kullanabilir</h2>
<p>QuitVow'u kullanmak için 18 yaşını doldurmuş olmalısın. Hesabın kişiseldir; giriş kodlarını kimseyle paylaşma.</p>

<h2>3. Şahitler</h2>
<p>Şahit olarak yalnızca, bilgisi ve onayı olan kişileri ekleyebilirsin. Başkası adına hesap açmak, birini habersiz izlemek ya da şahit e-postalarını rahatsız etmek için kullanmak yasaktır. Şahitler daveti reddedebilir ya da istedikleri an çekilebilir.</p>

<h2>4. Kurallar önceden bellidir</h2>
<p>Paktı kurarken seçtiğin kurallar (iki anahtarlı çıkış, bekleme süreleri, tekrar oynamada şahitlere bildirim) pakt boyunca geçerlidir. Bu kurallar seni dürtü anında korumak için vardır; erken çıkış talebi bekleme süresi ve şahit onayıyla, şahitsiz paktta ise 7 günlük bekleme süresiyle sonuçlanır. Hesabını silme hakkın her zaman saklıdır.</p>

<h2>5. Paketler ve ödeme</h2>
<p>İlk 7 günlük deneme ücretsizdir ve hesap başına bir kez kullanılabilir. 30, 60 ve 90 günlük paketler satışa açıldığında yalnızca Google Play üzerinden satılır; fiyatlar mağazada gösterilir. Paketler abonelik değildir, otomatik yenilenmez. İade talepleri Google Play'in iade politikasına tabidir. QuitVow gerçek parayla işlem yapmaz: emanet para almaz, ceza kesmez, iade ya da ödül olarak para dağıtmaz.</p>

<h2>6. Yasak kullanımlar</h2>
<p>Hizmeti hukuka aykırı amaçlarla, başkalarını taciz etmek, sistemin güvenliğini aşmaya çalışmak ya da otomatik araçlarla aşırı yük oluşturmak için kullanamazsın. Bu durumda hesabını askıya alabilir ya da silebiliriz.</p>

<h2>7. Hizmetin sürekliliği</h2>
<p>Hizmeti kesintisiz sunmak için çalışırız, ancak bakım, arıza ya da üçüncü taraf sağlayıcılardan kaynaklı kesintiler olabilir. E-postaların şahitlerine ulaşmasını garanti edemeyiz (örn. spam klasörü). Özellikleri değiştirebilir ya da hizmeti makul bir süre önceden haber vererek sonlandırabiliriz.</p>

<h2>8. Sorumluluğun sınırı</h2>
<p>Hizmet "olduğu gibi" sunulur. Kumar kayıpları dahil, hizmetin kullanımından ya da kullanılamamasından doğan dolaylı zararlardan, kanunun izin verdiği ölçüde sorumlu değiliz. Bu, kanunen sınırlandırılamayan sorumluluklarımızı ve tüketici olarak sahip olduğun hakları etkilemez.</p>

<h2>9. Kişisel veriler</h2>
<p>Verilerinin nasıl işlendiği <a href="../gizlilik/">Gizlilik Politikası</a>'nda anlatılır.</p>

<h2>10. Uygulanacak hukuk</h2>
<p>Bu koşullar ABD New Mexico eyaleti hukukuna tabidir. Bu seçim, yaşadığın ülkenin tüketiciyi koruyan zorunlu kurallarını ortadan kaldırmaz: Türkiye'de yaşıyorsan 6502 sayılı Tüketicinin Korunması Hakkında Kanun'dan doğan hakların ve tüketici hakem heyetleri ile tüketici mahkemelerine başvurma hakkın saklıdır.</p>

<h2>11. İletişim</h2>
<p><a href="mailto:${co.email}">${co.email}</a> · ${co.legalName}, ${co.address}</p>
`,
  },
});
