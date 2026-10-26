import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType, MessageFlags } from 'discord.js';
import {
  kayitPaneliKartiOlustur,
  kayitModaliOlustur,
  kayitIsleminiTamamla,
  kullaniciKayitBilgileriniGetir
} from '../services/kayitServisi.js';
import { kageEmbed, TEMA } from '../config/tema.js';

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
      .setName('sifirla')
      .setDescription('(Yetkili) Bir üyenin kaydını sıfırlar ve Ronin (Kayıtsız) yapar.')
      .addUserOption(opt =>
        opt
          .setName('uye')
          .setDescription('Kaydı sıfırlanacak üye')
          .setRequired(true)
      )
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
      .addStringOption(opt =>
        opt
          .setName('karakter')
          .setDescription('Ruh karakteri veya usta (Örn: Zoro, Mikasa)')
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
        flags: MessageFlags.Ephemeral
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
      flags: MessageFlags.Ephemeral
    });
  }

  // 2. YENİDEN KAYIT (Kullanıcı modal açar)
  if (sub === 'yeniden-kayit') {
    const varsayilanlar = kullaniciKayitBilgileriniGetir(interaction.user.id, interaction.member);
    const modal = kayitModaliOlustur(varsayilanlar);
    return interaction.showModal(modal);
  }

  // 3. SIFIRLA (Yetkili)
  if (sub === 'sifirla') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: '⛔ Bir üyenin kaydını sıfırlamak için Rolleri Yönet yetkisi gerekir.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const hedefUser = interaction.options.getUser('uye');
    const hedefMember = await interaction.guild.members.fetch(hedefUser.id).catch(() => null);
    if (!hedefMember) {
      return interaction.editReply({ content: '❌ Hedef üye sunucuda bulunamadı.' });
    }

    const kunoichiRole = interaction.guild.roles.cache.find(r => r.name.includes('Kunoichi'));
    const samurayRole = interaction.guild.roles.cache.find(r => r.name.includes('Samurayı'));
    const shinobiRole = interaction.guild.roles.cache.find(r => r.name.includes('Shinobi'));
    const roninRole = interaction.guild.roles.cache.find(r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));

    try {
      if (kunoichiRole && hedefMember.roles.cache.has(kunoichiRole.id)) await hedefMember.roles.remove(kunoichiRole);
      if (samurayRole && hedefMember.roles.cache.has(samurayRole.id)) await hedefMember.roles.remove(samurayRole);
      if (shinobiRole && hedefMember.roles.cache.has(shinobiRole.id)) await hedefMember.roles.remove(shinobiRole);
      if (roninRole) await hedefMember.roles.add(roninRole);

      const temizIsim = hedefMember.displayName.replace(/[🌸🗡️]/g, '').trim();
      await hedefMember.setNickname(temizIsim).catch(() => {});
    } catch (err) {
      console.warn('[KayitOtomasyonu] Sıfırlama uyarısı:', err.message);
    }

    const embed = kageEmbed({
      baslik: '🔄 KAYIT MÜHRÜ SIFIRLANDI',
      renk: TEMA.RENKLER.UYARI,
      aciklama: `**${hedefMember}** kullanıcısının klan kaydı sıfırlandı ve \`Ronin (Kayıtsız)\` rolü verildi.\n\n` +
        `Kullanıcı artık kayıt panelinden veya \`/yeniden-kayit\` komutuyla baştan kayıt olabilir.`,
      altMetin: `Yetkili: ${interaction.user.tag}`
    });

    return interaction.editReply({ embeds: [embed] });
  }

  // 4. MANUEL KAYIT (Yetkili)
  if (sub === 'manuel') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: '⛔ Başka üyeyi manuel kaydetmek için Rolleri Yönet yetkisi gerekir.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply();
    const hedefUser = interaction.options.getUser('uye');
    const cinsiyet = interaction.options.getString('cinsiyet');
    const isimYas = interaction.options.getString('isim_yas') || hedefUser.username;
    const mangaTuru = interaction.options.getString('manga_turu') || 'Genel';
    const karakter = interaction.options.getString('karakter') || 'Gölge Savaşçısı';

    const hedefMember = await interaction.guild.members.fetch(hedefUser.id).catch(() => null);
    if (!hedefMember) {
      return interaction.editReply({ content: '❌ Hedef üye sunucuda bulunamadı.' });
    }

    const { embed, files, row } = await kayitIsleminiTamamla(interaction, {
      hedefUye: hedefMember,
      isimYas,
      cinsiyet,
      mangaTuru,
      karakter,
      yemin: 'Yetkili tarafından tescil edildi.'
    });

    return interaction.editReply({
      embeds: [embed],
      files,
      components: row ? [row] : []
    });
  }
}
