import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { kayitPaneliKartiOlustur, kayitModaliOlustur, kayitIsleminiTamamla } from '../services/kayitServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kayit-otomasyonu')
  .setDescription('Kage Kalesi detaylı kayıt kapısı ve yeniden kayıt otomasyonu sistemi.')
  .addSubcommand(sub =>
    sub
      .setName('panel')
      .setDescription('Seçilen veya mevcut kanala interaktif butonlu kayıt paneli kurar.')
      .addChannelOption(opt =>
        opt
          .setName('kanal')
          .setDescription('Kayıt kapısı panelinin kurulacağı metin kanalı')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('yeniden-kayit')
      .setDescription('Karakter yolunuzu, isminizi ve profilinizi güncellemek için modal açar.')
  )
  .addSubcommand(sub =>
    sub
      .setName('manuel')
      .setDescription('(Yetkili) Bir üyeyi doğrudan Samuray veya Kunoichi olarak kaydeder.')
      .addUserOption(opt =>
        opt
          .setName('uye')
          .setDescription('Kayıt edilecek üye')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('cinsiyet')
          .setDescription('Karakter Yolu / Cinsiyet')
          .setRequired(true)
          .addChoices(
            { name: '🌸 Kız (Gölge Kunoichisi)', value: 'Kız' },
            { name: '🗡️ Erkek (Gölge Samurayı)', value: 'Erkek' }
          )
      )
      .addStringOption(opt =>
        opt
          .setName('isim_yas')
          .setDescription('Görünecek Ad ve Yaş (Örn: Kenji / 19)')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt
          .setName('manga_turu')
          .setDescription('Favori manga/anime türü')
          .setRequired(false)
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  // 1. PANEL KURULUMU
  if (sub === 'panel') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '⛔ Kayıt panelini kurmak için Şogun (Yönetici) yetkisi gerekir.',
        ephemeral: true
      });
    }

    const hedefKanal = interaction.options.getChannel('kanal') || interaction.channel;
    const { embed, row } = kayitPaneliKartiOlustur();

    await hedefKanal.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `⛩️ Butonlu kayıt otomasyonu paneli başarıyla ${hedefKanal} kanalına kuruldu!`,
      ephemeral: true
    });
  }

  // 2. YENİDEN KAYIT (Kullanıcı modal açar)
  if (sub === 'yeniden-kayit') {
    const modal = kayitModaliOlustur({
      isim: interaction.member?.displayName?.replace(/[🌸🗡️]/g, '').trim()
    });
    return interaction.showModal(modal);
  }

  // 3. MANUEL KAYIT (Yetkili)
  if (sub === 'manuel') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: '⛔ Başka üyeyi manuel kaydetmek için Rolleri Yönet yetkisi gerekir.',
        ephemeral: true
      });
    }

    await interaction.deferReply();
    const hedefUser = interaction.options.getUser('uye');
    const cinsiyet = interaction.options.getString('cinsiyet');
    const isimYas = interaction.options.getString('isim_yas') || hedefUser.username;
    const mangaTuru = interaction.options.getString('manga_turu') || 'Genel';

    const hedefMember = await interaction.guild.members.fetch(hedefUser.id).catch(() => null);
    if (!hedefMember) {
      return interaction.editReply({ content: '❌ Hedef üye sunucuda bulunamadı.' });
    }

    const { embed, files } = await kayitIsleminiTamamla(interaction, {
      hedefUye: hedefMember,
      isimYas,
      cinsiyet,
      mangaTuru,
      yemin: 'Yetkili tarafından tescil edildi.'
    });

    return interaction.editReply({ embeds: [embed], files });
  }
}
