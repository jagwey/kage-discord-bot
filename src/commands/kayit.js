import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kayit')
  .setDescription('Kayıtsız bir üyeyi veya kendinizi Kage kalesine kayıt eder.')
  .addUserOption(opt =>
    opt.setName('uye')
      .setDescription('Kayıt edilecek üye (Yöneticiyseniz başkasını, değilseniz boş bırakın)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('isim')
      .setDescription('Sunucuda görünecek isim / takma ad')
      .setRequired(false)
  );

export async function execute(interaction) {
  const hedefKullanici = interaction.options.getUser('uye') || interaction.user;
  const isim = interaction.options.getString('isim');
  const guild = interaction.guild;

  const member = await guild.members.fetch(hedefKullanici.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: '❌ Üye sunucuda bulunamadı.', ephemeral: true });
  }

  // Başkasını kayıt ediyorsa yönetici / yetkili olmalı
  if (hedefKullanici.id !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: '❌ Başka bir üyeyi kayıt etmek için **Rolleri Yönet** yetkisine sahip olmalısınız.',
      ephemeral: true
    });
  }

  // Rolleri bul
  const kayitliRol = guild.roles.cache.find(r => r.name.includes('Shinobi') || r.name.includes('Kayıtlı') || r.name.includes('Üye'));
  const kayitsizRol = guild.roles.cache.find(r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));
  const mangaRol = guild.roles.cache.find(r => r.name.includes('Manga Okuru'));

  try {
    if (kayitsizRol && member.roles.cache.has(kayitsizRol.id)) {
      await member.roles.remove(kayitsizRol);
    }
    if (kayitliRol) {
      await member.roles.add(kayitliRol);
    }
    if (mangaRol) {
      await member.roles.add(mangaRol);
    }
    if (isim) {
      await member.setNickname(isim).catch(() => {});
    }

    // Hoş geldin Ryo hediyesi
    ryoEkle(member.id, 50);

    const embed = kageEmbed({
      baslik: '⛩️ KAYIT BAŞARIYLA TAMAMLANDI!',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `**${member}** klan yeminini etti ve resmi olarak Kage kalesine kabul edildi!\n\n` +
        `🛡️ **Verilen Rol:** ${kayitliRol || '`Shinobi`'}\n` +
        `📖 **Okur Rolü:** ${mangaRol || '`Manga Okuru`'}\n` +
        `🪙 **Başlangıç Bonusu:** \`+50 Ryo\` cüzdana eklendi.\n\n` +
        `Artık tüm manga, sohbet ve oyun odalarına erişebilirsiniz.`,
      thumbnail: member.user.displayAvatarURL({ dynamic: true }),
      footer: `Kayıt Yetkilisi: ${interaction.user.username}`
    });

    // Kayıt Log Kanalına Bildir
    const logKanal = guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('kayıt-log') || c.name.includes('kayit-log') || c.name.includes('mod-log')));
    if (logKanal) {
      logKanal.send({
        content: `📝 **[KAYIT]** ${member.user.tag} üyesi ${interaction.user.tag} tarafından kayıt edildi.`
      }).catch(() => {});
    }

    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    return interaction.reply({
      content: `❌ Kayıt işlemi sırasında hata: ${err.message}`,
      ephemeral: true
    });
  }
}
