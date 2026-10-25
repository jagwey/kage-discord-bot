import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('sunucu-bilgi')
  .setDescription('Sunucunun üye sayısı, kuruluş tarihi, boost ve kanal istatistiklerini görüntüler.');

export async function execute(interaction) {
  const guild = interaction.guild;
  const owner = await guild.fetchOwner();

  const kurulusTarihi = Math.floor(guild.createdTimestamp / 1000);
  const toplamUye = guild.memberCount;
  const metinKanali = guild.channels.cache.filter(c => c.isTextBased()).size;
  const sesKanali = guild.channels.cache.filter(c => c.isVoiceBased()).size;
  const rolSayisi = guild.roles.cache.size;
  const boostSeviyesi = guild.premiumTier;
  const boostSayisi = guild.premiumSubscriptionCount || 0;

  const embed = kageEmbed({
    baslik: `KALE STATÜSÜ • ${guild.name}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 kalesinin yapısal durumu ve savunma hattı bilgileri:`,
    thumbnail: guild.iconURL({ dynamic: true, size: 256 }) || TEMA.URLS.LOGOTYPE,
    alanlar: [
      { name: '👑 Kale Efendisi (Sahip)', value: `${owner} (\`${owner.user.tag}\`)`, inline: true },
      { name: '📅 Kuruluş Tarihi', value: `<t:${kurulusTarihi}:D> (<t:${kurulusTarihi}:R>)`, inline: true },
      { name: '👥 Samuray Ordusu (Üyeler)', value: `**${toplamUye}** savaşçı`, inline: true },
      { name: '📜 Kanallar', value: `💬 ${metinKanali} Metin • 🔊 ${sesKanali} Ses`, inline: true },
      { name: '🎖️ Roller', value: `**${rolSayisi}** adet rol`, inline: true },
      { name: '💎 Takviye (Boost)', value: `Seviye ${boostSeviyesi} (${boostSayisi} Boost)`, inline: true }
    ]
  });

  return interaction.reply({ embeds: [embed] });
}
