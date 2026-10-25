import { Events, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { aiDanis } from '../services/aiServisi.js';
import { chatBotYanitla } from '../services/chatBotServisi.js';
import { sunucuAyarGetir } from '../services/veritabaniServisi.js';
import { yardimKartiOlustur } from '../commands/yardim.js';

export const name = Events.MessageCreate;

// Spoiler anahtar kelimeleri
const SPOILER_IPUCLARI = [
  'öldü', 'ölüyor', 'hain çıktı', 'sonunda öldü', 'finalde', 'bölümün sonunda',
  'aslında hain', 'aslında babası', 'kurtarıyor ama ölüyor', 'kellesi kesiliyor'
];

/**
 * Mesaj oluşturulduğunda tetiklenir (Metin komutları, AI sohbeti & Kage Chat Bot)
 * @param {import('discord.js').Message} message
 */
export async function execute(message) {
  // Botları ve DM'leri yoksay
  if (message.author.bot || !message.guild) return;

  const contentLower = message.content.trim().toLowerCase();

  // 1. Akıllı Spoiler Koruması (#manga-tartışma kanalı için)
  if (message.channel.name && message.channel.name.includes('manga-tartışma')) {
    // Mesaj zaten ||spoiler|| etiketiyle kapatılmamışsa
    if (!message.content.includes('||')) {
      const spoilerMi = SPOILER_IPUCLARI.some(kelime => contentLower.includes(kelime));
      if (spoilerMi) {
        try {
          const orijinalMesaj = message.content;
          await message.delete();
          await message.channel.send({
            content: `🛡️ **[OTOMATİK SPOILER KORUMASI]** ${message.author} tarafından paylaşılan mesaj potansiyel spoiler içerdiği için korumaya alındı:\n\n||${orijinalMesaj}||`
          });
          return;
        } catch (err) {
          console.warn('[SpoilerKorumasi] Mesaj sansürlenemedi:', err.message);
        }
      }
    }
  }

  // 2. Klasik metin tabanlı yardım komutları: !help, .help, ./help, !yardim
  if (['!help', '.help', './help', '!yardim', '.yardim', 'k!help'].includes(contentLower)) {
    const { embed, row } = yardimKartiOlustur();
    return message.reply({ embeds: [embed], components: [row] }).catch(() => null);
  }

  // 3. Sohbet Ryo Kazanımı (Spam engeliyle şans eseri 1-3 Ryo)
  if (Math.random() < 0.25) {
    try {
      const { ryoEkle } = await import('../services/ekonomiServisi.js');
      ryoEkle(message.author.id, 1);
    } catch {}
  }

  const botUser = message.client.user;
  const ayarlar = sunucuAyarGetir(message.guild.id);
  const aiKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;

  // 4. Tetikleyici Kontrolleri:
  // a) "kage" ile başlama: "kage şunu yap", "kage, rol ver", "kage: nasılsın", "kage"
  const kageMatch = message.content.match(/^kage([,\s:!]+(.*)|$)/i);
  const kageIleBasliyor = !!kageMatch;

  // b) AI Kanalı (#gölge-veziri-ai)
  const buKanalAiKanali = (aiKanalId && message.channel.id === aiKanalId) || 
    message.channel.name?.includes('gölge-veziri') || 
    message.channel.name?.includes('golge-veziri') ||
    message.channel.name?.includes('ai-gölge-veziri');

  // c) Bot Etiketlendi
  const botEtiketlendi = message.mentions.has(botUser) && !message.mentions.everyone;

  if (!kageIleBasliyor && !buKanalAiKanali && !botEtiketlendi) return;

  // Talimatı ayıkla
  let talimat = '';
  if (kageIleBasliyor) {
    talimat = (kageMatch[2] || '').trim();
  } else {
    talimat = message.content.replace(new RegExp(`<@!?${botUser.id}>`, 'g'), '').trim();
  }

  // Yetkili / Şogun Kontrolü (Sunucu Sahibi, Yönetici, Bot Geliştiricisi)
  const isGuildOwner = message.guild.ownerId === message.author.id;
  const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
  const isAppOwner = message.client.application?.owner?.id === message.author.id;
  const isEnvOwner = process.env.OWNER_ID && message.author.id === process.env.OWNER_ID;
  const yetkiliMi = isGuildOwner || isAdmin || isAppOwner || isEnvOwner;

  // =========================================================================
  // NORMAL KULLANICILAR İÇİN: KAGE CHAT BOT (AI ve Sunucu Yönetimi Yok)
  // =========================================================================
  if (!yetkiliMi) {
    const chatBotEmbed = await chatBotYanitla(talimat, message.author, message.guild, message.member, message);
    return message.reply({
      embeds: [chatBotEmbed],
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }

  // =========================================================================
  // YETKİLİ / ŞOGUN İÇİN: TAM GÖLGE VEZİRİ AI & SUNUCU MİMARİSİ MOTORU
  // =========================================================================
  if (!talimat) {
    talimat = 'Emrindeyim Şogunum! Kage AI ve Gölge Veziri hazır. Sunucuda ne yapmamı istersiniz?';
  }

  // Yazıyor... durumunu gönder
  await message.channel.sendTyping();

  try {
    const { cevap, saglayici } = await aiDanis(talimat, {
      guild: message.guild,
      channel: message.channel,
      member: message.member,
      client: message.client
    });
    const formatliCevap = cevap.length > 4000 ? cevap.slice(0, 3990) + '...\n*(Metin sınırı aşıldı)*' : cevap;

    const embed = kageEmbed({
      baslik: `⛩️ GÖLGE VEZİRİ AI • Kage-95`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: formatliCevap,
      footer: `Kage-95 AI Mimar • Şogun: ${message.author.tag}`
    });

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  } catch (err) {
    console.error('[MessageCreate AI] Hata:', err.message);
    await message.reply({
      content: `❌ Gölge veziriyle iletişim kurulamadı: ${err.message}`,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }
}
