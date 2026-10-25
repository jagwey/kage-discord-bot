import { Events } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { aiDanis } from '../services/aiServisi.js';
import { sunucuAyarGetir } from '../services/veritabaniServisi.js';
import { yardimKartiOlustur } from '../commands/yardim.js';

export const name = Events.MessageCreate;

/**
 * Mesaj oluşturulduğunda tetiklenir (Metin komutları, Jagwey özel vezir ve Kage-95 topluluk chatbotu)
 * @param {import('discord.js').Message} message
 */
export async function execute(message) {
  // Botları ve DM'leri yoksay
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const contentLower = content.toLowerCase();

  // 1. Klasik metin tabanlı yardım komutları: !help, .help, ./help, !yardim
  if (['!help', '.help', './help', '!yardim', '.yardim', 'k!help'].includes(contentLower)) {
    const { embed, row } = yardimKartiOlustur();
    return message.reply({ embeds: [embed], components: [row] }).catch(() => null);
  }

  // 2. Sahip / Efendi kontrolü (Jagwey kimlik doğrulaması)
  const isSahip = (
    message.author.id === '682974587625275420' ||
    message.author.id === message.guild.ownerId ||
    message.author.username.toLowerCase() === 'jagwey'
  );

  const botUser = message.client.user;
  const ayarlar = sunucuAyarGetir(message.guild.id);
  const aiKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;

  // 3. Tetiklenme kontrolleri
  // A) Bot direkt etiketlendi mi? (@Kage ...)
  const botEtiketlendi = message.mentions.has(botUser) && !message.mentions.everyone;

  // B) Özel AI kanalında mı yazıldı?
  const buKanalAiKanali = aiKanalId && message.channel.id === aiKanalId;

  // C) Mesaj "kage" veya "kage95" ile mi başlıyor? (kage selam, Kage-95 oyun ne zaman, !kage vb.)
  const kageOnEkRegex = /^(?:!|\.|\/)?kage(?:-?95)?(?:\s*[:,!?-]?\s*|$)/i;
  const kageOnEkiVar = kageOnEkRegex.test(content);

  // Hiçbir tetikleyiciye uymuyorsa sessiz kal
  if (!botEtiketlendi && !buKanalAiKanali && !kageOnEkiVar) {
    return;
  }

  // 4. Talimat metnini temizle
  let talimat = content;

  // Bot etiketini temizle
  if (botEtiketlendi) {
    talimat = talimat.replace(new RegExp(`<@!?${botUser.id}>`, 'g'), '').trim();
  }

  // Kage ön ekini temizle
  if (kageOnEkiVar) {
    talimat = talimat.replace(kageOnEkRegex, '').trim();
  }

  const kullaniciAdi = message.member?.displayName || message.author.displayName || message.author.username;

  // Kullanıcı sadece "kage" yazdıysa selamlama ver
  if (!talimat) {
    if (isSahip) {
      const selamEmbed = kageEmbed({
        baslik: 'GÖLGE VEZİRİ • Kage-95',
        renk: TEMA.RENKLER.KAN_KIRMIZISI,
        aciklama: `*Işıklar kısılır, katananın metali karanlıkta parıldar.* 🗡️\n\n**Huzurunuzdayım Efendim Jagwey.** Gölgeniz ve kılıcınız emrinizdedir. Bir buyruğunuz veya kurgulayacağımız bir plan mı var?`,
        altMetin: "Kage-95 • Efendim Jagwey'in Emrindeyim"
      });
      return message.reply({ embeds: [selamEmbed], allowedMentions: { repliedUser: false } }).catch(() => null);
    } else {
      const selamEmbed = kageEmbed({
        baslik: 'KAGE-95 • Gölge Muhafızı',
        renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
        aciklama: `⛩️ Gölgeler arasından selamlar, **${kullaniciAdi}**!\n\nBen **Kage-95**. Kage manga evreni (https://kage95.com), Jagwey'in yakında çıkacak cyberpunk samuray oyunu veya bu sunucu hakkında sormak istediğin bir şey varsa yaz, dinliyorum!`,
        altMetin: `Kage-95 Chatbot • ${kullaniciAdi}`
      });
      return message.reply({ embeds: [selamEmbed], allowedMentions: { repliedUser: true } }).catch(() => null);
    }
  }

  // 5. Yazıyor... göstergesini gönder
  await message.channel.sendTyping().catch(() => null);

  try {
    const { cevap, saglayici } = await aiDanis(talimat, {
      isSahip,
      kullaniciAdi,
      kanalAdi: message.channel.name
    });

    // Discord embed açıklama sınırı 4096 karakterdir
    const formatliCevap = cevap.length > 4000 ? cevap.slice(0, 3990) + '...\n*(Metin sınırı aşıldı)*' : cevap;

    const embed = kageEmbed({
      baslik: isSahip ? `GÖLGE VEZİRİ • ${saglayici}` : `KAGE-95 • ${saglayici}`,
      renk: isSahip ? TEMA.RENKLER.KAN_KIRMIZISI : TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: formatliCevap,
      altMetin: isSahip
        ? "Kage-95 • Efendim Jagwey'in Emrindeyim"
        : `Kage-95 • Yanıtlanan: ${kullaniciAdi}`
    });

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: true }
    });
  } catch (err) {
    console.error('[MessageCreate AI] Hata:', err.message);
    const hataMetni = isSahip
      ? `⚠️ Efendim Jagwey, zihinsel bağlantımda kısa bir aksaklık yaşandı: ${err.message}`
      : `⚠️ Bağlantı hatası: Kage-95 şu anda gölgelerin ardında dinleniyor, lütfen birazdan tekrar dene.`;

    await message.reply({
      content: hataMetni,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }
}
