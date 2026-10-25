import { Events } from 'discord.js';
import { TEMA } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const name = Events.GuildMemberRemove;

/**
 * Sunucudan bir üye ayrıldığında veya atıldığında tetiklenir
 * @param {import('discord.js').GuildMember} member
 */
export async function execute(member) {
  const guild = member.guild;
  const user = member.user;

  await modLogGonder(guild, {
    baslik: '🚪 ÜYE KALEDEN AYRILDI',
    renk: TEMA.RENKLER.BILGI,
    aciklama: `**${user.tag}** sunucudan ayrıldı. Kaledeki samuray sayısı: **${guild.memberCount}**`,
    hedefAvatar: user.displayAvatarURL(),
    alanlar: [
      { name: 'Kullanıcı', value: `${user} (\`${user.id}\`)`, inline: true },
      { name: 'Sunucudaki Süresi', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Bilinmiyor', inline: true }
    ]
  });
}
