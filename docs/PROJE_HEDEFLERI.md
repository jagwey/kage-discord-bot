# Kage 95 Discord Botu — Proje Hedefleri ve Devir Notu

Bu dosya yeni bir sohbete geçerken bağlamı taşımak için yazıldı. Tarih: 2026-10-26.

## Genel hedef

Kage 95 botunu "Discord'un en gelişmiş botu" yapmak. Kullanıcı (Osman) uyurken tam yetki verdi: soru sorulmadan, kararlar otonom alınarak ilerlenecek. Alt ajan kullanımı serbest.

## Kurallar

- Kullanıcı istemedikçe git commit atılmaz.
- Kullanıcıyla Türkçe, kısa ve öz (caveman tarzı) konuşulur. Kalıcı yazılan her şey (kod yorumu, doküman) tam cümle ile yazılır.
- Yalnızca Gemini kullanılır (Claude API yok).
- `.env` içindeki gerçek `GEMINI_API_KEY` asla çıktıya yazılmaz.
- Teknik not: `kageEmbed` alt bilgi seçeneği `altMetin`'dir. `footer` sessizce yok sayılır.

## Önceden tamamlananlar

Birleşik AI beyni ve hafıza, ajan döngüsü (güvenlik butonları ve denetim kaydı), Hafıza 2.0 (profiller), site XP'sinin Ryo'ya çevrilmesi, `/hafiza profil` ve `/hafiza unut`, zindan bekleme süresi ve ödül dengesi, düello çift tahsilat hatası, sohbet Ryo farm açığı, `footer` → `altMetin` düzeltmesi.

## Devam eden iş: oyunları yenileme (adım 2)

Hedef: blackjack, düello, yazı-tura ve slot için çok daha iyi arayüz, deneyim ve grafik.

Yapıldı: `slot.js` (RTP ≈ %92.8 hedefli yeni ödeme tablosu), `yazitura.js`, `duello.js` (sıra tabanlı dövüş), `src/config/oyunGorsel.js` yardımcıları. Üçü de henüz `node --check` ile doğrulanmadı.

`src/commands/blackjack.js` yarım kaldı. Kalan üç düzenleme:

1. Satır 14–20: seçenek açıklamasını `` `Ortaya koymak istediğiniz Ryo miktarı (10 - ${MAKS_BAHIS})` `` yap ve `.setMinValue(10)` sonrasına `.setMaxValue(MAKS_BAHIS)` ekle.
2. Satır 70: çıplak `ryoDus(userId, bahis);` çağrısını kontrollü yap. Başarısızsa `interaction.reply({ content: '❌ Bahis düşülemedi, bakiye değişmiş olabilir.', ephemeral: true })` döndür.
3. Satır 161–166 (`bj_double`): `ryoDus(userId, bahis);` yerine `if (!ryoDus(userId, bahis)) return;` yaz. Bahsi ikiye katlamadan önce çalışmalı. Aynı `ryoDus(userId, bahis);` metni dosyada iki kez geçtiği için Edit'te çevresindeki satırlarla birlikte benzersiz hale getir.

Sonra `node --check` ile tüm dokunulan komut dosyalarını ve `oyunGorsel.js`'i doğrula: hafiza, gunluk, market, duello, yazitura, slot, blackjack, bakiye, demirci, envanter, kayitOtomasyonu, oneri, rastgeleManga, sunucuKur, sunucuSifirla, yenidenKayit.

## Bekleyen görevler

3. **Otomatik moderasyon.** Yeni `src/services/otomodServisi.js`: Türkçe'ye uygun normalleştirme (leetspeak, tekrar eden harf, ayırıcı, aksan), küfür ve yasaklı kelime listesi, sunucuya özel liste, kullanıcı başına ihlal sayacı (`data/` altında, zamanla azalan). Kademe: mesajı sil, Kage kişiliğiyle uyar (gerekirse AI ile), sonra timeout (10 dk, sonra daha uzun). Yetkililer muaf. `src/events/messageCreate.js` içinde satır 81'deki bot/guild kontrolünden hemen sonra, spoiler bölümünden önce çağrılır. Yönetici komutu `/otomod` (aç/kapat, kelime ekle/çıkar, ihlal görüntüle, eşikler). Denetim kaydı `denetim.js` ile. AI'nın moderasyon durumunu görebilmesi için bir kanca. Önce `timeout.js`, `uyari.js`, `chatBotServisi.js`, `aiAjanServisi.js` okunmalı. "Otomatik kayıt kapısı" ifadesi büyük ihtimalle "otomatik moderasyon" demek.
4. **Site yardım API'si.** `src/index.js` içine `POST /api/yardim/sor`: kendi anahtarı (`SITE_API_KEY`, yoksa `WEBHOOK_SECRET`), gövde boyutu sınırı, IP başına hız sınırı, girdi uzunluk sınırı, `{cevap}` JSON yanıtı. Gemini beynini site-yardım kişiliğiyle ve yönetici araçları olmadan kullanır. `.env.example`'a `SITE_API_KEY` eklenir. Amaç kage95.com yardım bölümüne bot gömmek için altyapı.
5. **Yeni AI araçları.** `manga_oner` ve `hatirlatici_kur`. Hatırlatıcılar `data/` altında JSON, kullanıcı başına sınır, zamanlayıcı `ready.js` içinde `hafizaServisiniBaslat` yanında başlatılır. `araclar.js` içinde `HERKESE_ACIK` listesine eklenir, işleyiciler `aracCalistir` içinde `aiEylemiCalistir` düşüşünden önce yazılır.
6. **Testler.** Tüm değişen dosyalarda `node --check`, içe aktarma testleri, ekonomi simülasyonu (Ryo korunumu: düello, blackjack, yazı-tura), `slotBeklenenGeriDonus()` ile tam RTP hesabı, moderasyon testleri, API uç noktası testi. Test sırasında `data/` dosyaları yedeklenip geri yüklenir. Geçici betikler scratchpad klasörüne yazılır.
7. **Spec güncellemesi.** `docs/superpowers/specs/2026-10-26-unified-ai-brain-design.md` sonuna yeni "(tamam)" bölümleri (oyunlar, ekonomi denetimi, otomod, site API, hatırlatıcı) eklenir. "Sonraki" altında yalnızca embedding araması kalır.

## Önemli teknik bağlam

- ESM Node, discord.js v14.18, axios, dotenv. Komutlar `src/commands` altında `data` ve `execute(interaction)` dışa aktarır. Olaylar `src/events` altında.
- Ekonomi: `src/services/ekonomiServisi.js` (`data/ekonomi.json`). `ryoDus` yetersiz bakiyede `false` döner. `ryoEkle` aşağı yuvarlar. `MAKS_BAHIS` 5000. Yeni hesap 100 Ryo ile başlar.
- HTTP sunucusu `src/index.js` satır ~85–174: CORS `*`, `x-kage-secret` başlığı veya `?secret=` ile `WEBHOOK_SECRET` kontrolü, `/api/webhook/*` yolları.
- Gemini REST fonksiyon çağrısı `src/services/ai/*` altında. `kageyeSor({...})` → `{cevap, onaylar, sus, hata, kota}`.
- Oyun deseni: bakiye ön kontrolü, kontrollü `ryoDus`, aşamalı animasyon (`bekle`), yalnızca sahibi basabilen "tekrar" düğmesi, 45 sn collector, `mesgul` bayrağı, bitişte bileşenleri kaldırma.

## Doğrulanmamış olanlar

Hiçbir şey canlı Discord veya Gemini'ye karşı denenmedi. Yeni yazılan oyun dosyaları sözdizimi kontrolünden geçmedi.
