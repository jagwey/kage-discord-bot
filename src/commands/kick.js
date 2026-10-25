import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Belirtilen üyeyi sunucudan atar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak üye').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Atılma gerekçesi').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({ content: 'Bu komut için `Üyeleri At` yetkiniz olmalıdır.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('kullanici');
  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'Bu üye sunucuda bulunamadı.', ephemeral: true });
  }

  if (!member.kickable) {
    return interaction.reply({
      content: `${TEMA.EMOJILER.KATANA} Bu üyeyi atamam. Rol hiyerarşisi nedeniyle yetkim yetersiz.`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    await member.kick(`${interaction.user.tag}: ${sebep}`);

    const embed = kageEmbed({
      baslik: 'KALEDEN UZAKLAŞTIRILDI (KICK)',
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `${TEMA.EMOJILER.KATANA} **${targetUser.tag}** sunucudan atıldı.`,
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    await modLogGonder(interaction.guild, {
      baslik: '👞 ÜYE ATILDI (KICK)',
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `**${targetUser.tag}** sunucudan atıldı.`,
      hedefAvatar: targetUser.displayAvatarURL(),
      alanlar: [
        { name: 'Atılan', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ content: `Üye atılamadı: ${err.message}` });
  }
}
