# Birleşik Kage Yapay Zeka Beyni

## Amaç
Tek kişilik (Kage), tek motor (Gemini), konuşma hafızalı ve araç çağıran bir Discord botu. Yönetim araçları yalnızca yetkililere açılır; yıkıcı eylemler buton onayı ve denetim günlüğü ister.

## Bileşenler (src/services/ai)
- `geminiClient.js`: REST istemcisi, RPM sınırı (`GEMINI_RPM`), kullanıcı başına bekleme, model yedekleme.
- `konusmaGecmisi.js`: kanal başına RAM geçmişi (24 mesaj, 45 dk).
- `araclar.js`: herkese açık ve yönetici araç tanımları, `aracCalistir`.
- `kageBeyin.js`: kişilik, hafıza bağlamı, fonksiyon çağırma döngüsü (en çok 5 tur; araya girmede 3).
- `onayServisi.js`: yıkıcı eylemler için `kage_onay:` / `kage_iptal:` butonları, 2 dk, yalnızca isteyen tıklayabilir.
- `denetim.js`: `data/denetim.log` JSON satırları.

## Akış
`messageCreate` → tetikleyici (kage, etiket, bota yanıt, AI kanalı) → `kageyeSor` → araç döngüsü → yanıt (+ onay butonları). `interactionCreate` onay butonlarını `onayButonunuIsle`'ye yollar.

## Araya girme
Yalnızca sohbet/genel/chat kanalları, kanal başına 90 sn sınır, olasılık: "kage" geçerse 0.9, soru işareti 0.15, aksi 0.02. Model `[SUS]` derse susar. `KAGE_ARAYA_GIRME=kapali` kapatır.

## Hata/yedek
Anahtar yoksa eski `chatBotServisi` devreye girer. Kota dolarsa kullanıcıya kısa uyarı gider.

## Hafıza 2.0 (tamam)
`kageHafizaServisi`: `kullaniciProfilleri` (ilgi alanları, favori seriler, ton, dil, kısa özet). `kageBeyin` her ~6 kullanıcı turunda (10 dk bekleme, kota uygunsa) arka planda Gemini ile profil çıkarır (`profilGuncelle`); profil, `hafizaBaglamMetniUret` ile sistem istemine girer.

## Site XP → Ryo (tamam)
`rol-sync` webhook'u `anlikRolGuncelle` → `siteXpKrediEt`: puan başına 0.2 Ryo, bölüm başına 2 Ryo; son kredilenden farkı öder (idempotent). Yanıtta `ryoKredi` döner.

## Oyunlar ve ekonomi denetimi (tamam)
Bahisli komutlar bahsi `ryoDus` ile önce çeker; bakiye yetmezse işlem başlamaz. Düello havuzu yalnızca kazanana ödenir (`duelloSonucuKaydet`), toplam Ryo korunur. Slot'un beklenen geri dönüşü (`slotBeklenenGeriDonus`) yaklaşık %92,7'dir.

## Oto-moderasyon (tamam)
`otomodServisi` yasaklı kelimeleri yanlış pozitif üretmeden bulur (`yasakliBul`), `messageCreate` içindeki kanca her mesajı denetler. `/otomod` ayarları yönetir; yönetici yapay zeka araçları `otomod_durum` ve `otomod_ayarla` aynı ayarlara erişir.

## Site yardım API'si (tamam)
`POST /api/yardim/sor` `{soru}` alır, `{cevap}` döner. Anahtar `x-kage-secret`, `?secret=` veya Bearer ile gelir; `SITE_API_KEY` yoksa `WEBHOOK_SECRET` kullanılır. IP başına dakikada 10 istek (429), gövde en çok 4096 bayt (413), soru 1-500 karakter (400), anahtar hatası 401, Gemini hatası 503. Cevabı `siteYardimSor` üretir.

## Hatırlatıcılar ve manga önerisi (tamam)
`hatirlaticiServisi`: `data/hatirlaticilar.json`, kullanıcı başına en çok 10 bekleyen kayıt, süre 1 dakika - 30 gün, 15 sn'lik kontrolle kanala (olmazsa DM'e) gönderilir. Yapay zeka araçları `hatirlatici_kur` ve `manga_oner` (türe göre rastgele 1-5 manga).

## Topluluk ve ekonomi özellikleri (tamam)
`/cekilis` (butonlu, `cekilisServisi`, zamanlayıcı `ready.js` içinde), `seviyeServisi` (mesaj başına 15-25 XP, 60 sn bekleme, seviye atlayınca seviye*50 Ryo), `ekonomiLogServisi` (500 kayıtlık halka, `/ekonomi-log`), `/karsilama` (kanal, rol ve `{uye} {sunucu} {sayi}` şablonu), `/ticket panel` (butonla özel bilet kanalı, destek rolü, kapanış logu), `/dojo` (saatlik üretim, 12 saatlik depo, 25 seviye). Sunucu ayarları `sunucu_ayarlari.json` içinde tutulur; ortak yardımcı `jsonDepo`.

## Yapay zeka araçları (güncel)
`ode` aracı `/ode` ile aynı kuralları uygular (10-5000 Ryo, 30 sn bekleme, bot ve kendine gönderim yasak, etiketli `ryoDus`/`ryoEkle`). `/hafiza unut` kullanıcının profilini ve notlarını siler.

## Sonraki
Anlamsal (embedding) arama.
