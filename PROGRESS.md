# PROGRESS

Hedefler: docs/PROJE_HEDEFLERI.md. Kullanıcı istemeden commit atılmaz.

## Tamam
- [x] Oyunlar/ekonomi denetimi: blackjack bahis seçeneği ve ryoDus kontrolü, diğer komutlar node --check geçti

- [x] 3a/3b. otomodServisi.js: node --check ve yasakliBul testi geçti (yanlış pozitif yok), messageCreate.js kancası bağlı

- [x] 3c. src/commands/otomod.js yazıldı, node --check geçti (komutlar otomatik yükleniyor)

- [x] 3d. AI görünürlüğü: araclar.js içinde yönetici araçları otomod_durum ve otomod_ayarla

- [x] 4. Site yardım API: siteYardimSor (kageBeyin.js), POST /api/yardim/sor (index.js), SITE_API_KEY (.env.example); node --check geçti, uç nokta testi 6'da

- [x] 5. hatirlaticiServisi.js, ready.js bağlantısı, araclar.js'te manga_oner ve hatirlatici_kur; node --check geçti

- [x] 6. Testler geçti: ekonomi korunumu (düello), RTP %92,7, otomod, hatırlatıcı limitleri, API 401/400/413/429; data/ geri yüklendi
- [x] 7. Spec güncellendi (oyunlar, otomod, site API, hatırlatıcı bölümleri)

- [x] 8. Yeni komutlar: /liderlik, /ode (30 sn bekleme, 10-5000 Ryo, korunum testi geçti), /hatirlatici kur|liste|iptal (hatirlaticiSil eklendi), yardim.js güncellendi

- [x] 9. Sağlamlık: interactionCreate.js'e komut hız sınırı (1,2 sn) ve butonOnek/buton genel düğme yönlendirmesi eklendi; node --check geçti
- [x] 10. /cekilis (baslat|bitir|liste): cekilisServisi.js, data/cekilisler.json, ready.js zamanlayıcısı, yardim.js; testi 11'de
- [x] 11. XP/seviye: seviyeServisi.js (data/seviyeler.json, 60 sn bekleme, 15-25 XP, seviye atlayınca seviye*50 Ryo), messageCreate.js kancası, /seviye bak|siralama, yardim.js; mock test geçti
- [x] 12. Ekonomi günlüğü: ekonomiLogServisi.js (data/ekonomi_log.json, 500 kayıtlık halka, 5 Ryo altı kaydedilmez), ryoEkle/ryoDus neden etiketi, /ekonomi-log (yönetici), yardim.js; mock test geçti
- [x] 13. /karsilama ayarla|goster|sifirla (hosgeldinMesaji şablonu {uye} {sunucu} {sayi}, kanal ve rol), guildMemberAdd.js bağlandı; /dojo (dojoServisi.js, jsonDepo.js, data/dojo.json, saatlik Ryo, 12 saat depo, 25 seviye) mock testi geçti; yardim.js
- [x] 14. /ticket panel (butonla özel bilet kanalı, kategori, destek rolü, kapanış logu; kullanıcı başına tek bilet); /anket zaten vardı; AI aracı `ode` (araclar.js, 10-5000 Ryo, 30 sn bekleme, etiketli ryoDus/ryoEkle, korunum testi geçti); `/hafiza unut` zaten vardı; yardim.js güncel
- [x] 15. /balik (balikServisi.js, data/balik.json): 15 sn atış bekleme, günde 80 atış, 9 tür, 10 seviyeli olta, ilk keşif bonusu, çanta satışı; test geçti (Ryo korunumu, limit, bekleme). Render canlılık sunucusu index.js'te zaten var (/ ve /health, PORT).
- [x] 16. /boss (bossServisi.js, data/boss.json): sunucu başına ortak boss, kişi başı saatte 1 saldırı, kılıç seviyesi hasarı artırır, ölünce havuz hasar payına göre bölünür (öldürene +%20), 48 saatte kaçar, ölünce seviye artar; test geçti (Ryo korunumu, bekleme, yeniden doğuş, kaçış).
- [x] 17. /kule Gölge Kulesi (kuleServisi.js, data/kule.json): günde 3 hak, her 5. kat boss, kat sonrası 3 güçlenmeden birini seç, ölünce birikmiş ödülün %50'si, Çekil ile %100; kılıç bonusu güce yansır; rekor sıralaması; test geçti (hak sınırı, gün sıfırlama, seçim kilidi, Ryo korunumu).
- [x] 18. /zindan geliştirildi. Dosyalar: src/services/zindanServisi.js (yeni, data/zindan.json), src/commands/zindan.js (değişti), src/commands/yardim.js (zindan satırı). Rütbe kilidi (D:0, C:3, B:8, A:15, S:25 zafer), 5 kalıntı (kaplan, demir, altın, gölge, şifa; en çok 5, tekrar düşmez), zafer serisi bonusu (zafer başına %5, tavan %50), günlük ilk zafer +100 Ryo, canavarın önceden gösterilen ağır hamlesi (x1,6), Shogun Kalesi'nde can %50 altında öfke (x1,25), Bambu Ormanı'nda %20 sis ıskası, ölünce seri sıfırlanır, çekilince korunur, /zindan profil|siralama. node --check ve mock test geçti (rütbe eşikleri, seri matematiği, günlük bonus, kalıntı sınırı, Ryo korunumu, sıralama); data/ geri yüklendi. Canlı Discord düğme akışı denenmedi.
- [x] 19. Başlatma denemesinde /balik, /boss, /dojo, /kule yüklenmiyordu: `ryoYaz` tema.js'te değil oyunGorsel.js'te. Dört dosyanın import'u düzeltildi, 60 komutun hepsi yükleniyor. Bu makineden Node ile discord.com:443'e bağlanılamadı (Connect Timeout; curl 200 veriyor), gerçek Discord testi kullanıcıda.
- [x] 20. Bot çevrimdışıydı: Node'un yerleşik fetch'i bağlantıyı 10 sn'de koparıyordu (ağ ~13 sn). src/ag.js (60 sn bağlantı süreli undici Agent) eklendi; index.js `rest: { agent: ajan }`, deploy-commands.js `new REST({ agent: ajan })`. `npm run deploy` 55 komut yükledi, `npm start` ile bot online (/health: online, 1 sunucu). Not: Render'da aynı anda ikinci kopya çalışıyorsa çift cevap verir.
- [x] 21. b052be8 origin/main'e push edildi (61 dosya, oyunlar + ag.js). Render otomatik deploy ediyor (/health online). Yerel bot kapatıldı, tek kopya Render'da. Render'ın b052be8'e geçtiği paneldeki commit'ten teyit edilmeli.
- [x] 22. Sunucu mimarisi yenilendi (sunucuMimarisiServisi.js): tekrar çalıştırılabilir (rol/kanal isim parçasıyla bulunur), rol hiyerarşisi sıralaması, bota Bot rolü, kanal konuları ve tanıtım mesajları, yeni kanallar (göl, boss, kule, dojo, çekiliş, seviye, ekonomi-log, bilet-log, destek paneli), ticket ayarları kaydedilir, "Lv." ekleri kaldırıldı. kageDevServisi kanal eşleşmesi isim parçasıyla, sunucuKur.js metin ve MessageFlags, zindan.js kapı hatası düzeldi. node --check geçti; canlı Discord testi yapılmadı.
- [x] 23. 112 `ephemeral: true` -> `flags: MessageFlags.Ephemeral` (44 dosya, deprecation uyarısı bitti), sunucu mimarisi kanal anahtarları düzeltildi (sessiz-göl, gölge-kulesi; "göl" gölge-veziri ile çakışıyordu), mangaServisi zaman aşımı 8 sn -> 25 sn. Tüm komutlar import testi ve node --check geçti. Oyun denge denetimi: gunluk gözden geçirildi, diğerleri madde 6/12 testlerinde kapsandı; yeni denge değişikliği yapılmadı.
- [x] 24. Oyun denetimi: blackjack krupiye animasyonu/son düzenleme hata verse bile ödeme hesaplanır (.catch), /market düğmeleri MARKET_URUNLERI'nden üretilir (4 ürün, kimlikler uyuşuyor), marketSatinAl: sahip olunan muska tekrar alınamaz, sahip olunan unvan ücretsiz kuşanılır, market süre bitince düğmeleri kaldırır. node --check ve mock test geçti (1700 Ryo kalan, tekrar alım engelli).
- [x] 25. Yapay zeka eğitimi: egitimServisi.js (data/egitim.json), /egit ekle|liste|sil (sticker, bilgi, davranış kuralı; kişisel 25, sunucu 100), /ton sakin|samimi|argo|ayna|kapali; chatBot ve Veziri yoluna bağlandı; saygı filtresi (aile/din/dil/ırk hakareti çıktıda ve /egit, /hafiza ogren girdisinde engellenir). node --check ve mock test geçti; canlı Discord testi yapılmadı.
- [x] 26. /sticker [duygu] [tur]: Kage ve Kunoichi sticker dosyalarını gösterir (assets/stickers), yardim.js güncel; node --check geçti, canlı test yok.
- [x] 27. Duygu anlama: duyguServisi.js (kural tabanlı, 17 duygu, yoğunluk 1-3, BÜYÜK HARF/ünlem desteği, olumsuz duygu eşitlikte öncelikli). egitimBaglami'na duygu notu eklendi (chatBot + Veziri Gemini yolları), kural tabanlı chatBot sticker seçimi algılanan duyguyu kullanır (öğretilen sticker önce), messageCreate belirgin duygulu mesaja emoji tepkisi bırakır (kullanıcı başına 45 sn, %60). node --check ve dedektör testi geçti; canlı test yok.
- [x] 28. Sticker gönderimi: stickerServisi.js (duygu/öğretilen kurala göre sticker seçimi, kayıtlı sunucu stickerı varsa `stickers:[id]`, yoksa dosya), /sticker-yukle (ManageGuildExpressions; sticker yuvası yoksa emoji, hatalar raporlanır), messageCreate'te Veziri, araya girme ve chatbot yedeği cevabından sonra sticker gider. 512x512 dosyalar Discord'da reddedilebilir (yeniden boyutlandırma yok). node --check geçti; canlı test yok.
- [x] 29. Sunucu bilgisi ve bilgi alışverişi: sunucuBilgiServisi.js (üyeler, yeni gelenler, kanallar, roller, emoji, sticker) hem Veziri'ye (sistem istemine canlı özet, `sunucu_ozeti` ve `sticker_gonder` araçları, "sticker atamıyorum" yasağı) hem kural tabanlı chatbot'a (sunucu durumu cevabı ayrıntılı, tetik kelimeler genişledi) bağlandı. "stickerleri at" gibi toplu istek yapay zeka kapalıyken de tüm kayıtlı stickerları gönderir. node --check ve import testi geçti; mock/canlı test yok.


- [x] 30. Çoklu Yapay Zeka Ağı (Multi-AI Mesh) & aiRouterServisi:
  - Groq entegrasyonu tamamlandı (openai/gpt-oss-120b, qwen/qwen3.8-27b modelleri ~0.4s-1.5s hız).
  - OpenRouter ücretsiz model havuzu bağlandı (openrouter/free, nemotron-3.5-lightning:free, dots-3 fallback zinciri).
  - Pollinations AI entegre edildi (/ciz görsel motoru ve sınırsız metin yedeği).
  - Gemini 2.5 Flash ile hibrit çalışan sıfır kesintili (zero-downtime) fallback mimarisi kuruldu.
- [x] 31. /ciz komutu eklendi: Pollinations AI ile manga, samuray, piksel ve anime tarzlarında ücretsiz görsel üretimi (1:1, 9:16, 16:9).
- [x] 32. /klan sistemi (klanServisi.js, data/klanlar.json): Klan kurma (2500 Ryo), hazineye bağış yapma, klan seviyesi ve sunucu klan liderlik tablosu.
- [x] 33. /yoldas sistemi (yoldasServisi.js, data/yoldaslar.json): Gölge Kurdu (+%15 kritik), Alev Tilkisi (+%20 Ryo), Mistik Kuzgun (+%15 kaçınma), Yeşim Ejderi (+%20 kalkan) evcil hayvanları ve zindan entegrasyonu.
- [x] 34. /kehanet komutu: Günlük samuray şans falı, uğurlu element ve sürpriz Ryo hediyesi.
- [x] 35. /sunucu-kur mimarisi zenginleştirildi: kage95.com canlı manga platformu, #kage95-canlı-platform, #spoiler-odası, #ai-görsel-atölyesi, #samuray-kehaneti, #klan-sancakları ve #yoldaş-barınağı kategorileriyle donatıldı.
- [x] 36. Claude Code ve harici AI asistanları için CLAUDE.md oluşturuldu; mimari, kurallar ve JagTech standartları belgelendi.
- [x] 37. Groq gpt-oss düzeltmesi (max_tokens 4096, reasoning_effort low), /gorev (günlük 3 görev, gorevServisi), /ai-durum (sağlayıcı sayaçları), package.json engines node>=20, CLAUDE.md düzeltmeleri.
- [x] 38. /sunucu-kur baştan yazıldı: aksansız/emojisiz ad anahtarıyla eşleştirme (kopya üretmez), mevcut kanal taşıma + konu + izin senkronu, tanıtım mesajı yalnız botun yazmadığı kanala, kopyalar raporlanır (kopya-sil ile silinir), önizle modu, ai-tema ile yapay zeka kural/karşılama metni, gerçek sayılı rapor, zaman aşımı temizliği. Rol izinleri komut gereksinimlerine göre bölündü (Hatamoto moderatör, Daimyo yönetim, Kage sahip) ve şogun-meclisi'ne yetki rehberi eklendi. Mock testte 2. çalıştırma 0 yeni rol/kanal/mesaj; canlı Discord testi yok. Deploy gerekli (npm run deploy).
- [x] 39. Çoklu Yapay Zeka Ağı Genişletildi, Erişim Güvenliği & /model Komutları Eklendi:
  - aiRouterServisi.js güncellendi: OpenRouter ücretsiz model havuzuna DeepSeek (deepseek-chat, deepseek-r1), Meta Llama (llama-3.3-70b), Gemma ve openrouter/free dinamik yönlendirici eklendi; DeepSeek-R1 <think> blokları otomatik temizleniyor.
  - Groq Cloud aktif modelleri bağlandı (openai/gpt-oss-120b, qwen/qwen3.8-27b, openai/gpt-oss-20b).
  - aiErisimServisi.js yazıldı: Rol tabanlı yapay zeka erişim denetimi (`/ayarlar ai-rol [rol]`, `/ayarlar ai-mod`), kötüye kullanım & anti-spam rate limiting (kullanıcı başına 8 sn metin, 15 sn görsel cooldown).
  - Canlı Admin AI İzleme Sistemi eklendi: Herhangi bir üye Kage ile konuştuğunda admin kanalına anlık izleme bildirimi gönderilir; yetkililere yanıt altında hangi motorun (`Gemini`, `Groq`, `OpenRouter`, `Pollinations`, `Kural Tabanlı ChatBot`) çalıştığı gösterilir.
  - /model komutu eklendi: /model liste (tüm aktif motorları ve durumlarını gösterir) ve /model sor (istenen spesifik modelle anlık doğrudan konuşma).
  - deploy-commands ile 66 komut Discord'a başarıyla yüklendi.
- [x] 40. Merkezi Ortak Hafıza (Unified Shared Memory), Doğal Dille Model Geçişi ve Komutsuz Eylem Yönetimi:
  - **Merkezi Ortak Hafıza:** Hangi yapay zeka modeli (Gemini, Groq, OpenRouter DeepSeek/Llama, Pollinations veya ChatBot) seçilirse seçilsin, hepsi tek bir merkezi hafıza havuzunu (`data/kage_hafiza.json` + `data/egitim.json`) kullanır. Kullanıcı hakkındaki tüm gerçekler, tercihler ve notlar tüm modellere ortak enjekte edilir.
  - **Otonom Gerçek Öğrenme:** Hangi model konuşursa konuşsun, çıktısındaki `[ÖĞRENİLDİ: ...]` etiketleri otomatik yakalanarak kalıcı hafızaya işlenir. Bir modelle paylaşılan bilgi anında diğer tüm modeller tarafından hatırlanır.
  - **Doğal Dille Model Seçimi:** Kullanıcı sohbette `kage groq'a geç`, `kage deepseek kullan`, `kage gemini'ye geç`, `kage otomatik moda geç` yazdığında veya `kage [groq]: ...` şeklinde başladığında tercihi kalıcı olarak kaydedilir ve model o anda değişir.
  - **Komutsuz Doğal Eylem Yönlendirmesi (Action Intent Routing):** Komut yazma zorunluluğu ortadan kaldırıldı. Kullanıcı "kage şu üyeyi sustur", "kage mesajları temizle", "kage kurallara şunu ekle", "kage bana ryo ver", "kage rol ver" dediğinde doğrudan Otonom Vezir (`kageyeSor`) devreye girer. Kullanıcının ve botun yetkisi varsa eylem direkt gerçekleştirilir/onay mekanizması sunulur; yetkisi yoksa Kage samuray tarzıyla yetkinin yetersiz olduğunu belirtir.
  - **/model sec [secim]:** Kullanıcıların varsayılan AI motorunu slash komutuyla da kalıcı olarak seçebilmesi sağlandı.
- [x] 41. Kullanıcı Dostu AI Yetenekleri: Multimodal Görsel Zekası, Hızlı Etkileşim Butonları, /hafizam ve /ozet Komutları:
  - **Görsel Okuma & Manga Paneli Tanıma (Multimodal Vision):** Kullanıcı sohbete resim eklediğinde (`gorselAnalizEt`), Gemini Vision devreye girer. Manga panelleri, sahneler, çizimler ve karakterler samuray bakış açısıyla incelenip Türkçe yanıtlanır.
  - **Mesaj Altı Hızlı Butonlar:** Kage'nin verdiği cevapların altına `[🔄 Farklı Modele Sor]`, `[🧠 Ne Öğrendin?]` ve `[🗑️ Sıfırla]` butonları eklendi. Kullanıcı tek tıkla aynı soruyu alternatif modele sorabilir veya hafıza notlarını ephemeral görebilir.
  - **/hafizam Komutu:** Kullanıcının Kage'nin aklında tuttuğu tüm hatıraları, takma adını, yaşını, ilgi alanlarını, favori mangalarını, elindeki katanayı ve Ryo servetini şık bir samuray parşömeni kartı olarak döker. Altında tek tıkla hafıza sıfırlama butonu bulunur.
  - **/ozet Komutu:** Kanaldaki son mesajları (10-100 adet) toplayıp bot mesajlarını ayıklayarak esprili, samimi 3-5 maddelik samuray kanal bülteni çıkarır.
  - deploy-commands ile komut sayısı 66'dan **68'e** yükseldi ve yerel sunucuya yüklendi.
- [x] 42. Kage-95 Gölge Gözü (Shadow Eye Sentinel) & Otonom Mikro-Tamponlu Sohbet İzleme Mimarisi:
  - **Sıfır Gecikmeli & Sıfır Kota Tüketimli Sezgisel Süzgeç:** Gelen tüm mesajlar 0 ms'de taranır. Sıradan mesajlar API'ye gitmez; gizli Discord davet linkleri anında tespit edilip `#gölge-odası` admin kanalına raporlanır.
  - **Mikro-Tamponlu Toplu Analiz (Batch Ingestion):** Anlamlı mesajlar arka planda 5-15'lik mikro havuzda toplanır ve 60 saniyede bir TEK BİR API çağrısıyla (Groq/Pollinations) taranır. Böylece yapay zeka yorulmaz ve dakikalık kota asla patlamaz.
  - **Kendi Kendini Eğitme (Autonomous Continuous Learning):** Chatte konuşulan kullanıcı gerçekleri (yaş, şehir, meslek, favori anime/manga) ve sunucu bilgileri otonom yakalanıp `data/kage_hafiza.json` ve `data/egitim.json` havuzuna kalıcı işlenir.
  - **/golge-goz Komutu:** `/golge-goz durum` (canlı radar, izlenen mesaj, öğrenilen gerçek, önlenen ihlal), `/golge-goz rapor` (son istihbarat ve güvenlik kayıtları) ve `/golge-goz tara` (manuel anlık tarama).
  - deploy-commands ile komut sayısı 68'den **69'a** yükseldi ve yerel sunucuya yüklendi.
- [x] 43. Kayıt, kanal entegrasyonu, manga duyurusu ve site bağlantısı onarımı (/sunucu-kur geliştirmesi):
  - /sunucu-kur artık duyuru/bot-komut kanal ID'lerini ve tüm rol ID'lerini (ronin, shinobi, manga okuru, rütbeler) ayara kaydeder; kayıt, karşılama, oto-rol ve rütbe güncelleme isim yerine bu ID'leri kullanır (isim eşleşmesi yedek).
  - /sunucu-kur sağlık raporu: bot rol sırası, manga kanalı yetkisi, WEBHOOK_SECRET, SITE_URL ve site API erişimi kontrol edilir. Kayıt paneli tekrar gönderilmez, yerinde güncellenir (Profili Yenile ve Kurallar butonları eklendi).
  - Kayıt: 150 Ryo yalnız ilk kayıtta verilir, tekrar kayıtta karşılama duyurusu atılmaz.
  - Manga duyurusu: rastgele kanala düşme kaldırıldı, Manga Okuru rolü etiketlenir, kapak için `kapakResmiURL` okunur, bölüm başlığı `bolumBaslik` de okunur.
  - Site linkleri: `/manga/{id}`, `manga.html` ve `/manga/{id}/bolum/{id}` 404 veriyordu. Tüm linkler `mangaSayfaUrl` (`/#/manga/{id}`) ve `bolumOkumaUrl` (`read.html?chapter={id}`) üzerinden üretilir.

- [x] 44. Tam Otonom Gölge Gözü, 0ms Küfür/Spam Kalkanı ve README Mimarisi Güncellemesi:
  - Anında 0ms yerel kalkan: reklam davet linkleri, ağır küfür/hakaret ve aşırı büyük harf / karakter tekrarı spamı anında yakalanıp `#gölge-odası` admin kanalına düşüyor.
  - Otonom hızlı aktarım: havuz 8 mesaja ulaştığı an 60s beklemeden anında AI analizi tetikleniyor; yavaş kanallarda ise 2 mesaj yeterli oluyor.
  - `/model sor` komutuna merkezi hafıza enjeksiyonu yapıldı; Gemini, Groq, OpenRouter, Pollinations tüm modeller kullanıcının hafızadaki profilini doğrudan tanıyor.
  - README.md güncellendi: 69 Slash komutunun tamamı kategorize edildi, Proje Mimarisi şeması ve Mermaid Gölge Gözü iş akışı diyagramı eklendi.

- [x] 45. Site manga ID değişimi ve yapay zekanın canlı site verisi (2026-10-27):
  - Site canlı: 19 manga, ID 7–25; bölümü olan tek seri Bleach (#8, bölüm id 15). Çalışan uçlar: `/api/mangas`, `/api/mangas/{id}`, `/api/duyurular`.
  - Bölüm alanları API ile eşleştirildi (`bolumNo`, `bolumAdi`, `yayinTarihi`); son bölüm taraması yalnız `bolumSayisi > 0` serilerin detayını çeker.
  - `site_veri_getir`: Discord bağlamı istemeyen `siteVeriGetir` fonksiyonuna taşındı (web yardım sohbeti artık çalışır). detay ad ile de çalışır, bölüm okuma linkleri ve manga linki döner; yeni `duyurular` işlemi.
  - Sohbet sistem metnine her mesajda canlı katalog (`canliKatalogMetni`: id, bölüm, durum, tür, link) girer. Hafıza bağlamı günlük anlık görüntü yerine bellekteki canlı listeyi kullanır.
  - Duyuru poller'ı: tek taramada 3'ten fazla yeni ID gelirse (ID taşıması) duyurmadan indeksler; `yayinda: false` seriler duyurulmaz.
- [x] 46. Yapay zeka insan gibi yazar, yetkisiz "ai" çağrısı chatbota düşer (2026-10-27):
  - `messageCreate.js`: AI, chatbot, görsel analizi ve model geçişi cevapları embed/buton paneli olmadan düz mesaj. Kısa çok satırlı cevap (≤600 karakter, ≤5 satır) ayrı ardışık mesajlara bölünür, araya yazıyor göstergesi girer. Başlık, kalın, madde işaretleri temizlenir. Motor etiketi sohbetten kalktı (admin AI log kanalı aynen gösterir). Onay butonları duruyor.
  - Yetkisi olmayan kullanıcı "ai ...", "kage ..." veya AI kanalıyla çağırırsa ret mesajı yerine `chatBotYanitla` cevap verir. Eylem niyeti, model geçişi, görsel analizi ve otonom vezir kapalı kalır.
  - `chatBotYanitla` dönüşüne `metin` eklendi. Chatbot ve `kageBeyin` sistem metinlerine "sunucudaki biri gibi kısa düz satır yaz" kuralı girdi. Sticker artık panel içinde değil, ara sıra ayrı mesaj.

## Sürüyor

- Kullanıcı isteği: indie oyunlar. Sıra: /balik, /boss, /kule, /zindan yükseltmesi hepsi tamam. Sonraki fikirler (başlanmadı): evcil hayvan, zanaat, klan savaşı.

## Bekliyor
