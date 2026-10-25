import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { kayitModaliOlustur, kayitIsleminiTamamla } from '../services/kayitServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kayit')
  .setDescription('Kage kalesine interaktif veya manuel olarak kayıt olun / üye kaydedin.')
  .addUserOption(opt =>
    opt
      .setName('uye')
      .setDescription('Kayıt edilecek üye (Boş bırakırsanız kendiniz için kayıt modalı açılır)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('cinsiyet')
      .setDescription('Karakter Yolu / Cinsiyet')
      .setRequired(false)
      .addChoices(
        { name: '🌸 Kız (Gölge Kunoichisi)', value: 'Kız' },
        { name: '🗡️ Erkek (Gölge Samurayı)', value: 'Erkek' }
      )
  )
  .addStringOption(opt =>
    opt
      .setName('isim')
      .setDescription('Görünecek isim ve yaş (Örn: Kenji / 19)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const hedefUser = interaction.options.getUser('uye');
  const cinsiyet = interaction.options.getString('cinsiyet');
  const isim = interaction.options.getString('isim');

  // Eğer hiçbir parametre girilmediyse veya kullanıcı kendisi için yazdıysa doğrudan interaktif Modalı aç
  if (!hedefUser && !cinsiyet && !isim) {
    const modal = kayitModaliOlustur({
      isim: interaction.member?.displayName?.replace(/[🌸🗡️]/g, '').trim()
    });
    return interaction.showModal(modal);
  }

  // Başka bir üyeyi kaydediyorsa yetki kontrolü
  const targetUser = hedefUser || interaction.user;
  if (targetUser.id !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: '⛔ Başka bir üyeyi manuel kaydetmek için Rolleri Yönet yetkisine sahip olmalısınız.',
      ephemeral: true
    });
  }

  await interaction.deferReply();
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    return interaction.editReply({ content: '❌ Üye sunucuda bulunamadı.' });
  }

  const { embed, files } = await kayitIsleminiTamamla(interaction, {
    hedefUye: targetMember,
    isimYas: isim || targetMember.displayName,
    cinsiyet: cinsiyet || 'Erkek',
    mangaTuru: 'Genel',
    yemin: 'Kage Kalesi Onuru'
  });

  return interaction.editReply({ embeds: [embed], files });
}
