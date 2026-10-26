import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGuncelle } from './veritabaniServisi.js';
import { akilliAiUret } from './aiRouterServisi.js';

const P = PermissionFlagsBits;
const SEBEP = 'Kage 95 Master Mimarisi';
const SITE = () => process.env.SITE_URL || 'https://kage95.com';

const OKU = [P.ViewChannel, P.ReadMessageHistory];
const YAZ = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory];

const RENK = { MOR: 0x7c4dff, SARI: 0xf9a825 };

/**
 * Eşleştirme anahtarı: küçük harf, aksansız, yalnız harf ve rakam. Emoji, çerçeve karakterleri,
 * boşluk ve tireler düştüğü için "⛩️ GİRİŞ & BİLGİ" ile "╭━━━ ⛩️ GİRİŞ & BİLGİ ━━━╮" aynı anahtarı üretir.
 */
export function anahtarla(metin = '') {
  return String(metin)
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Ad anahtarı takma adlardan biriyle başlıyorsa eşleşir ("Genin Savaşçısı Lv.5+" gibi sonekler dahil). */
function adEslesir(ad, takmaAdlar) {
  const a = anahtarla(ad);
  return takmaAdlar.some(t => a === t || a.startsWith(t));
}

// ───────────────────────── PLAN ─────────────────────────

/**
 * Komut görünürlüğü Discord'un varsayılan üye izinleriyle belirlenir (her komutun setDefaultMemberPermissions değeri).
 * Rollere verilen izinler aşağıdaki listeyle birebir uyumludur; yeni bir moderatör komutu eklenirse önce rol izni kontrol edilmeli.
 */
const YETKI_REHBERI =
  '**👤 Shinobi / herkes**\n' +
  '`/yardim` `/profil` `/seviye` `/bakiye` `/gunluk` `/gorev` `/ode` `/liderlik` `/market` `/envanter` `/demirci`\n' +
  '`/duello` `/zindan` `/boss` `/kule` `/dojo` `/balik` `/klan` `/yoldas` `/kehanet` `/blackjack` `/slot` `/yazitura`\n' +
  '`/manga` `/rastgele-manga` `/oneri` `/ciz` `/sticker` `/ton` `/hatirlatici` `/kayit` `/yeniden-kayit`\n\n' +
  '**🛡️ Hatamoto (Muhafız / Moderatör)**\n' +
  '`/timeout` `/untimeout` (susturma) • `/kick` • `/uyari` • `/sil` (toplu mesaj silme)\n' +
  '`/kilit` `/yavasmod` (kanal) • `/otomod` (spam, link ve küfür filtresi) • `/anket`\n' +
  'Ayrıca: ses odasında susturma ve taşıma, takma ad değiştirme, denetim kaydını görme.\n\n' +
  '**🗡️ Daimyo (Yönetim)**\n' +
  'Hatamoto yetkilerine ek: `/ban` `/unban` • `/rol` • `/duyuru` (@everyone) • `/cekilis` • `/ticket panel`\n' +
  '`/karsilama` • `/ekonomi-log` • `/ai` • `/duyuru-test` • `/sticker-yukle` • `/egit` ve `/hafiza` yönetimi\n' +
  '`/kayit @üye` ve `/yeniden-kayit @üye` (başkasını kaydetme) • `/kayit-otomasyonu` • sunucu ve kanal ayarları.\n\n' +
  '**👑 Kage (Şogun / Sahip)**\n' +
  'Yönetici yetkisi. Yalnız bunlar: `/sunucu-kur` `/sunucu-sifirla` `/ayarlar` `/ai-durum` `/kayit-paneli`.\n\n' +
  '*Mute = `/timeout`. Spam koruması `/otomod` ile açılır. Yetkiyi rolden ver; komut listesinde göremeyen kişi yetkisizdir.*';

const ROLLER = [
  { k: 'kage', ara: ['Kage (Şogun)'], name: '👑 Kage (Şogun)', color: 0xe53935, hoist: true, permissions: [P.Administrator] },
  { k: 'daimyo', ara: ['Daimyo'], name: '🗡️ Daimyo (Yönetim)', color: 0xb71c1c, hoist: true,
    permissions: [P.ManageGuild, P.ManageChannels, P.ManageRoles, P.BanMembers, P.KickMembers, P.ManageMessages, P.ModerateMembers,
      P.MentionEveryone, P.ManageGuildExpressions, P.ManageNicknames, P.ManageThreads, P.ViewAuditLog, P.MuteMembers, P.MoveMembers] },
  { k: 'hatamoto', ara: ['Hatamoto'], name: '🛡️ Hatamoto (Muhafız)', color: 0xd32f2f, hoist: true,
    permissions: [P.ManageMessages, P.KickMembers, P.ModerateMembers, P.ManageChannels, P.ManageNicknames, P.ManageThreads,
      P.ViewAuditLog, P.MuteMembers, P.MoveMembers] },
  { k: 'bot', ara: ['Bot & Muhafızlar'], name: '🤖 Bot & Muhafızlar', color: 0x78909c, hoist: true },
  { k: 'efsane', ara: ['Kage Efsanesi'], name: '👑 Kage Efsanesi', color: 0xffd700, hoist: true },
  { k: 'jonin', ara: ['Jonin Komutanı'], name: '⚔️ Jonin Komutanı', color: 0xff7043, hoist: true },
  { k: 'chunin', ara: ['Chunin Kıdemlisi'], name: '⛩️ Chunin Kıdemlisi', color: 0x42a5f5, hoist: true },
  { k: 'genin', ara: ['Genin Savaşçısı'], name: '📜 Genin Savaşçısı', color: 0x66bb6a, hoist: true },
  { k: 'kunoichi', ara: ['Gölge Kunoichisi', 'Kunoichi'], name: '🌸 Gölge Kunoichisi', color: 0xff66b2, hoist: true, mentionable: true },
  { k: 'samuray', ara: ['Gölge Samurayı'], name: '🗡️ Gölge Samurayı', color: 0x5c6bc0, hoist: true, mentionable: true },
  { k: 'shinobi', ara: ['Shinobi'], name: '⚔️ Shinobi (Kayıtlı Üye)', color: 0xe0e0e0, hoist: true },
  { k: 'mangaOkuru', ara: ['Manga Okuru'], name: '📖 Manga Okuru', color: 0xff5252, mentionable: true },
  { k: 'oyuncu', ara: ['Gölge Oyuncusu'], name: '🎮 Gölge Oyuncusu', color: 0x7c4dff, mentionable: true },
  { k: 'ronin', ara: ['Ronin'], name: '📜 Ronin (Kayıtsız)', color: 0x424242 }
];

/**
 * izin: kategori için izin kümesi adı (kanallar varsayılan olarak kategoriyi miras alır).
 * Kanal alanları: k (ayar anahtarı), ad (görünen ad), ara (eşleşme takma adları), topic, izin (kanala özel),
 * mesaj [başlık, açıklama, renk], ozel (özel tanıtım türü).
 */
const KATEGORILER = [
  { ad: '⛩️ GİRİŞ & BİLGİ', izin: 'giris', kanallar: [
    { k: 'kayit', ad: '🚪・kayıt-kapısı', ara: ['kayıt-kapısı'], izin: 'kayitKapisi', ozel: 'kayit',
      topic: 'Mührünü bas, Shinobi ol. Butona tıkla ve kaydını tamamla.' },
    { k: 'kurallar', ad: '📜・kadim-kurallar', ara: ['kadim-kurallar'], ozel: 'kurallar',
      topic: 'Kale kanunları. Katılan herkes bunlara uymuş sayılır.' },
    { k: 'duyuru', ad: '📢・kage-duyuru', ara: ['kage-duyuru'], izin: 'duyuru',
      topic: 'Resmi duyurular, etkinlikler ve çekilişler.',
      mesaj: ['KAGE DUYURULARI', 'Resmi duyurular, etkinlikler ve çekilişler burada yayınlanır. Bildirimleri açık tut.'] },
    { k: 'manga', ad: '📖・manga-yayınları', ara: ['manga-yayınları'],
      topic: 'Yeni manga ve bölüm bildirimleri otomatik burada. Bildirim için Manga Okuru rolünü al.',
      mesaj: ['MANGA YAYINLARI', 'Yeni seriler ve bölümler kage95.com\'dan otomatik buraya düşer. Anında haber için **Manga Okuru** rolünü al.'] },
    { k: 'platform', ad: '🌐・kage95-canlı-platform', ara: ['kage95-canlı-platform', 'kage95'], ozel: 'platform',
      topic: 'kage95.com modern manga okuma platformu, hızlı okuma motoru ve klan özellikleri.' },
    { k: 'hosgeldin', ad: '🌸・yeni-savaşçılar', ara: ['yeni-savaşçılar'],
      topic: 'Kaleye yeni katılan savaşçılar karşılanır.',
      mesaj: ['YENİ SAVAŞÇILAR', 'Kaydını tamamlayan her savaşçı burada karşılanır. Hoş geldin demeyi unutma.'] },
    { k: 'dev', ad: '🛠️・kage-dev', ara: ['kage-dev'],
      topic: 'Kage bot güncelleme notları ve geliştirici günlüğü.',
      mesaj: ['KAGE DEV', 'Bot güncelleme notları ve sistem raporları burada yayınlanır.', TEMA.RENKLER.BILGI] }
  ] },
  { ad: '💬 GÖLGE TOPLULUĞU', izin: 'uye', kanallar: [
    { k: 'sohbet', ad: '💬・meydan-sohbeti', ara: ['meydan-sohbeti'],
      topic: 'Genel sohbet. Konuştukça XP kazanır, seviye atladıkça Ryo alırsın.',
      mesaj: ['MEYDAN SOHBETİ', 'Kalenin meydanına hoş geldin. Konuş, tanış, eğlen. Her mesaj XP kazandırır; seviye atladıkça Ryo ödülün gelir.', TEMA.RENKLER.BILGI] },
    { k: 'tartisma', ad: '🗡️・manga-tartışma', ara: ['manga-tartışma'],
      topic: 'Manga tartışması. Yeni bölümlerde spoiler etiketini (||metin||) kullan.',
      mesaj: ['MANGA TARTIŞMA', 'Seriler, teoriler ve bölüm yorumları burada. Spoiler için ||metin|| kullan.', TEMA.RENKLER.BILGI] },
    { k: 'spoiler', ad: '⚠️・spoiler-odası', ara: ['spoiler-odası'],
      topic: 'En son çıkan bölümler, teoriler ve serbest spoiler tartışma alanı.',
      mesaj: ['SPOILER VE TEORİ ODASI', 'Güncel manga bölümleri, sızıntılar ve gelecek bölüm teorileri bu kanalda serbestçe konuşulabilir. Spoiler yemek istemeyenlerin dikkatine!', RENK.SARI] },
    { k: 'anime', ad: '🎌・anime-dünyası', ara: ['anime-dünyası'], topic: 'Anime önerileri ve sezon sohbeti.' },
    { k: 'panel', ad: '🎨・manga-panelleri', ara: ['manga-panelleri'], topic: 'Favori panelleri, fan art ve çizimleri paylaş.' },
    { k: 'botKomut', ad: '🤖・bot-komut', ara: ['bot-komut'],
      topic: 'Bot komutları buraya. Başlamak için /yardim yaz.',
      mesaj: ['BOT KOMUTLARI', 'Tüm komutlar için `/yardim` yaz. Oyun ve ekonomi komutlarını sohbeti kalabalıklaştırmadan burada dene. Günlük görevlerin için `/gorev`.', TEMA.RENKLER.BILGI] }
  ] },
  { ad: '⚔️ ARENA & RYO BAHİS', izin: 'uye', kanallar: [
    { k: 'duello', ad: '⚔️・samuray-düellosu', ara: ['samuray-düellosu'],
      topic: 'Düello: /duello @rakip [bahis] veya /duello @Kage-95 mini-boss.',
      mesaj: ['SAMURAY DÜELLOSU', '`/duello @rakip [bahis]` ile meydan oku. Bota meydan okumak için `/duello rakip:@Kage-95` yaz!\nKatana seviyen hasarını artırır, gücünü `/demirci` ile yükselt.', TEMA.RENKLER.ALTIN] },
    { k: 'klan', ad: '🚩・klan-sancakları', ara: ['klan-sancakları'],
      topic: 'Klan kur, katıl, kasaya bağış yap ve klan liderliğinde yarış.',
      mesaj: ['KLAN VE LONCA MECLİSİ', 'Kendi klanını kurmak için: `/klan kur <isim>` (2.500 Ryo)\nBir klana katılmak için: `/klan katil <isim>`\nKlan kasasına bağış: `/klan bagis <miktar>`\nSıralama: `/klan liderlik`', TEMA.RENKLER.ALTIN] },
    { k: 'yoldas', ad: '🐾・yoldaş-barınağı', ara: ['yoldaş-barınağı'],
      topic: 'Zindanlarda sana eşlik eden gölge yoldaşını seç ve besle.',
      mesaj: ['GÖLGE YOLDAŞI BARINAĞI', '`/yoldas sec` ile yoldaşını seç:\n• 🐺 **Gölge Kurdu**: +%15 Kritik Hasar şansı\n• 🦊 **Alev Tilkisi**: +%20 Ek Ryo kazanımı\n• 🦅 **Mistik Kuzgun**: %15 Kaçınma Manevrası\n• 🐉 **Yeşim Ejderi**: %20 Zırh Kalkanı\nYoldaşını `/yoldas besle` ile besleyerek seviye atlat.', TEMA.RENKLER.ALTIN] },
    { k: 'kumar', ad: '🎲・kumar-ve-zar', ara: ['kumar-ve-zar'],
      topic: 'Blackjack, slot ve yazı tura. Bahsini bil, şansını dene.',
      mesaj: ['KUMAR VE ZAR', '`/blackjack` • `/slot` • `/yazitura`\nUnutma: kasa uzun vadede kazanır. Cüzdanını `/bakiye` ile kontrol et.', TEMA.RENKLER.ALTIN] },
    { k: 'zindan', ad: '🏰・zindan-seferleri', ara: ['zindan-seferleri'],
      topic: 'Zindan: /zindan sefer. Rütbe aç, kalıntı topla, seri bonusu kazan.',
      mesaj: ['ZİNDAN SEFERLERİ', '`/zindan sefer` ile İblis zindanına in. Zaferle D→S rütbesini aç, kalıntı topla, serini koru.\n`/zindan profil` ve `/zindan siralama` ile durumuna bak.', TEMA.RENKLER.ALTIN] },
    { k: 'balik', ad: '🎣・sessiz-göl', ara: ['sessiz-göl'],
      topic: 'Balık tut: /balik. Nadir balıkları yakala, koleksiyonu tamamla.',
      mesaj: ['SESSİZ GÖL', '`/balik` ile olta at. 9 balık türü, ilk keşif bonusu ve çanta satışı var. Oltanı geliştirdikçe nadir balık şansın artar.', TEMA.RENKLER.ALTIN] },
    { k: 'boss', ad: '🐉・boss-arenası', ara: ['boss-arenası'],
      topic: 'Sunucu ortak bossu: /boss. Saatte bir saldır, ganimet hasar payına göre bölünür.',
      mesaj: ['BOSS ARENASI', '`/boss` ile ortak dünya bossuna saatte bir saldır. Boss ölünce ödül havuzu hasar payına göre dağıtılır, son vuruşa %20 ek.\n48 saatte öldürülmezse kaçar.', TEMA.RENKLER.ALTIN] },
    { k: 'kule', ad: '🗼・gölge-kulesi', ara: ['gölge-kulesi'],
      topic: 'Gölge Kulesi: /kule. Günde 3 hak, kat kat tırman, ölmeden ödülü çek.',
      mesaj: ['GÖLGE KULESİ', '`/kule` ile tırman. Günde 3 hak, her 5. katta boss. Kat sonunda 3 güçlenmeden birini seç.\nÖlürsen birikmiş ödülün %50\'sini alırsın, çekilirsen tamamını.', TEMA.RENKLER.ALTIN] },
    { k: 'dojo', ad: '🏯・dojo-kurulu', ara: ['dojo-kurulu', 'dojo'],
      topic: 'Kendi dojonu kur: /dojo. Sen yokken saat başı Ryo üretir.',
      mesaj: ['DOJO KURULU', '`/dojo` ile dojonu kur ve yükselt. Saat başı Ryo üretir, 12 saate kadar depolar. Düzenli uğra ve topla.', TEMA.RENKLER.ALTIN] },
    { k: 'cekilis', ad: '🎉・çekiliş-salonu', ara: ['çekiliş-salonu', 'çekiliş'],
      topic: 'Çekilişler burada. Butona bas, katıl.',
      mesaj: ['ÇEKİLİŞ SALONU', 'Yetkililer `/cekilis baslat` ile çekiliş açar. Butona basarak katıl, kazanan otomatik seçilir.', TEMA.RENKLER.ALTIN] },
    { k: 'seviye', ad: '📈・seviye-duyuru', ara: ['seviye-duyuru'],
      topic: 'Seviye atlayanlar ve Ryo ödülleri.',
      mesaj: ['SEVİYE DUYURUSU', 'Sohbet ettikçe XP kazanırsın (dakikada bir sayılır). Seviye atlayınca `seviye × 50 Ryo` ödül gelir.\n`/seviye bak` ve `/seviye siralama` ile ilerlemene bak.', TEMA.RENKLER.ALTIN] },
    { k: 'devlog', ad: '🎮・kage-oyun-devlog', ara: ['kage-oyun-devlog'], topic: 'Kage indie oyununun geliştirme günlüğü.' }
  ] },
  { ad: '🔮 YAPAY ZEKA MABEDİ', izin: 'uye', kanallar: [
    { k: 'ai', ad: '🔮・gölge-veziri-ai', ara: ['gölge-veziri'], ozel: 'ai',
      topic: 'Gölge Veziri ile sohbet et. Etiketlemeye gerek yok.' },
    { k: 'cizim', ad: '🎨・ai-görsel-atölyesi', ara: ['ai-görsel-atölyesi'],
      topic: 'Yapay zeka ile dilediğin sahneyi veya anime karakterini çizdir: /ciz <tarif>.',
      mesaj: ['YAPAY ZEKA ÇİZİM ATÖLYESİ', 'Dilediğin sahneyi veya anime karakterini ücretsiz yapay zekaya çizdirebilirsin.\n\n`/ciz tarif:beyaz saçlı katanalı samuray stil:anime oran:kare`\n\n🌸 **Stiller:** Anime, Feodal Samuray, Piksel Sanat, Siberpunk, Gerçekçi, Fantastik\n📱 **Formatlar:** 1:1 Kare, 9:16 Dikey, 16:9 Yatay', TEMA.RENKLER.ALTIN] },
    { k: 'kehanet', ad: '📜・samuray-kehaneti', ara: ['samuray-kehaneti'],
      topic: 'Günlük samuray falını ve şansını öğren: /kehanet.',
      mesaj: ['KADİM SAMURAY KEHANETİ', 'Günlük kaderini, şans oranını ve bilge tavsiyeni öğrenmek için:\n\n`/kehanet`\n\nHer gün yenilenir; şanslı günlerde cüzdanına sürpriz Ryo bahşişi düşebilir.', RENK.MOR] }
  ] },
  { ad: '🔒 ŞOGUN KALESİ', izin: 'yonetim', kanallar: [
    { k: 'meclis', ad: '🔒・şogun-meclisi', ara: ['şogun-meclisi'], topic: 'Yetkili sohbeti.',
      mesaj: ['YETKİ REHBERİ • KİM NEYİ KULLANIR', YETKI_REHBERI, TEMA.RENKLER.ALTIN] },
    { k: 'modLog', ad: '📜・ceza-sicil-log', ara: ['ceza-sicil-log'], topic: 'Ban, kick, timeout, uyarı ve otomod kayıtları.',
      mesaj: ['CEZA SİCİLİ', 'Ban, kick, timeout, uyarı ve otomod kayıtları buraya düşer.'] },
    { k: 'kayitLog', ad: '📝・kayıt-log', ara: ['kayıt-log', 'kayıt-mühür-log'], topic: 'Kayıt işlemlerinin kaydı.' },
    { k: 'ekoLog', ad: '💰・ekonomi-log', ara: ['ekonomi-log'], topic: 'Ryo hareketleri. Detay için /ekonomi-log.',
      mesaj: ['EKONOMİ KAYDI', 'Ryo hareketleri için `/ekonomi-log [üye] [adet]` komutunu kullan.', TEMA.RENKLER.ALTIN] },
    { k: 'biletLog', ad: '🎫・bilet-log', ara: ['bilet-log'], topic: 'Kapanan destek biletlerinin kaydı.' }
  ] },
  { ad: '🎫 DESTEK', izin: 'destek', kanallar: [
    { k: 'destek', ad: '🎫・destek-bileti', ara: ['destek-bileti'], ozel: 'destek',
      topic: 'Sorun, şikayet veya öneri için bilet aç.' }
  ] }
];

const SES_KATEGORI = '🔊 SAMURAY SES ODALARI';
const SES_KANALLARI = [
  { ad: '⛩️ Klan Meclisi #1' },
  { ad: '⛩️ Klan Meclisi #2' },
  { ad: '📖 Sessiz Manga Okuma' },
  { ad: '🎮 Kage Oyun Odası' },
  { ad: '👑 Şogun Özel Odası', izin: 'ustYonetim' }
];

// ───────────────────────── ARAMA ─────────────────────────

function kanalAra(guild, takmaAdlar, tip) {
  const t = takmaAdlar.map(anahtarla);
  return guild.channels.cache
    .filter(c => c.type === tip && adEslesir(c.name, t))
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0) || a.createdTimestamp - b.createdTimestamp)
    .map(c => c);
}

function rolAra(guild, takmaAdlar) {
  const t = takmaAdlar.map(anahtarla);
  return guild.roles.cache.filter(r => !r.managed && r.id !== guild.id && adEslesir(r.name, t))
    .sort((a, b) => b.position - a.position).map(r => r);
}

/** Kurulum öncesi durumu çıkarır: eksikler, mevcutlar ve kopyalar. Hiçbir şey değiştirmez. */
export async function sunucuDurumunuCikar(guild) {
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  const rapor = { rolYeni: [], rolVar: [], kanalYeni: [], kanalVar: [], kopyalar: [] };

  for (const r of ROLLER) {
    const bulunan = rolAra(guild, r.ara);
    (bulunan.length ? rapor.rolVar : rapor.rolYeni).push(r.name);
    bulunan.slice(1).forEach(x => rapor.kopyalar.push({ tur: 'rol', ad: x.name, id: x.id }));
  }
  const kontrol = (ad, ara, tip) => {
    const bulunan = kanalAra(guild, ara, tip);
    (bulunan.length ? rapor.kanalVar : rapor.kanalYeni).push(ad);
    bulunan.slice(1).forEach(x => rapor.kopyalar.push({ tur: 'kanal', ad: x.name, id: x.id }));
  };
  for (const kat of KATEGORILER) {
    kontrol(kat.ad, [kat.ad], ChannelType.GuildCategory);
    for (const k of kat.kanallar) kontrol(k.ad, k.ara, ChannelType.GuildText);
  }
  kontrol(SES_KATEGORI, [SES_KATEGORI], ChannelType.GuildCategory);
  for (const s of SES_KANALLARI) kontrol(s.ad, [s.ad], ChannelType.GuildVoice);
  return rapor;
}

// ───────────────────────── TEMİZLİK (sıfırlama) ─────────────────────────

/**
 * Sunucudaki tüm eski kanalları siler (Tam temizlik)
 * @param {import('discord.js').Guild} guild
 * @param {string} haricKanalId
 */
export async function eskiKanallariTemizle(guild, haricKanalId = null) {
  const kanallar = await guild.channels.fetch();
  for (const [id, kanal] of kanallar) {
    if (id === haricKanalId) continue;
    try {
      await kanal.delete('Kage 95 Mimarisi Sıfırlama');
    } catch (err) {
      console.warn(`[Kanal Silme Hatası] ${kanal?.name}:`, err.message);
    }
  }
}

/**
 * Sunucudaki eski silinebilir rolleri temizler
 * @param {import('discord.js').Guild} guild
 */
export async function eskiRolleriTemizle(guild) {
  const roller = await guild.roles.fetch();
  const botMember = await guild.members.fetchMe();
  const botTopRole = botMember.roles.highest;

  for (const [, rol] of roller) {
    if (rol.name === '@everyone' || rol.managed || rol.comparePositionTo(botTopRole) >= 0) continue;
    try {
      await rol.delete('Kage 95 Rol Sıfırlama');
    } catch (err) {
      console.warn(`[Rol Silme Hatası] ${rol?.name}:`, err.message);
    }
  }
}

// ───────────────────────── AI METİNLERİ ─────────────────────────

const VARSAYILAN_KURALLAR = [
  ['Onur ve Saygı', 'Üyelere hakaret, küfür, aşağılama ve nefret söylemi yasaktır.'],
  ['Gölgelerde Gizlilik (Spoiler)', 'Yeni bölümleri konuşurken spoiler etiketi kullan: ||metin||.'],
  ['Reklam ve Taciz Yasağı', 'İzinsiz davet, reklam ve özelden rahatsızlık yasaktır.'],
  ['Adil Oyun', 'Ryo sömürüsü, bug istismarı ve çoklu hesap yasaktır; ekonomi kayıtları denetlenir.'],
  ['Yetkililere İtaat', 'Daimyo ve Hatamoto kararları nihaidir. İtiraz için bilet aç.']
];

/**
 * Yapay zekadan sunucu temasına uygun kurallar ve karşılama metni ister. Başarısız ya da geçersizse
 * null döner; kurulum statik metinlerle devam eder.
 */
async function yapayZekaMetinleri(guild, tema, userId) {
  try {
    const { metin } = await akilliAiUret({
      gorevTipi: 'derin',
      userId,
      system: 'Sen Kage, bilge ve adil bir samuray ruhlu Discord topluluk yöneticisisin. Yalnızca geçerli JSON döndür, başka metin yazma. ' +
        'Aile, din, dil ve ırk hakkında aşağılayıcı hiçbir şey yazma.',
      prompt: `"${guild.name}" adlı Discord sunucusu için tema: "${tema}". Sunucu bir manga okuma sitesiyle (kage95.com), Ryo ekonomili RPG oyunlarıyla ve yapay zeka botuyla bağlantılı.\n` +
        'Şu JSON biçiminde Türkçe üret: {"kurallar":[{"baslik":"...","metin":"..."}],"karsilama":"..."}\n' +
        'Kurallar: tam 5 madde, her başlık en çok 40, her metin en çok 160 karakter. Spoiler, saygı, reklam, adil oyun ve yetkili kararı konularını kapsasın. ' +
        'Karşılama: en çok 300 karakter, temaya uygun, sıcak ve kısa.'
    });
    const ham = metin.match(/\{[\s\S]*\}/)?.[0];
    if (!ham) return null;
    const j = JSON.parse(ham);
    const kurallar = (j.kurallar || [])
      .filter(r => r && typeof r.baslik === 'string' && typeof r.metin === 'string' && r.baslik.length <= 60 && r.metin.length <= 220)
      .slice(0, 8)
      .map(r => [r.baslik.trim(), r.metin.trim()]);
    if (kurallar.length < 3) return null;
    const karsilama = typeof j.karsilama === 'string' && j.karsilama.length <= 400 ? j.karsilama.trim() : null;
    return { kurallar, karsilama };
  } catch (err) {
    console.warn('[Mimari] AI metni üretilemedi, varsayılan kullanılıyor:', err.message);
    return null;
  }
}

// ───────────────────────── İNŞA ─────────────────────────

function tanitim(baslik, aciklama, renk = TEMA.RENKLER.KAN_KIRMIZISI) {
  return { embeds: [kageEmbed({ baslik, renk, aciklama })] };
}

/** Kanalda bot daha önce mesaj yazdıysa tanıtımı tekrarlama. Okunamıyorsa da yazma. */
async function tanitimGerekli(kanal, botId) {
  try {
    const mesajlar = await kanal.messages.fetch({ limit: 15 });
    return !mesajlar.some(m => m.author.id === botId);
  } catch {
    return false;
  }
}

async function kanalYakala(guild, ara, ayar, tip, rapor, kopyaSil) {
  const bulunan = kanalAra(guild, ara, tip);
  const [ilk, ...kopyalar] = bulunan;
  for (const k of kopyalar) {
    if (kopyaSil) {
      await k.delete('Kage 95 kopya kanal temizliği').catch(() => {});
      rapor.silinenKopya.push(k.name);
    } else {
      rapor.kopyalar.push(k.name);
    }
  }
  if (ilk) return { kanal: ilk, yeni: false };
  const kanal = await guild.channels.create({ ...ayar, type: tip, reason: SEBEP });
  return { kanal, yeni: true };
}

/**
 * Kage 95 sunucu mimarisini kurar. Tekrar çalıştırılabilir (idempotent): roller ve kanallar aksansız,
 * emojisiz ad anahtarıyla bulunur, eksikler eklenir, yanlış yerdeki kanallar taşınır, konular ve
 * izinler güncellenir, tanıtım mesajı yalnızca botun hiç yazmadığı kanala gönderilir.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').CommandInteraction|{user:object}|null} interaction
 * @param {{tema?: string, kopyaSil?: boolean}} secenekler
 */
export async function kageMimarisiInsaEt(guild, interaction = null, secenekler = {}) {
  const { tema = '', kopyaSil = false } = secenekler;
  const everyone = guild.roles.everyone;
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  const botMember = await guild.members.fetchMe();
  const kurucuId = interaction?.user?.id || interaction?.author?.id;

  const rapor = {
    rolYeni: [], rolVar: [], kanalYeni: [], kanalVar: [], tasinan: [], kopyalar: [], silinenKopya: [],
    mesaj: [], ai: false, uyarilar: []
  };

  const ai = tema ? await yapayZekaMetinleri(guild, tema, kurucuId || 'sunucu-kur') : null;
  rapor.ai = Boolean(ai);

  // 1. ROLLER
  const roller = {};
  for (const r of ROLLER) {
    const { ara, k, ...ayar } = r;
    const bulunan = rolAra(guild, ara);
    bulunan.slice(1).forEach(x => rapor.kopyalar.push(x.name));
    if (bulunan.length) {
      roller[k] = bulunan[0];
      rapor.rolVar.push(roller[k].name);
    } else {
      roller[k] = await guild.roles.create({ ...ayar, reason: SEBEP });
      rapor.rolYeni.push(roller[k].name);
    }
  }

  // Hiyerarşi: botun en yüksek rolünün hemen altına, ROLLER sırasıyla
  try {
    const tavan = botMember.roles.highest.position;
    await guild.roles.setPositions(ROLLER.map((r, i) => ({ role: roller[r.k].id, position: Math.max(1, tavan - 1 - i) })));
  } catch (err) {
    rapor.uyarilar.push(`Rol sıralaması ayarlanamadı: ${err.message}. Botun rolünü listenin en üstüne taşı ve komutu tekrar çalıştır.`);
  }

  if (kurucuId) {
    await guild.members.fetch(kurucuId).then(m => m.roles.add(roller.kage)).catch(() => {});
  }
  await botMember.roles.add(roller.bot).catch(() => {});

  // 2. İZİN KÜMELERİ. Yetkililer ve bot, kilitli kategorileri de görebilsin diye her kümede açıkça izinlidir.
  const yetkili = [roller.kage, roller.daimyo, roller.hatamoto, roller.bot].map(r => ({ id: r.id, allow: YAZ }));
  const botKendi = { id: botMember.id, allow: [...YAZ, P.EmbedLinks, P.AttachFiles, P.ManageChannels] };
  const sadeceOkuma = { id: everyone.id, allow: OKU, deny: [P.SendMessages] };
  const izinler = {
    giris: [sadeceOkuma, ...yetkili, botKendi],
    kayitKapisi: [sadeceOkuma, { id: roller.shinobi.id, deny: [P.ViewChannel] }, ...yetkili, botKendi],
    duyuru: [sadeceOkuma, ...yetkili, botKendi],
    uye: [{ id: everyone.id, deny: [P.ViewChannel] }, { id: roller.shinobi.id, allow: YAZ }, ...yetkili, botKendi],
    yonetim: [{ id: everyone.id, deny: [P.ViewChannel] }, ...yetkili.slice(0, 3), botKendi],
    destek: [sadeceOkuma, ...yetkili, botKendi],
    ses: [{ id: everyone.id, deny: [P.ViewChannel] },
      { id: roller.shinobi.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
      ...yetkili.map(y => ({ id: y.id, allow: [P.ViewChannel, P.Connect, P.Speak] })), botKendi],
    ustYonetim: [{ id: everyone.id, deny: [P.ViewChannel, P.Connect] },
      { id: roller.daimyo.id, allow: [P.ViewChannel, P.Connect] },
      { id: roller.kage.id, allow: [P.ViewChannel, P.Connect] }, botKendi]
  };
  // Duyuru kanalında yalnız yönetim yazar
  izinler.duyuru = [sadeceOkuma,
    { id: roller.kage.id, allow: YAZ }, { id: roller.daimyo.id, allow: YAZ },
    { id: roller.hatamoto.id, allow: OKU }, { id: roller.bot.id, allow: YAZ }, botKendi];

  const kanallar = {};
  const yeniKanallar = [];

  // 3. KATEGORİLER VE KANALLAR
  const kategoriKur = async (ad, izin) => {
    const { kanal, yeni } = await kanalYakala(guild, [ad], {
      name: `╭━━━ ${ad} ━━━╮`, permissionOverwrites: izinler[izin]
    }, ChannelType.GuildCategory, rapor, kopyaSil);
    (yeni ? rapor.kanalYeni : rapor.kanalVar).push(ad);
    if (!yeni) await kanal.permissionOverwrites.set(izinler[izin], SEBEP).catch(() => {});
    return kanal;
  };

  for (const kat of KATEGORILER) {
    const katKanal = await kategoriKur(kat.ad, kat.izin);
    for (const k of kat.kanallar) {
      const kendiIzin = k.izin ? izinler[k.izin] : null;
      const { kanal, yeni } = await kanalYakala(guild, k.ara, {
        name: k.ad, parent: katKanal.id, topic: k.topic,
        ...(kendiIzin ? { permissionOverwrites: kendiIzin } : {})
      }, ChannelType.GuildText, rapor, kopyaSil);
      if (yeni) {
        rapor.kanalYeni.push(k.ad);
        yeniKanallar.push(kanal);
      } else {
        rapor.kanalVar.push(k.ad);
        const guncel = {};
        if (kanal.parentId !== katKanal.id) { guncel.parent = katKanal.id; rapor.tasinan.push(kanal.name); }
        if (k.topic && kanal.topic !== k.topic) guncel.topic = k.topic;
        if (Object.keys(guncel).length) await kanal.edit({ ...guncel, reason: SEBEP }).catch(() => {});
        if (kendiIzin) await kanal.permissionOverwrites.set(kendiIzin, SEBEP).catch(() => {});
        else if (kanal.permissionsLocked === false) await kanal.lockPermissions().catch(() => {});
      }
      kanallar[k.k] = kanal;
    }
  }

  const katSes = await kategoriKur(SES_KATEGORI, 'ses');
  for (const s of SES_KANALLARI) {
    const { kanal, yeni } = await kanalYakala(guild, [s.ad], {
      name: s.ad, parent: katSes.id, ...(s.izin ? { permissionOverwrites: izinler[s.izin] } : {})
    }, ChannelType.GuildVoice, rapor, kopyaSil);
    (yeni ? rapor.kanalYeni : rapor.kanalVar).push(s.ad);
    if (!yeni) {
      if (kanal.parentId !== katSes.id) await kanal.setParent(katSes.id, { lockPermissions: !s.izin, reason: SEBEP }).catch(() => {});
      if (s.izin) await kanal.permissionOverwrites.set(izinler[s.izin], SEBEP).catch(() => {});
    }
  }

  // 4. SİSTEM AYARLARI. Diğer servisler kanalları bu kimliklerden bulur.
  sunucuAyarGuncelle(guild.id, {
    modLogKanalId: kanallar.modLog.id,
    kayitLogKanalId: kanallar.kayitLog.id,
    kayitKanalId: kanallar.kayit.id,
    kuralKanalId: kanallar.kurallar.id,
    mangaDuyuruKanalId: kanallar.manga.id,
    otoRolId: roller.ronin.id,
    hosgeldinKanalId: kanallar.hosgeldin.id,
    aiYonetimKanalId: kanallar.ai.id,
    ticketKategoriId: kanallar.meclis.parentId,
    ticketRolId: roller.hatamoto.id,
    ticketLogKanalId: kanallar.biletLog.id,
    duyuruKanalId: kanallar.duyuru.id,
    botKomutKanalId: kanallar.botKomut.id,
    // Rol kimlikleri: kayıt, duyuru ve site rol senkronu isim aramak yerine bunları kullanır.
    roninRolId: roller.ronin.id,
    shinobiRolId: roller.shinobi.id,
    mangaOkuruRolId: roller.mangaOkuru.id,
    kunoichiRolId: roller.kunoichi.id,
    samurayRolId: roller.samuray.id,
    oyuncuRolId: roller.oyuncu.id,
    geninRolId: roller.genin.id,
    chuninRolId: roller.chunin.id,
    joninRolId: roller.jonin.id,
    efsaneRolId: roller.efsane.id
  });

  // 4b. ENTEGRASYON SAĞLIK KONTROLÜ. Sorunlar rapora uyarı olarak yazılır.
  const saglik = [];
  const botEnUst = botMember.roles.highest.position;
  const ustteKalan = ['shinobi', 'ronin', 'mangaOkuru', 'kunoichi', 'samuray', 'efsane']
    .filter(r => roller[r] && roller[r].position >= botEnUst).map(r => roller[r].name);
  if (ustteKalan.length) {
    rapor.uyarilar.push(`Bot rolü şu rollerin altında, bunları veremez: ${ustteKalan.join(', ')}. Sunucu Ayarları > Roller'den bot rolünü en üste sürükle.`);
    saglik.push('❌ Bot rol sırası');
  } else saglik.push('✅ Bot rol sırası');
  const mangaYetki = kanallar.manga.permissionsFor(botMember);
  if (!mangaYetki?.has([P.ViewChannel, P.SendMessages, P.EmbedLinks])) {
    rapor.uyarilar.push('Bot manga kanalına embed gönderemiyor.');
    saglik.push('❌ Manga kanalı yetkisi');
  } else saglik.push('✅ Manga kanalı yetkisi');
  if (!roller.mangaOkuru.mentionable) await roller.mangaOkuru.setMentionable(true, SEBEP).catch(() => {});
  if (process.env.WEBHOOK_SECRET) saglik.push('✅ WEBHOOK_SECRET');
  else {
    rapor.uyarilar.push('WEBHOOK_SECRET tanımlı değil: site anlık duyuru gönderemez, yalnız 3 dakikalık tarama çalışır. Render ve site tarafına aynı değeri gir.');
    saglik.push('❌ WEBHOOK_SECRET');
  }
  saglik.push(process.env.SITE_URL ? `✅ SITE_URL (${process.env.SITE_URL})` : '⚠️ SITE_URL yok, kage95.com varsayıldı');
  try {
    const { tumMangalariGetir } = await import('./mangaServisi.js');
    const liste = await tumMangalariGetir();
    if (Array.isArray(liste) && liste.length) saglik.push(`✅ Site API (${liste.length} manga)`);
    else { saglik.push('❌ Site API boş yanıt'); rapor.uyarilar.push('Site API manga listesi döndürmedi; otomatik bölüm taraması çalışmaz.'); }
  } catch (err) {
    saglik.push('❌ Site API erişilemedi');
    rapor.uyarilar.push(`Site API hatası: ${err.message}`);
  }
  rapor.saglik = saglik;

  // 5. TANITIM MESAJLARI
  const gonder = async (kanal, yuk, ad, butonuGuncelle = null) => {
    if (!(await tanitimGerekli(kanal, botMember.id))) {
      // Eski kurulumun panelinde yeni butonlar yoksa mesaj tekrar atılmadan yerinde güncellenir.
      if (butonuGuncelle) {
        const eski = (await kanal.messages.fetch({ limit: 15 }).catch(() => null))
          ?.find(m => m.author.id === botMember.id && m.components.some(r => r.components.some(c => c.customId === butonuGuncelle)));
        if (eski) await eski.edit({ embeds: yuk.embeds, components: yuk.components }).then(() => rapor.mesaj.push(`${ad} (güncellendi)`)).catch(() => {});
      }
      return;
    }
    await kanal.send(yuk).then(() => rapor.mesaj.push(ad)).catch(err => rapor.uyarilar.push(`${ad}: ${err.message}`));
  };

  const kurallarMetni = (ai?.kurallar || VARSAYILAN_KURALLAR)
    .map(([b, m], i) => `**${i + 1}. ${b}:** ${m}`).join('\n');
  const karsilama = ai?.karsilama || 'Kage manga ve oyun kalesine hoş geldin! Kaydını tamamla, odalar açılsın.';

  for (const kat of KATEGORILER) {
    for (const k of kat.kanallar) {
      const kanal = kanallar[k.k];
      if (k.mesaj) {
        await gonder(kanal, tanitim(k.mesaj[0], k.mesaj[1], k.mesaj[2]), k.ad);
      } else if (k.ozel === 'kayit') {
        const siteButonu = new ButtonBuilder().setLabel('Kage Web Sitesi').setURL(SITE())
          .setStyle(ButtonStyle.Link).setEmoji(TEMA.EMOJILER.PARSOMEN);
        await gonder(kanal, {
          embeds: [kageEmbed({
            baslik: 'KAGE KALESİ • GİRİŞ VE KAYIT KAPISI',
            renk: TEMA.RENKLER.KAN_KIRMIZISI,
            aciklama: `${karsilama}\n\n` +
              `Kalenin iç odalarına, manga tartışmalarına, ses kanallarına, arenaya ve yapay zeka vezirine girmek için aşağıdaki butonla kaydını tamamla.\n\n` +
              `📜 **Kayıt olunca:**\n` +
              `• \`Shinobi (Kayıtlı Üye)\` rolü verilir ve kalenin kilitleri açılır.\n` +
              `• Karakter yolunu seçersin: Gölge Samurayı ya da Gölge Kunoichisi.\n` +
              `• Cüzdanına Ryo hoş geldin ödülü yatar.\n` +
              `• Sohbet ettikçe XP kazanır; Genin → Chunin → Jonin → Kage Efsanesi rütbelerine yükselirsin.\n\n` +
              `*Mührünü bas ve aramıza katıl.*`,
            footer: 'Kage Otomatik Kayıt Kapısı • kage95.com'
          })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('kage_kayit_ol_btn').setLabel('Mührü Bas & Kayıt Ol')
              .setStyle(ButtonStyle.Success).setEmoji(TEMA.EMOJILER.TORII),
            new ButtonBuilder().setCustomId('kage_profil_guncelle_btn').setLabel('Profili Yenile')
              .setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
            new ButtonBuilder().setCustomId('kage_kurallar_btn').setLabel('Kurallar')
              .setStyle(ButtonStyle.Secondary).setEmoji('📜'),
            siteButonu
          )]
        }, k.ad, 'kage_kayit_ol_btn');
      } else if (k.ozel === 'kurallar') {
        await gonder(kanal, tanitim('KALE KANUNLARI (KURALLAR)',
          `Kage kalesine adım atan her samuray bu kadim kanunlara uymakla yükümlüdür:\n\n${kurallarMetni}\n\n*Sessizce oku, derinlere in.*`), k.ad);
      } else if (k.ozel === 'platform') {
        await gonder(kanal, {
          embeds: [kageEmbed({
            baslik: 'KAGE 95 CANLI MANGA PLATFORMU • JAGTECH',
            renk: TEMA.RENKLER.KAN_KIRMIZISI,
            aciklama: `**[kage95.com](${SITE()})** platformuna hoş geldiniz!\n\n` +
              `• **Hızlı okuma:** Bekleme yok, modern okuyucu, otomatik bölüm senkronu.\n` +
              `• **Bölüm takibi:** Sitede çıkan her yeni manga ${kanallar.manga} kanalına düşer.\n` +
              `• **Topluluk ve klanlar:** Sitede okudukça Discord'da XP kazanır, rütbe atlarsın.\n\n` +
              `*Manga aramak için \`/manga <isim>\`, rastgele keşif için \`/rastgele-manga\`.*`
          })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('kage95.com Platformunu Aç').setURL(SITE()).setStyle(ButtonStyle.Link).setEmoji('🌐'),
            new ButtonBuilder().setLabel('Kage Indie Oyun Devlog').setURL(SITE()).setStyle(ButtonStyle.Link).setEmoji('🎮')
          )]
        }, k.ad);
      } else if (k.ozel === 'ai') {
        await gonder(kanal, tanitim('GÖLGE VEZİRİ HİZMETİNİZDE',
          `Selam samuraylar!\n\nBu kanalda dilediğini sorabilir, manga/anime tartışabilir veya sunucu hakkında yardım isteyebilirsin. Etiketlemene gerek yok; bu kanala yazılan her mesajı yanıtlarım.\n\n` +
          `Başka kanallarda \`kage\` diye seslenebilir ya da \`/ai\` kullanabilirsin.`), k.ad);
      } else if (k.ozel === 'destek') {
        await gonder(kanal, {
          embeds: [kageEmbed({
            baslik: 'DESTEK', renk: TEMA.RENKLER.BILGI,
            aciklama: 'Sorun, şikayet veya önerin için aşağıdaki butona bas. Sana özel, yalnız yetkililerin göreceği bir kanal açılır.'
          })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('kage_ticket:ac').setLabel('Bilet aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
          )]
        }, k.ad);
      }
    }
  }

  return {
    roller,
    kanallar,
    rapor,
    saglik,
    kayitKapisi: kanallar.kayit,
    kurallar: kanallar.kurallar,
    duyurular: kanallar.duyuru,
    mangaDuyuru: kanallar.manga,
    sohbet: kanallar.sohbet,
    aiKanal: kanallar.ai,
    modLogKanal: kanallar.modLog,
    destek: kanallar.destek,
    kayitLog: kanallar.kayitLog,
    oyunDevlog: kanallar.devlog
  };
}
