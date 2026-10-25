import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Belirtilen üyeyi sunucudan kalıcı olarak yasaklar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak üye').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Yasaklama gerekçesi').setRequired(false))
  .addIntegerOption(opt =>
    opt.setName('mesaj_silme_gunu')
      .setDescription('Kaç günlük mesaj geçmişi silinsin (0-7 gün arası)')
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false)
  );

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({ content: 'Bu komut için `Üyeleri Yasakla` yetkiniz olmalıdır.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('kullanici');
  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
  const gun = interaction.options.getInteger('mesaj_silme_gunu') || 0;

  // Bot kendisinden veya yetkili kişiden üstün birini banlayamaz
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (targetMember) {
    if (!targetMember.bannable) {
      return interaction.reply({
        content: `${TEMA.EMOJILER.KATANA} Bu üyeyi yasaklayamam. Üyenin rolü benim rolümden veya sizin rolünüzden daha yüksekte.`,
        ephemeral: true
      });
    }
  }

  await interaction.deferReply();

  try {
    await interaction.guild.bans.create(targetUser.id, {
      reason: `${interaction.user.tag}: ${sebep}`,
      deleteMessageSeconds: gun * 24 * 60 * 60
    });

    const basariEmbed = kageEmbed({
      baslik: 'KALE DIŞINA SÜRÜLDÜ (BANLANDI)',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `${TEMA.EMOJILER.KATANA} **${targetUser.tag}** kılıçtan geçirildi ve Kage 95 kalesinden ebediyen sürüldü.`,
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false },
        { name: 'Silinen Mesaj', value: `${gun} günlük`, inline: true }
      ]
    });

    // Mod loga ilet
    await modLogGonder(interaction.guild, {
      baslik: '⚖️ ÜYE YASAKLANDI (BAN)',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**${targetUser.tag}** sunucudan yasaklandı.`,
      hedefAvatar: targetUser.displayAvatarURL(),
      alanlar: [
        { name: 'Yasaklanan', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yasaklayan Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    return interaction.editReply({ embeds: [basariEmbed] });
  } catch (err) {
    console.error('[Ban Komutu] Hata:', err);
    return interaction.editReply({ content: `Yasaklama başarısız oldu: ${err.message}` });
  }
}
