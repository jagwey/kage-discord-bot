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
Tüm AI yönlendirmesi `src/services/aiRouterServisi.js` üzerinden yönetilir:
1. **Groq (`GROQ_API_KEY`):** Ultra hızlı sohbet (~0.4s-1.5s, 500+ tok/s). `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `llama-3.3-70b-versatile` fallback listesi ile çalışır.
2. **Google Gemini (`GEMINI_API_KEY`):** `gemini-2.5-flash`. Derin felsefi analiz, sistem bağlamı, manga bilgisi ve çoklu araç çağrısı.
3. **OpenRouter (`OPENROUTER_API_KEY`):** Ücretsiz model zinciri fallback:
   - `openrouter/free` -> `nvidia/nemotron-3.5-lightning:free` -> `dots-studio/dots-3-note-preview:free` -> `google/gemma-4-31b-it:free`.
4. **Pollinations AI:** Sınırsız ücretsiz görsel üretimi (`/ciz`) ve API kotası bittiğinde sıfır kesintili metin üretimi.

## 📁 Dizin Yapısı
- `src/commands/`: 65 adet Slash komutu (`export const data`, `export async function execute`).
- `src/services/`: 31 adet modüler servis (`aiRouterServisi`, `chatBotServisi`, `ekonomiServisi`, `klanServisi`, `yoldasServisi`, `sunucuMimarisiServisi`, `zindanServisi`, `bossServisi` vb.).
- `src/events/`: Discord olay dinleyicileri (`interactionCreate`, `messageCreate`, `ready`, `guildMemberAdd`).
- `data/`: JSON veri depoları (`klanlar.json`, `yoldaslar.json`, `zindan.json`, `ekonomi.json`, `kullanicilar.json`, `dojo.json` vb.).
- `assets/`: Stickerlar (`assets/stickers/`), profil avatarları (`assets/avatars/`), SVG bannerlar (`assets/banner.svg`).

## ⚔️ Önemli Komutlar & Sistemler
- `/ciz`: Pollinations AI ile manga/anime/siberpunk görsel üretimi.
- `/klan`: Samuray klanı kurma (2500 Ryo), bağış yapma, klan seviyesi, sunucu sıralaması.
- `/yoldas`: Gölge Kurdu, Alev Tilkisi, Mistik Kuzgun, Yeşim Ejderi evcil hayvanları ve zindan savaş buffları.
- `/kehanet`: Günlük samuray falı, şans yüzdesi ve sürpriz Ryo hediyesi.
- `/sunucu-kur`: kage95.com canlı platformuna, AI atölyelerine ve klan dojosuna tam entegre profesyonel sunucu kurulumu.
- `/zindan`, `/boss`, `/kule`, `/dojo`, `/balik`: Kapsamlı RPG & ekonomi oyun döngüsü.
- `/gorev`: Günlük 3 görev (mesaj, balık, zindan, boss), tamamlama bonusu (`gorevServisi.js`).
- `/ai-durum` (yönetici): AI sağlayıcı anahtar durumu ve başarı/hata sayaçları.

## 🛠️ Kodlama Standartları & Kurallar
- ESM kullanılmalı: `import/export`.
- Yeni slash komutlarında: `export const data = new SlashCommandBuilder()...` ve `export async function execute(interaction) { ... }`.
- Para işlemlerinde her zaman `ryoEkle(userId, miktar, neden)` ve `ryoDus(userId, miktar, neden)` kullanılmalı; negatif bakiye oluşmamalıdır.
- Ephemeral mesajlar için `flags: MessageFlags.Ephemeral` kullanılmalıdır.
- Herhangi bir AI sağlayıcısı çökerse diğeri devreye girer (Zero-Downtime Fallback).
