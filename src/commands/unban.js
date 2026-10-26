import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('Yasaklanmış bir kullanıcının yasağını kaldırır.')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addStringOption(opt => opt.setName('kullanici_id').setDescription('Yasağı kaldırılacak kişinin Discord ID numarası').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Yasak kaldırma gerekçesi').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({ content: 'Bu komut için `Üyeleri Yasakla` yetkiniz olmalıdır.', flags: MessageFlags.Ephemeral });
  }

  const userId = interaction.options.getString('kullanici_id').trim();
  const sebep = interaction.options.getString('sebep') || 'Yasak yetkili tarafından affedildi.';

  await interaction.deferReply();

  try {
    const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!banInfo) {
      return interaction.editReply({ content: `\`${userId}\` ID numarasına sahip yasaklı bir üye bulunamadı.` });
    }

    await interaction.guild.bans.remove(userId, `${interaction.user.tag}: ${sebep}`);

    const embed = kageEmbed({
      baslik: 'SÜRGÜN KALDIRILDI (UNBAN)',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `${TEMA.EMOJILER.TORII} **${banInfo.user.tag}** kullanıcısının kaleden sürgünü kaldırıldı, gölgelere tekrar adım atabilir.`,
      alanlar: [
        { name: 'Kullanıcı', value: `${banInfo.user.tag} (\`${userId}\`)`, inline: true },
        { name: 'Affeden Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    await modLogGonder(interaction.guild, {
      baslik: '🕊️ YASAK KALDIRILDI (UNBAN)',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `**${banInfo.user.tag}** yasağı kaldırıldı.`,
      hedefAvatar: banInfo.user.displayAvatarURL(),
      alanlar: [
        { name: 'Kullanıcı', value: `${banInfo.user.tag} (\`${userId}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Unban Komutu] Hata:', err);
    return interaction.editReply({ content: `Yasak kaldırma başarısız oldu: ${err.message}` });
  }
}
