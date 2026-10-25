import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription('Susturulmuş bir üyenin susturmasını erken kaldırır.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(opt => opt.setName('kullanici').setDescription('Susturması kaldırılacak üye').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Kaldırma gerekçesi').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({ content: 'Bu komut için `Üyeleri Yönet` yetkiniz olmalıdır.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('kullanici');
  const sebep = interaction.options.getString('sebep') || 'Yetkili tarafından erkenden affedildi.';

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: 'Bu üye sunucuda bulunamadı.', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    await member.timeout(null, `${interaction.user.tag}: ${sebep}`);

    const embed = kageEmbed({
      baslik: 'SESİ GERİ VERİLDİ (UNTIMEOUT)',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `${TEMA.EMOJILER.TORII} **${targetUser.tag}** kullanıcısının susturulması kaldırıldı. Artık tekrar konuşabilir.`,
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    await modLogGonder(interaction.guild, {
      baslik: '🔊 SUSTURMA KALDIRILDI',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `**${targetUser.tag}** susturması kaldırıldı.`,
      hedefAvatar: targetUser.displayAvatarURL(),
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ content: `Susturma kaldırılamadı: ${err.message}` });
  }
}
