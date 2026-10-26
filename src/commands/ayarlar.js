import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGetir, sunucuAyarGuncelle } from '../services/veritabaniServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ayarlar')
  .setDescription('Kage 95 botunun sunucu yönetim ve kanal ayarlarını yapılandırır.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('goruntule')
      .setDescription('Mevcut sunucu ayarlarını listeler.')
  )
  .addSubcommand(sub =>
    sub.setName('mod-log')
      .setDescription('Moderasyon ve denetim kayıtlarının iletileceği kanalı belirler.')
      .addChannelOption(opt => opt.setName('kanal').setDescription('Mod-log kanalı').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('oto-rol')
      .setDescription('Sunucuya yeni katılanlara otomatik verilecek rolü belirler.')
      .addRoleOption(opt => opt.setName('rol').setDescription('Otomatik rol (örn. Gölge Genin)').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('hosgeldin')
      .setDescription('Yeni üyelerin karşılanacağı hoş geldin kanalını belirler.')
      .addChannelOption(opt => opt.setName('kanal').setDescription('Hoş geldin kanalı').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('ai-kanal')
      .setDescription('Yapay zeka gölge danışmanının serbestçe yanıtlayacağı admin kanalını belirler.')
      .addChannelOption(opt => opt.setName('kanal').setDescription('Admin AI kanalı').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('ai-rol')
      .setDescription('Yapay zeka özelliklerini (sohbet/çizim/danışma) kullanabilecek özel rolü belirler.')
      .addRoleOption(opt => opt.setName('rol').setDescription('AI erişim rolü (seçilmezse kısıtlama rolü kaldırılır)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('ai-mod')
      .setDescription('Yapay zeka erişim ve güvenlik modunu ayarlar.')
      .addStringOption(opt =>
        opt.setName('mod')
          .setDescription('Erişim seviyesi')
          .setRequired(true)
          .addChoices(
            { name: '🎭 Sadece Belirlenen Rol (Önerilen)', value: 'sadece_rol' },
            { name: '🛡️ Sadece Yöneticiler', value: 'sadece_yonetici' },
            { name: '🌐 Herkese Açık', value: 'herkese_acik' }
          )
      )
  );

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Bu komut için `Yönetici (Administrator)` yetkiniz olmalıdır.', flags: MessageFlags.Ephemeral });
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'goruntule') {
    const ayarlar = sunucuAyarGetir(guildId);
    const modAciklamasi = {
      sadece_rol: '🎭 Sadece Belirlenen Rol',
      sadece_yonetici: '🛡️ Sadece Yöneticiler',
      herkese_acik: '🌐 Herkese Açık'
    }[ayarlar.aiMod || 'sadece_rol'] || '🎭 Sadece Belirlenen Rol';

    const embed = kageEmbed({
      baslik: 'KAGE 95 KALE YAPILANDIRMASI',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `Bu sunucu için aktif Kage 95 bot ayarları aşağıda listelenmiştir:\n\n` +
        `📜 **Mod-Log Kanalı:** ${ayarlar.modLogKanalId ? `<#${ayarlar.modLogKanalId}>` : '`Ayarlanmamış`'}\n` +
        `⛩️ **Oto-Rol:** ${ayarlar.otoRolId ? `<@&${ayarlar.otoRolId}>` : '`Ayarlanmamış`'}\n` +
        `🏮 **Hoş Geldin Kanalı:** ${ayarlar.hosgeldinKanalId ? `<#${ayarlar.hosgeldinKanalId}>` : '`Ayarlanmamış`'}\n` +
        `🧠 **Admin AI Kanalı:** ${ayarlar.aiYonetimKanalId ? `<#${ayarlar.aiYonetimKanalId}>` : '`Ayarlanmamış`'}\n` +
        `🎭 **AI Erişim Rolü:** ${ayarlar.aiRolId ? `<@&${ayarlar.aiRolId}>` : '`Belirlenmemiş`'}\n` +
        `🔒 **AI Güvenlik Modu:** \`${modAciklamasi}\`\n` +
        `📢 **Yeni Bölüm Kanalı:** ${process.env.ANNOUNCEMENT_CHANNEL_ID ? `<#${process.env.ANNOUNCEMENT_CHANNEL_ID}>` : '`Ayarlanmamış`'}`
    });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'mod-log') {
    const kanal = interaction.options.getChannel('kanal');
    sunucuAyarGuncelle(guildId, { modLogKanalId: kanal.id });
    return interaction.reply({ content: `✅ Mod-log denetim kanalı başarıyla ${kanal} olarak ayarlandı.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'oto-rol') {
    const rol = interaction.options.getRole('rol');
    sunucuAyarGuncelle(guildId, { otoRolId: rol.id });
    return interaction.reply({ content: `✅ Otomatik verilecek yeni üye rolü **${rol.name}** olarak ayarlandı.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'hosgeldin') {
    const kanal = interaction.options.getChannel('kanal');
    sunucuAyarGuncelle(guildId, { hosgeldinKanalId: kanal.id });
    return interaction.reply({ content: `✅ Karşılama kanalı başarıyla ${kanal} olarak ayarlandı.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'ai-kanal') {
    const kanal = interaction.options.getChannel('kanal');
    sunucuAyarGuncelle(guildId, { aiYonetimKanalId: kanal.id });
    return interaction.reply({ content: `✅ Yönetici AI sohbet kanalı ${kanal} olarak ayarlandı. Bu kanalda bota yazılan her şeye AI yanıt verecektir.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'ai-rol') {
    const rol = interaction.options.getRole('rol');
    if (!rol) {
      sunucuAyarGuncelle(guildId, { aiRolId: null });
      return interaction.reply({ content: `✅ Yapay zeka erişim rolü sıfırlandı. Artık rol şartı aranmayacak.`, flags: MessageFlags.Ephemeral });
    }
    sunucuAyarGuncelle(guildId, { aiRolId: rol.id });
    return interaction.reply({ content: `✅ Yapay zeka özelliklerini kullanabilecek özel rol **${rol.name}** olarak ayarlandı. Bu role sahip olmayanlar AI motorunu çalıştıramaz.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'ai-mod') {
    const mod = interaction.options.getString('mod');
    sunucuAyarGuncelle(guildId, { aiMod: mod });
    const aciklama = {
      sadece_rol: '🎭 Sadece Belirlenen Rol (ve Yöneticiler)',
      sadece_yonetici: '🛡️ Sadece Sunucu Yöneticileri',
      herkese_acik: '🌐 Herkese Açık (Spam Korumalı)'
    }[mod] || mod;
    return interaction.reply({ content: `✅ Yapay zeka erişim modu **${aciklama}** olarak güncellendi.`, flags: MessageFlags.Ephemeral });
  }
}
