# <p align="center">⛩️ K A G E ⛩️</p>
<p align="center">
  <strong>Manga Okuma Platformu, Indie Oyun ve Hepsi Bir Arada Discord Sunucu Yönetim Sistemi</strong><br>
  <em>"Sessizce oku, derinlere in. Kaleyi adalet ve gölgelerle kur."</em>
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://discord.js.org"><img src="https://img.shields.io/badge/discord.js-v14.18-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js"></a>
  <a href="https://aistudio.google.com"><img src="https://img.shields.io/badge/AI%20Engine-Gemini%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini"></a>
  <a href="https://kage95.com"><img src="https://img.shields.io/badge/Platform-kage95.com-e53935?style=for-the-badge&logo=torii-gate&logoColor=white" alt="Kage Platform"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-d4af37?style=for-the-badge" alt="License"></a>
</p>

---

```
  ██╗  ██╗ █████╗  ██████╗ ███████╗
  ██║ ██╔╝██╔══██╗██╔════╝ ██╔════╝
  █████╔╝ ███████║██║  ███╗█████╗  
  ██╔═██╗ ██╔══██║██║   ██║██╔══╝  
  ██║  ██╗██║  ██║╚██████╔╝███████╗
  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
       ⛩️  K  A  G  E  •  B O T  ⛩️
```

**Kage**, **[kage95.com](https://kage95.com)** canlı modern manga okuma platformu ve kurucusu **Jagwey** tarafından geliştirilen bağımsız indie oyunu için sıfırdan tasarlanmış; **MEE6 veya Carl-bot gibi harici botlara ihtiyaç bırakmayan**, bünyesinde **Google Gemini Flash & Claude Haiku** yapay zekasını barındıran ve **sunucunuzu tek tıkla otomatik kurabilen** yeni nesil hepsi bir arada Discord botudur.

---

## 🩸 Öne Çıkan Yetenekler

### 1. 🏗️ Otomatik Sunucu Mimarı (`/sunucu-kur`)
Sunucunuz boş veya dağınık mı? Tek komutla Kage tüm sunucuyu profesyonel bir samuray kalesine çevirir:
- **Hiyerarşik Samuray Rolleri**: `👑 Kage (Yönetici)`, `🥷 Anbu (Moderatör)`, `🗡️ Jonin (Kıdemli Savaşçı)`, `🏮 Chunin (Sadık Okur)`, `📜 Gölge Genin (Yeni Üye)`.
- **Özel İzinli Kategoriler**:
  - `⛩️ BİLGİLENDİRME` (Kurallar, Duyurular, Yeni Bölümler, Hoş Geldiniz)
  - `💬 TOPLULUK & SOHBET` (Genel Sohbet, Manga Tartışma, Spoiler Odası, Medya, Bot Komut)
  - `🎮 KAGE INDIE OYUN` (Oyun Duyuru, Geliştirici Günlüğü, Hata Bildirim)
  - `🔊 SES MECLİSİ` (Gölge Tapınağı, Samuray Meclisi, Sessiz Okuma)
  - `🛡️ YÖNETİM & GÖLGE ODASI` (Sadece Kage ve Anbu'ya özel gizli yönetim odası, AI vezir kanalı ve mod-log)
- **Akıllı Otomasyon**: Kanallar açılır açılmaz botun mod-log, karşılama ve AI ayarları otomatik olarak bu odalara kilitlenir.

### 2. 🧠 Yapay Zeka Gölge Veziri (`/ai` & Doğal Sohbet)
- Sadece yetkililere özel `/ai <talimat>` komutu ile sunucu kuralları maddeleri türetme, üye anlaşmazlıklarında tarafsız samuray adaletiyle ceza kararı önerme, klan fermanları ve etkinlik metinleri hazırlatma.
- **Doğal Sohbet Odası**: Gizli `#ai-gölge-veziri` kanalında veya bot etiketlendiğinde yöneticilerle doğrudan doğal dilde konuşarak bir sunucu danışmanı gibi rehberlik eder.
- **Çift Motor Gücü**: Hem **Google Gemini 2.5 Flash** (ücretsiz, jet hızında) hem de **Anthropic Claude 3.5 Haiku** desteği.

### 3. ⚔️ MEE6 / Carl-bot Moderasyon Paketi
- `/ban` & `/unban`: Üyeleri kaleden kalıcı olarak sürgün etme ve af sistemi (isteğe bağlı son 7 günün mesajlarını silme).
- `/kick`: Üyeyi sunucudan atma.
- `/timeout` & `/untimeout`: 1 dakika ile 1 hafta arası süreli susturma cezası.
- `/sil`: Belirtilen kanalda 1-100 adet mesajı veya sadece seçili üyenin mesajlarını anında temizleme (Purge).
- `/kilit`: Kanalı üyelere anında yazıya kapatma / açma.
- `/yavasmod`: Kanal için yavaş modu devreye alma/kapatma (Slowmode).
- `/uyari`: Kalıcı ceza sicili takip sistemi (`ekle`, `liste`, `temizle`).
- `/rol`: Tek komutla rol verme veya geri alma.

### 4. 📜 Denetim & Mod-Log (Audit Logging)
- Silinen mesajları (kim sildi, hangi kanalda, ne yazıyordu) anlık yakalayıp mod-log kanalına iletir.
- Tüm ban, kick, timeout, unban ve rol değişimlerini kan kırmızısı embedlerle yetkili ve sebep belirterek belgeler.
- Sunucudan ayrılan üyeleri ve sunucuda geçirdikleri süreyi kayıt altına alır.

### 5. ⛩️ Canlı Manga & Kage 95 Platformu
- `/manga <isim>`: Sitenin API'sinden (`https://kage95.com/api/mangas`) anlık arama yapar, otomatik tamamlama (autocomplete) sunar ve tek tıkla **"Sitede Oku"** butonu verir.
- `/profil [kullanici]`: Okur seviyesini, görsel XP barını (`[████████░░]`), klanını ve samuray unvanını (`Kage`, `Anbu`, `Jonin`, `Chunin`, `Genin`, `Ronin`) sergiler.
- `/oyun`: Kurucu Jagwey tarafından geliştirilmekte olan Kage indie oyununun karanlık feodal hikayesini, dövüş mekaniklerini ve devlog detaylarını gösterir.
- **Otomatik Bölüm Takipçisi (Background Poller)**: Her 5 dakikada bir siteyi arka planda sessizce tarar ve yeni bölümleri duyurur (flood ve spam korumalı).

---

## 📜 Komut Listesi (22 Adet Eğik Çizgi Komutu)

| Komut | Yetki | Açıklama |
| :--- | :--- | :--- |
| `/sunucu-kur` | `Yönetici` | Rolleri, kategorileri ve kanalları sıfırdan otomatik kurar. |
| `/ai <talimat>` | `Sunucuyu Yönet` | Yapay zeka gölge vezirine sunucu idaresi için danışır. |
| `/ban <üye> [sebep] [gün]` | `Üyeleri Yasakla` | Üyeyi sunucudan kalıcı olarak banlar ve mesajlarını siler. |
| `/unban <id> [sebep]` | `Üyeleri Yasakla` | Yasaklı üyenin banını kaldırır. |
| `/kick <üye> [sebep]` | `Üyeleri At` | Üyeyi sunucudan atar. |
| `/timeout <üye> <süre>` | `Üyeleri Yönet` | Üyeyi süreli susturur (1dk - 1 hafta). |
| `/untimeout <üye>` | `Üyeleri Yönet` | Susturmayı erken kaldırır. |
| `/sil <miktar> [üye]` | `Mesajları Yönet` | 1-100 adet mesajı kanaldan temizler. |
| `/kilit <durum> [kanal]` | `Kanalları Yönet` | Kanalı kilitler veya kilidi açar. |
| `/yavasmod <saniye>` | `Kanalları Yönet` | Kanalda yavaş mod hız sınırını belirler. |
| `/uyari <ekle/liste/temizle>`| `Üyeleri Yönet` | Üyenin kalıcı ceza sicilini tutar ve inceler. |
| `/rol <ver/al> <üye> <rol>` | `Rolleri Yönet` | Üyeye rol bahşeder veya geri alır. |
| `/duyuru <kanal> <başlık> <mesaj>` | `Kitleyi Etiketle` | Kage kan kırmızısı resmi duyuru fermanı basar. |
| `/anket <soru> [seçenekler]` | `Mesajları Yönet` | Otomatik reaksiyonlu oylama başlatır. |
| `/ayarlar` | `Yönetici` | Mod-log, oto-rol ve karşılama odalarını yönetir. |
| `/sunucu-bilgi` | `Herkes` | Üye, kanal, rol ve boost detaylarını listeler. |
| `/kullanici-bilgi [üye]` | `Herkes` | Üyenin hesap tarihi, rolleri ve ceza sicilini gösterir. |
| `/manga <isim>` | `Herkes` | Canlı siteden manga arar (Autocomplete destekli). |
| `/profil [üye]` | `Herkes` | Samuray okur seviyesi ve rütbe kartını döner. |
| `/oyun` | `Herkes` | Kage indie oyun devlog ve evren detaylarını sunar. |
| `/duyuru-test` | `Sunucuyu Yönet` | Yeni bölüm duyuru sistemini anında test eder. |
| `/yardim` | `Herkes` | Kage bot rehberini görüntüler. |

---

## 📁 Proje Mimarisi

```text
├── src/
│   ├── commands/                 # 22 Adet Eğik Çizgi Komutu
│   │   ├── sunucuKur.js          # /sunucu-kur mimarı
│   │   ├── ai.js                 # /ai yapay zeka danışmanı
│   │   ├── ban.js, unban.js      # Yasaklama ve af
│   │   ├── kick.js               # Sunucudan atma
│   │   ├── timeout.js, untimeout.js # Zamanaşımı
│   │   ├── sil.js                # Toplu temizlik
│   │   ├── kilit.js, yavasmod.js # Kanal kısıtlamaları
│   │   ├── uyari.js              # Ceza sicili
│   │   ├── rol.js                # Rol dağıtımı
│   │   ├── duyuru.js, anket.js   # Topluluk araçları
│   │   ├── ayarlar.js            # Yapılandırma
│   │   ├── sunucuBilgi.js, kullaniciBilgi.js # İstatistikler
│   │   ├── manga.js, profil.js   # Kage manga entegrasyonu
│   │   ├── oyun.js, yardim.js    # Oyun lore & yardım
│   │   └── duyuruTest.js         # Test komutu
│   ├── events/                   # Discord Gateway Olayları
│   │   ├── ready.js              # Bot açılışı & Slash eşitleme
│   │   ├── interactionCreate.js  # Komut ve Autocomplete yönlendirici
│   │   ├── messageCreate.js      # Yetkili kanalında doğal AI sohbeti
│   │   ├── messageDelete.js      # Silinen mesajları yakalama
│   │   ├── guildMemberAdd.js     # Karşılama ve oto-rol (Gölge Genin)
│   │   └── guildMemberRemove.js  # Ayrılan üyeleri denetime işleme
│   ├── services/                 # Servis Motorları
│   │   ├── aiServisi.js          # Gemini Flash & Claude Haiku hibrit istemci
│   │   ├── veritabaniServisi.js  # Kalıcı JSON veritabanı (ayarlar & uyarılar)
│   │   ├── modLogServisi.js      # Denetim kayıtları motoru
│   │   ├── mangaServisi.js       # kage95.com API istemcisi & bellek önbelleği
│   │   └── duyuruServisi.js      # 5 dakikalık bölüm takip poller'ı
│   ├── config/
│   │   └── tema.js               # Kage kan kırmızısı (#e53935) ve gölge görsel dili
│   ├── deploy-commands.js        # Manuel Slash komut dağıtıcısı
│   └── index.js                  # Bot başlatıcı ve Gateway Intent yönetimi
├── data/                         # Kalıcı Veritabanı Dosyaları (.gitignore ile korunur)
├── .env.example                  # Ortam değişkenleri şablonu
├── .gitignore                    # Güvenlik ve API anahtarı koruyucusu
├── LICENSE                       # MIT Açık Kaynak Lisansı
└── package.json
```

---

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın
`.env.example` dosyasını kopyalayarak `.env` oluşturun:
```bash
cp .env.example .env
```
`.env` dosyanızı düzenleyin:
```ini
# Discord Bot Bilgileri (discord.com/developers/applications)
DISCORD_TOKEN=BOT_TOKENINIZ
CLIENT_ID=BOT_APPLICATION_CLIENT_ID
GUILD_ID=GELISTIRME_SUNUCU_IDSI_OPSIYONEL

# 🧠 Yapay Zeka (aistudio.google.com adresinden %100 ÜCRETSİZ alabilirsiniz)
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Kage Platform Bilgileri
API_BASE_URL=https://kage95.com/api
SITE_URL=https://kage95.com
```

### 3. Discord Developer Portal Ayarları
1. [Discord Developer Portal](https://discord.com/developers/applications) adresine gidin.
2. Bot sekmesinden **Privileged Gateway Intents** bölümündeki:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
   anahtarlarını aktif hale getirin.
3. OAuth2 -> URL Generator üzerinden `bot` ve `applications.commands` seçerek botu sunucunuza `Administrator` yetkisiyle davet edin.

### 4. Botu Başlatın
```bash
npm start
# veya geliştirici modunda (canlı dosya takibiyle):
npm run dev
```

### 5. Sunucuyu Otomatik Kurun
Bot sunucunuza geldikten sonra bir kanalda:
```text
/sunucu-kur
```
yazın ve açılan kartta **"Evet, Kaleyi İnşa Et"** butonuna basın. Kage saniyeler içinde bütün kanalları, rolleri ve gölge odalarını kuracaktır!

---

## 🛡️ Güvenlik & Gizlilik
- **API Key Koruması**: `.env` ve sunucunuzun verilerini tutan `data/` dizini `.gitignore` ile mühürlenmiştir. Depoyu GitHub'a atsanız dahi hiçbir gizli anahtarınız veya veriniz internete sızmaz.
- **Yetki Hiyerarşisi**: Bot, kendisinden veya yetkiliden daha üstün bir rolü banlayamaz, atamaz veya değiştiremez.
- **Hata Toleransı**: Harici API çökmeleri veya ağ gecikmeleri botu düşürmez (`unhandledRejection` yakalayıcıları mevcuttur).

---

### ⛩️ Kage • Mürekkep, Çelik ve Yapay Zeka
Kurucu & Geliştirici: **Jagwey & Kage Ekibi**
