# CLAUDE.md - Kage Bot Proje Kılavuzu

Bu dosya Claude Code, Antigravity ve diğer AI asistanlarının projeyi tek bakışta anlaması, mimariyi kavraması ve sıfır hata ile geliştirmeye devam etmesi için hazırlanmıştır.

## 🏢 Şirket & Marka
- **Çatı Şirket:** JagTech (Asla JageTech DEĞİL).
- **Proje:** Kage-95 Discord Botu & Manga Ekosistemi ([kage95.com](https://kage95.com)).
- **Temel Karakter:** Kage (Sert, felsefi, bilge, adaletli samuray; bazen iğneleyici ama sadık).

## 🚀 Mimari & Yığın (Stack)
- **Çalışma Zamanı:** Node.js (ESM modülleri: `"type": "module"`).
- **Discord Kütüphanesi:** `discord.js` v14 (Slash komutları, Embeds, Butonlar, Modallar).
- **Veri Depolama:** JSON tabanlı yerel depolar (`data/*.json`), `src/services/jsonDepo.js` üzerinden otomatik dosya kilitlemeli ve güvenli okuma/yazma.
- **Canlılık & Sunucu:** Node `http` tabanlı canlılık sunucusu (`PORT`, `/health`, `/api/yardim/sor`). Render üzerinde 7/24 çalışır.

## 🤖 Çoklu Yapay Zeka Ağı (Multi-AI Mesh Architecture)
Tüm AI yönlendirmesi `src/services/aiRouterServisi.js` ve erişim denetimi `src/services/aiErisimServisi.js` üzerinden yönetilir:
1. **Google Gemini (`GEMINI_API_KEY`):** `gemini-3.5-flash-lite`, `gemini-2.5-flash`. Derin felsefi analiz, sistem bağlamı, manga bilgisi ve otonom vezir araç çağrısı.
2. **Groq Cloud (`GROQ_API_KEY`):** Ultra hızlı yanıt (~0.4s-1.5s, 500+ tok/s). `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b` fallback listesi ile çalışır.
3. **OpenRouter (`OPENROUTER_API_KEY`):** Ücretsiz model zinciri fallback:
   - `openrouter/free` -> `google/gemma-4-31b-it:free` -> `nvidia/nemotron-3.5-lightning:free` -> `deepseek/deepseek-chat:free` / `deepseek-r1:free` -> `meta-llama/llama-3.3-70b-instruct:free`.
   - `<think>...</think>` düşünce etiketleri otomatik temizlenir.
4. **Pollinations AI:** Sınırsız ücretsiz görsel üretimi (`/ciz`) ve API kotası bittiğinde sıfır kesintili metin üretimi.

## 🛡️ Yapay Zeka Erişim Güvenliği & Kötüye Kullanım Koruması (`aiErisimServisi.js`)
- **Rol Kısıtlaması:** Sunucuda `/ayarlar ai-rol [rol]` ile yapay zekayı sadece belirlenen üyelere açma.
- **Güvenlik Modları:** `/ayarlar ai-mod [sadece_rol | sadece_yonetici | herkese_acik]`.
- **Anti-Abuse & Rate-Limit:** Kullanıcı başına 8 sn metin, 15 sn görsel cooldown. Spamcılar engellenir.
- **Canlı Admin AI İzleme:** Başka biri konuşurken bile admin kanalına (`aiYonetimKanalId`) hangi kullanıcının hangi soruya hangi motorla yanıt aldığı canlı düşer. Yetkililere mesaj altında motor etiketi (`-# [Motor: ...]`) gösterilir.

## 📁 Dizin Yapısı
- `src/commands/`: 76 adet Slash komutu (`export const data`, `export async function execute`).
- `src/services/`: 45 adet modüler servis (`oyunOlayServisi`, `aiRouterServisi`, `aiErisimServisi`, `golgeGozServisi`, `chatBotServisi`, `ekonomiServisi`, `klanServisi`, `yoldasServisi`, `sunucuMimarisiServisi`, `zindanServisi`, `bossServisi` vb.).
- `src/events/`: Discord olay dinleyicileri (`interactionCreate`, `messageCreate`, `ready`, `guildMemberAdd`).
- `data/`: JSON veri depoları (`klanlar.json`, `yoldaslar.json`, `zindan.json`, `ekonomi.json`, `kullanicilar.json`, `golge_goz_istatistik.json`, `dojo.json` vb.).
- `assets/`: Stickerlar (`assets/stickers/`), profil avatarları (`assets/avatars/`), SVG bannerlar (`assets/banner.svg`).

## ⚔️ Önemli Komutlar & Sistemler
- **Kısa komutlar (`komutNiyetServisi.js`):** Türkçe asıl adlar `k yt 100`, `k slot 50`, `k g`, `k para` onaysız çalışır (eski OwO adları `cf`, `s`, `d` yedek); `KISA_KOMUTLAR` içinde ilk ad asıl addır; yanlış yazımda "mı demek istedin" sorar. "kage yoldaşımı besle" gibi düz cümleler onay butonuyla slash komutunu çalıştırır. Yeni oyun komutu eklerken `KISA_KOMUTLAR` ve `NIYETLER` listelerine de ekle.
- `/golge-goz`: Kage-95 Gölge Gözü (Shadow Eye Sentinel) - Sunucu chatini 0ms sezgisel filtreler ve mikro-tamponlu AI analizi ile gözetleme (`durum`, `rapor`, `tara`).
- `/hafizam`: Kullanıcının Kage hafızasındaki parşömen profili ve tek tıkla sıfırlama butonu.
- `/ozet`: Kanaldaki son konuşulanları tarayıp esprili samuray bülteni olarak özetleme.
- `/model`: Tüm aktif AI modellerini listeleme (`/model liste`), kalıcı seçme (`/model sec`) ve anlık konuşma (`/model sor`).
- `/ciz`: Pollinations AI ile manga/anime/siberpunk görsel üretimi (15 sn bekleme korumalı).
- `/klan`: Samuray klanı kurma (2500 Ryo), bağış yapma, klan seviyesi, sunucu sıralaması.
- `/yoldas`: Gölge Kurdu, Alev Tilkisi, Mistik Kuzgun, Yeşim Ejderi evcil hayvanları ve zindan savaş buffları.
- `/kehanet`: Günlük samuray falı, şans yüzdesi ve sürpriz Ryo hediyesi.
- `/sunucu-kur`: kage95.com canlı platformuna, AI atölyelerine ve klan dojosuna tam entegre profesyonel sunucu kurulumu.
- `/zindan`, `/boss`, `/kule`, `/dojo`, `/balik`: Kapsamlı RPG & ekonomi oyun döngüsü.
- `/gorev`: Günlük 3 görev (mesaj, balık, zindan, boss), tamamlama bonusu (`gorevServisi.js`).
- `/ai-durum` (yönetici): AI sağlayıcı anahtar durumu ve başarı/hata sayaçları.
- **Oyun olay merkezi (`oyunOlayServisi.js`):** `oyunOlayi(userId, tur)` görev, rozet, klan savaşı puanı ve malzeme düşürmeyi tek yerde işler, `{ notlar }` döner. Yeni oyun komutu bu kancayı çağırmalı ve notları çıktıya eklemeli.
- `/klan savas`: Haftalık klan savaşı (`klanSavasServisi.js`). Klanlar global, ödül Ryo, kasa ve rozettir.
- `/zanaat`: Malzeme, tarif, dövme ve kuşanma (`zanaatServisi.js`). Kuşanılan eşyalar zindan bonusu verir.
- `/demirci` (Ocak): Kılıç, Eşya ve Tamir sekmeleri tek panelde. Kılıç 4. kademeden itibaren kırılabilir; 5 ve üstünde geriler, koruma tılsımı (`korumaTilsimiAl`) bunu önler, her kırılma sonraki riski düşürür. Kuşanılı eşyalar `oyunOlayi` içinde `esyaAsindir` ile yıpranır (zindan 6, boss 2), kırık eşya bonus vermez, `esyaTamir` Ryo ve malzemeyle onarır. Efsanevi tarifler Kadim Çekirdek ister; o yalnızca `bossOldur` ile düşer ve kara borsada satılmaz (`borsaDisi`).
- `/balik`: Gölet, Akvaryum ve Turnuva sekmeleri (`balikServisi.js`). `oltaAt` atışı başlatır, `oltaCek` şamandıra battıktan sonraki 3.5 sn içinde çekilirse balık verir (ilk 1.5 sn kusursuz: olta +3, kg x1.2). Panel `editReply` ile şamandırayı batırır ve kaçan avı kapatır. 13 tür; gece (20-06) ve mevsim balıkları. Akvaryum 5 yuva, saatlik Ryo, 24 saat kasa sınırı. Haftalık en ağır balık turnuvası `turnuvaKapat` ile kapanır, `etkinlikServisi` duyurur.
- `/karaborsa`: Saatlik fiyatlar ve saatlik nadir mal (`karaBorsaServisi.js`).
- `/piyango`: Haftalık bilet, pazartesi 00:00 otomatik çekiliş (`piyangoServisi.js`).
- `/baskin`: Gölge baskını, 5 dakikalık buton savunması, otomatik baskın (`baskinServisi.js`). Baskın kanalı haftalık sonuç duyuru kanalıdır (`etkinlikServisi.js`).
- `/basarim`: 17 Ryo ödüllü rozet (`basarimServisi.js`). Yoldaş seviye 10'da evrimleşir; `/gunluk` seri kalkanı satar.
- **Geçiş butonları (`src/config/panel.js`):** `gecisSatiri('gorev','zindan',...)` "sıradaki adım" butonları kurar (`kgit:<komut>`). Tıklayan herkes için ilgili komutun `execute` fonksiyonu sahte `options` ile çalışır. Yeni komut eklenecekse `GECISLER` listesine yazılır.
- `/envanter`: Genel, Çanta, Zanaat, Balık, Yoldaş kategorileri; 10 satırlık sayfalama, kalıcı butonlar (`envanter:`).
- `/profil` (kendi profilin): `profilKartiServisi.js` ile `@napi-rs/canvas` üzerinden PNG samuray kartı çizer. Fontlar `assets/fonts` içindeki Noto Sans; kart metninden emoji ayıklanır, avatar 3 sn içinde gelmezse baş harf çizilir.
- `/ryo ver|al|bak` (sahip/yönetici): Üyeye Ryo yükleme, geri alma, cüzdan görüntüleme. Sahip (`sahipMi`: OWNER_ID, sunucu sahibi, uygulama sahibi) bütün AI eylemlerinde tam yetkilidir.

## 🧠 Merkezi Ortak Hafıza (Unified Shared Memory) & Komutsuz Yönetim
- **Merkezi Bellek:** `src/services/kageHafizaServisi.js` ve `data/kage_hafiza.json` tek gerçektir. Hangi model (Gemini, Groq, OpenRouter DeepSeek, Pollinations) kullanılırsa kullanılsın tüm bilgiler, kullanıcı notları, profiller ve kural eğitimleri ortaktır.
- **Otonom Öğrenme:** Modellerin ürettiği metinlerdeki `[ÖĞRENİLDİ: ...]` etiketleri otomatik taranarak anında merkezi hafızaya işlenir.
- **Doğal Dille Model Geçişi:** `kage groq'a geç`, `kage deepseek kullan`, `kage gemini'ye geç`, `kage otomatik moda geç` veya `kage [groq]: ...` anında yakalanır ve kalıcı olarak kaydedilir (`kullaniciModelSec`).
- **Komutsuz Eylem Yönetimi (Action Intent Routing):** Kullanıcı "şu üyeyi sustur", "mesajları temizle", "kurallara şunu ekle", "bana 500 ryo ver" dediğinde katı komutlara gerek kalmadan doğrudan Otonom Vezir (`kageyeSor`) devreye girer; yetki kontrollerini yapar ve eylemi icra eder.

## 🛠️ Kodlama Standartları & Kurallar
- ESM kullanılmalı: `import/export`.
- Yeni slash komutlarında: `export const data = new SlashCommandBuilder()...` ve `export async function execute(interaction) { ... }`.
- Para işlemlerinde her zaman `ryoEkle(userId, miktar, neden)` ve `ryoDus(userId, miktar, neden)` kullanılmalı; negatif bakiye oluşmamalıdır.
- Ephemeral mesajlar için `flags: MessageFlags.Ephemeral` kullanılmalıdır.
- Herhangi bir AI sağlayıcısı çökerse diğeri devreye girer (Zero-Downtime Fallback).
