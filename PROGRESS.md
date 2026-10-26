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

## Sürüyor
- Kullanıcı isteği: indie oyunlar. Sıra: /balik, /boss, /kule, /zindan yükseltmesi hepsi tamam. Sonraki fikirler (başlanmadı): evcil hayvan, günlük/haftalık görev, zanaat, klan savaşı.

## Bekliyor
