# CLAUDE.md - Kage Bot Proje Kılavuzu

Bu dosya Claude Code, Antigravity ve diğer AI asistanlarının projeyi tek bakışta anlaması, mimariyi kavraması ve sıfır hata ile geliştirmeye devam etmesi için hazırlanmıştır.

## 🏢 Şirket & Marka
- **Çatı Şirket:** JagTech (Asla JageTech DEĞİL).
- **Proje:** Kage-95 Discord Botu & Manga Ekosistemi ([kage95.com](https://kage95.com)).
- **Temel Karakter:** Kage (Sert, felsefi, bilge, adaletli samuray; bazen iğneleyici ama sadık).

## 🚀 Mimari & Yığın (Stack)
- **Çalışma Zamanı:** Node.js (ESM modülleri: `"type": "module"`).
- **Discord Kütüphanesi:** `discord.js` v14 (Slash komutları, Embeds, Butonlar, Modallar).
- **Veri Depolama:** JSON tabanlı yerel depolar (`data/*.json`), `src/utils/jsonDepo.js` üzerinden otomatik dosya kilitlemeli ve güvenli okuma/yazma.
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
- `src/commands/`: 68 adet Slash komutu (`export const data`, `export async function execute`).
- `src/services/`: 32 adet modüler servis (`aiRouterServisi`, `aiErisimServisi`, `chatBotServisi`, `ekonomiServisi`, `klanServisi`, `yoldasServisi`, `sunucuMimarisiServisi`, `zindanServisi`, `bossServisi` vb.).
- `src/events/`: Discord olay dinleyicileri (`interactionCreate`, `messageCreate`, `ready`, `guildMemberAdd`).
- `data/`: JSON veri depoları (`klanlar.json`, `yoldaslar.json`, `zindan.json`, `ekonomi.json`, `kullanicilar.json`, `dojo.json` vb.).
- `assets/`: Stickerlar (`assets/stickers/`), profil avatarları (`assets/avatars/`), SVG bannerlar (`assets/banner.svg`).

## ⚔️ Önemli Komutlar & Sistemler
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
