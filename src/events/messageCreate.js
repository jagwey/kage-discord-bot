import { Events, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { aiDanis } from '../services/aiServisi.js';
import { sunucuAyarGetir } from '../services/veritabaniServisi.js';

export const name = Events.MessageCreate;

/**
 * Mesaj oluşturulduğunda tetiklenir (Yetkili AI sohbeti ve etiket desteği)
 * @param {import('discord.js').Message} message
 */
export async function execute(message) {
  // Botları ve DM'leri yoksay
  if (message.author.bot || !message.guild) return;

  const botUser = message.client.user;
  const ayarlar = sunucuAyarGetir(message.guild.id);
  const aiKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;

  // 1. Bu kanal özel AI yönetim kanalı mı, yoksa bot direkt etiketlendi mi?
  const buKanalAiKanali = aiKanalId && message.channel.id === aiKanalId;
  const botEtiketlendi = message.mentions.has(botUser) && !message.mentions.everyone;

  if (!buKanalAiKanali && !botEtiketlendi) return;

  // 2. Yetki kontrolü (Sadece ManageGuild yetkisine sahip yetkililer veya yöneticiler)
  const isYetkili = message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
  if (!isYetkili) {
    if (botEtiketlendi) {
      await message.reply({
        content: `${TEMA.EMOJILER.KATANA} Gölge veziri yalnızca sunucu yöneticilerine ve klan liderlerine akıl verir.`,
        allowedMentions: { repliedUser: false }
      }).catch(() => null);
    }
    return;
  }

  // Temiz talimat metnini al
  let talimat = message.content.replace(new RegExp(`<@!?${botUser.id}>`, 'g'), '').trim();
  if (!talimat) {
    talimat = 'Merhaba gölge veziri, bana nasıl yardımcı olabilirsin?';
  }

  // Yazıyor... durumunu gönder
  await message.channel.sendTyping();

  try {
    const { cevap, saglayici } = await aiDanis(talimat);

    const formatliCevap = cevap.length > 4000 ? cevap.slice(0, 3990) + '...\n*(Metin sınırı aşıldı)*' : cevap;

    const embed = kageEmbed({
      baslik: `GÖLGE VEZİRİ • ${saglayici}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: formatliCevap,
      altMetin: `Kage 95 AI Danışmanı • Yanıtlanan: ${message.author.tag}`
    });

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  } catch (err) {
    console.error('[MessageCreate AI] Hata:', err.message);
    await message.reply({
      content: `⚠️ Gölge veziriyle iletişim kurulamadı: ${err.message}`,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }
}
