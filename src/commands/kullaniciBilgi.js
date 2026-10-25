import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { uyarilariGetir } from '../services/veritabaniServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kullanici-bilgi')
  .setDescription('Belirtilen üyenin katılım tarihi, rolleri ve ceza sicilini gösterir.')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Bilgisi alınacak üye (boşsa kendiniz)').setRequired(false));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('kullanici') || interaction.user;
  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  const hesapKurulus = Math.floor(targetUser.createdTimestamp / 1000);
  const sunucuKatilis = member ? Math.floor(member.joinedTimestamp / 1000) : null;
  const uyarilar = uyarilariGetir(interaction.guild.id, targetUser.id);

  let rollerMetni = 'Rol yok';
  if (member) {
    const roller = member.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`);
    rollerMetni = roller.length > 0 ? (roller.length > 10 ? roller.slice(0, 10).join(' ') + ` ve ${roller.length - 10} daha...` : roller.join(' ')) : 'Rol yok';
  }

  const embed = kageEmbed({
    baslik: `SAVAŞÇI KİMLİĞİ • ${targetUser.tag}`,
    renk: member?.displayColor || TEMA.RENKLER.KAN_KIRMIZISI,
    thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
    alanlar: [
      { name: '👤 Kullanıcı', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
      { name: '🤖 Bot mu?', value: targetUser.bot ? 'Evet' : 'Hayır', inline: true },
      { name: '⚠️ Ceza Sicili', value: `${uyarilar.length} Uyarı`, inline: true },
      { name: '📆 Discord Kayıt', value: `<t:${hesapKurulus}:d> (<t:${hesapKurulus}:R>)`, inline: true },
      { name: '🏯 Kaleye Katılış', value: sunucuKatilis ? `<t:${sunucuKatilis}:d> (<t:${sunucuKatilis}:R>)` : 'Sunucuda değil', inline: true },
      { name: '🎖️ Roller', value: rollerMetni, inline: false }
    ]
  });

  return interaction.reply({ embeds: [embed] });
}
