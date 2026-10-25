import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';

// Yetki / Yönetim anahtar kelimeleri
const YETKI_KELIMELERI = [
  'şunu yap', 'sunucuya ekle', 'rol aç', 'rol oluştur', 'rol ver', 'rol al',
  'kanal aç', 'kanal sil', 'kategori aç', 'kategori sil', 'banla', 'kickle',
  'sustur', 'mutele', 'temizle', 'sil', 'kural ekle', 'kuralları düzenle',
  'sunucuyu kur', 'sunucuyu sıfırla', 'admin yap', 'yetki ver', 'bana rol ver'
];

const SELAMLAR = ['selam', 'merhaba', 'sa', 'selamun aleykum', 'hey', 'günaydın', 'iyi akşamlar', 'iyi geceler', 'selamlar', 'yo'];
const HAL_HATIR = ['nasılsın', 'naber', 'ne haber', 'nasıl gidiyor', 'nörüyon', 'napıyon', 'ne yapıyorsun', 'iyisin'];
const KIMLIK = ['kimsin', 'adın ne', 'nesin', 'sen kimsin', 'kendini tanıt', 'adın nedir'];
const SAHIP = ['yapımcın kim', 'sahibin kim', 'seni kim yaptı', 'geliştiricin kim', 'kim kodladı', 'kurucun kim'];
const MANGA = ['manga', 'webtoon', 'manhwa', 'bölüm', 'oku', 'yeni bölüm', 'site', 'website', 'kütüphane'];
const ZINDAN = ['zindan', 'canavar', 'savaş', 'düşman', 'iblis', 'loot', 'ganimet', 'canavarlar'];
const KUMAR = ['kumar', 'blackjack', 'bj', 'slot', 'para', 'ryo', 'yazitura', 'bahis', 'para kazan'];
const KATANA = ['demirci', 'katana', 'kılıç', 'geliştir', 'silah'];
const OVGU = ['adamsın', 'kral', 'harikasın', 'helal', 'sevdim seni', 'cansın', 'eyvallah', ' Adamsın'];
const YARDIM = ['yardım', 'komutlar', 'ne yapabilirsin', 'help', 'neler yaparsın'];

const SAMURAY_SOZLERI = [
  '⛩️ *"Bir kılıç ustası gücünü kınından değil, sabrından alır."* Bir yardıma ihtiyacın olursa `/yardim` yazman yeterli!',
  '🥷 *"Gölgeler asla yalan söylemez."* Kage Kalesi\'nde yolunu bulmak için manga ve zindan komutlarımıza göz at.',
  '🌸 *"Kiraz çiçekleri rüzgarla savrulur ama gerçek bir savaşçı dimdik ayakta kalır."* kage95.com\'da yeni bölümlere göz atmayı unutma!',
  '🗡️ *"Karanlık çöktüğünde yalnızca en keskin katanalar parıldar."* Gücünü test etmek için `/zindan` yazabilirsin.',
  '🍵 *"Acele eden samuray kılıcını kınında unutur."* Sakin ol ve bir fincan yeşil çay eşliğinde `/rastgele-manga` oku.',
  '🏮 *"Onur bir kez kaybedilirse bin zafer bile onu geri getiremez."* Kage Kalesi\'nde saygınlığını koru genç ronin.'
];

/**
 * Normal kullanıcılar için hızlı, esprili ve tematik Kage Chat Bot yanıtı üretir.
 * Yapay zeka ve sunucu yönetim yetkisi vermez.
 * @param {string} mesajMetni 
 * @param {import('discord.js').User} user 
 * @returns {import('discord.js').EmbedBuilder}
 */
export function chatBotYanitla(mesajMetni, user) {
  const metin = (mesajMetni || '').trim().toLowerCase();

  let baslik = '🗡️ KAGE CHAT BOT • Samuray Yanıtı';
  let aciklama = '';
  let renk = TEMA.RENKLER.BILGI;

  // 1. Yetki / Sunucu Yönetimi Talebi (ENGELLEME & HADDİNİ BİLDİRME)
  if (YETKI_KELIMELERI.some(k => metin.includes(k))) {
    baslik = '🚫 YETKİ REDDEDİLDİ • HADDİNİ BİL ÇEKİRGE!';
    renk = TEMA.RENKLER.HATA;
    aciklama = `**${user.username}**, dur bakalım orada!\n\n` +
      `Ben sadece **Klan Liderim Şogun'un (Sunucu Yetkilisi)** emirlerini dinler ve yapay zeka mimarımı ona sunarım.\n\n` +
      `Normal kullanıcılar için sunucu yönetim yapay zekası devre dışıdır.\n` +
      `Sen katananı kuşanıp **/zindan**'a inebilir, **/blackjack** ile şansını deneyebilir veya **/manga** okuyabilirsin!`;
    
    return kageEmbed({
      baslik,
      renk,
      aciklama,
      footer: `Kage-95 Chat Bot • Erişim Kısıtlandı`
    });
  }

  // 2. Boş veya sadece 'kage'
  if (!metin || metin === 'kage') {
    aciklama = `Selam **${user.username}**! Ben Kage Chat Bot.\n` +
      `Bir şeye ihtiyacın varsa bana soru sorabilir veya **/yardim** yazarak komutlarımı görebilirsin.`;
  }
  // 3. Selamlaşma
  else if (SELAMLAR.some(k => metin.includes(k))) {
    aciklama = `⛩️ Selam genç samuray **${user.username}**! Katananı biledin mi? Zindanlar ve kumarcı masaları seni bekliyor!`;
  }
  // 4. Hal Hatır
  else if (HAL_HATIR.some(k => metin.includes(k))) {
    aciklama = `🗡️ Kılıcım keskin, gölgem tetikte! Ben gayet iyiyim, sen nasılsın savaşçı? Bugün **[kage95.com](https://kage95.com)** üzerinden yeni bir bölüm okudun mu?`;
  }
  // 5. Kimlik
  else if (KIMLIK.some(k => metin.includes(k))) {
    aciklama = `🏮 Ben **Kage-95**!\n` +
      `**[kage95.com](https://kage95.com)** manga platformunun sadık bekçisi ve sunucunun samuray chat botuyum.\n` +
      `Sizinle sohbet eder, manga bulur, düello ve zindan oyunlarınızı yönetirim!`;
  }
  // 6. Geliştirici / Sahip
  else if (SAHIP.some(k => metin.includes(k))) {
    aciklama = `👑 Beni yüce klan liderimiz **Jagwey** kodladı ve **kage95.com** manga evreni için gölgelerden uyandırdı!`;
  }
  // 7. Manga / Webtoon
  else if (MANGA.some(k => metin.includes(k))) {
    aciklama = `📖 En güncel ve kaliteli mangalar için resmi sitemiz **[kage95.com](https://kage95.com)** seni bekliyor!\n\n` +
      `• Manga aramak için: \`/manga <isim>\`\n` +
      `• Şansına manga seçmek için: \`/rastgele-manga\`\n` +
      `• Kişisel öneri almak için: \`/oneri <tarz>\``;
  }
  // 8. Zindan & Savaş
  else if (ZINDAN.some(k => metin.includes(k))) {
    aciklama = `🏰 Zindan koridorlarında yankılanan kükremeleri duyuyor musun?\n\n` +
      `Hemen **/zindan** yazarak iblislerle interaktif turn-based savaşa katılabilir ve efsanevi eşyalar yağmalayabilirsin!\n` +
      `*(Ama dikkat et, canın biterse çantandaki eşyaları canavarlar yağmalar!)*`;
  }
  // 9. Kumar & Bahis
  else if (KUMAR.some(k => metin.includes(k))) {
    aciklama = `🎲 Şansına güveniyor musun kumarcı?\n\n` +
      `• **/blackjack [bahis]** : Krupiyeye karşı kart çek veya dur!\n` +
      `• **/slot [bahis]** : Samuray çarkını çevirip 30x büyük ikramiyeyi vur!\n` +
      `• **/yazitura [bahis]** : 50/50 anında ikiye katla!`;
  }
  // 10. Katana & Demirci
  else if (KATANA.some(k => metin.includes(k))) {
    aciklama = `⚔️ Paslı tahta kılıçla gerçek bir samuray olunmaz!\n\n` +
      `Hemen **/demirci** komutuyla katananı dövdür ve savaşlarda **+%50'ye varan zafer gücü** kazan!`;
  }
  // 11. Övgü
  else if (OVGU.some(k => metin.includes(k))) {
    aciklama = `🥋 Onur duydum, teşekkürler **${user.username}**! Kage klanı her zaman arkanda. Kılıcın keskin olsun!`;
  }
  // 12. Yardım
  else if (YARDIM.some(k => metin.includes(k))) {
    aciklama = `📜 Tüm sistemleri, oyunları ve kütüphaneyi incelemek için **/yardim** komutunu kullanabilirsin!`;
  }
  // 13. Genel / Rastgele Samuray Sözü & İpucu
  else {
    const soz = SAMURAY_SOZLERI[Math.floor(Math.random() * SAMURAY_SOZLERI.length)];
    aciklama = `${soz}\n\n*Bana bir şeyler sorabilir veya \`/yardim\` ile tüm yeteneklerimi görebilirsin.*`;
  }

  return kageEmbed({
    baslik,
    renk,
    aciklama,
    footer: `Kage-95 Chat Bot • kage95.com`
  });
}
