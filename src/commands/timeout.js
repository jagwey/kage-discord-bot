import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Belirtilen üyeye geçici susturma / zamanaşımı uygular.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak üye').setRequired(true))
  .addIntegerOption(opt =>
    opt.setName('sure')
      .setDescription('Susturma süresi')
      .setRequired(true)
      .addChoices(
        { name: '1 Dakika', value: 60 },
        { name: '5 Dakika', value: 300 },
        { name: '10 Dakika', value: 600 },
        { name: '1 Saat', value: 3600 },
        { name: '1 Gün (24 Saat)', value: 86400 },
        { name: '1 Hafta (7 Gün)', value: 604800 }
      )
  )
  .addStringOption(opt => opt.setName('sebep').setDescription('Susturma gerekçesi').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({ content: 'Bu komut için `Üyeleri Yönet (Moderate Members)` yetkiniz olmalıdır.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('kullanici');
  const sureSaniye = interaction.options.getInteger('sure');
  const sebep = interaction.options.getString('sebep') || 'Kural ihlali / Rahatsız edici davranış.';

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: 'Bu üye sunucuda bulunamadı.', ephemeral: true });
  }

  if (!member.moderatable) {
    return interaction.reply({
      content: `${TEMA.EMOJILER.KATANA} Bu üyeyi susturamam. Yetki sırası benim üzerimde.`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    const sureMs = sureSaniye * 1000;
    await member.timeout(sureMs, `${interaction.user.tag}: ${sebep}`);

    const bitisZamani = Math.floor((Date.now() + sureMs) / 1000);

    const embed = kageEmbed({
      baslik: 'SESİ KESİLDİ (TIMEOUT)',
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `${TEMA.EMOJILER.GOLGE} **${targetUser.tag}** gölgelerin sessizliğine mahkum edildi.`,
      alanlar: [
        { name: 'Susturulan', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Kalkış Zamanı', value: `<t:${bitisZamani}:R> (<t:${bitisZamani}:F>)`, inline: false },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    await modLogGonder(interaction.guild, {
      baslik: '🤐 ÜYE SUSTURULDU (TIMEOUT)',
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `**${targetUser.tag}** susturuldu.`,
      hedefAvatar: targetUser.displayAvatarURL(),
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Süre Bitişi', value: `<t:${bitisZamani}:R>`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ content: `Susturma uygulanamadı: ${err.message}` });
  }
}
