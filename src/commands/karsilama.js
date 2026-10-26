import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGetir, sunucuAyarGuncelle } from '../services/veritabaniServisi.js';

export const data = new SlashCommandBuilder()
  .setName('karsilama')
  .setDescription('Sunucunun karşılama kanalını, mesajını ve otomatik rolünü ayarla (yönetici).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('ayarla').setDescription('Karşılama ayarlarını değiştir')
    .addChannelOption(o => o.setName('kanal').setDescription('Karşılama kanalı').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addRoleOption(o => o.setName('rol').setDescription('Yeni üyeye verilecek rol'))
    .addStringOption(o => o.setName('mesaj').setDescription('Şablon: {uye} {sunucu} {sayi} kullanılabilir').setMaxLength(500)))
  .addSubcommand(s => s.setName('goster').setDescription('Mevcut karşılama ayarlarını göster'))
  .addSubcommand(s => s.setName('sifirla').setDescription('Karşılama mesajını varsayılana döndür'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'ayarla') {
    const kanal = interaction.options.getChannel('kanal');
    const rol = interaction.options.getRole('rol');
    const mesaj = interaction.options.getString('mesaj');
    if (!kanal && !rol && !mesaj) {
      return interaction.reply({ content: 'En az bir seçenek ver: kanal, rol veya mesaj.', ephemeral: true });
    }
    const yeni = {};
    if (kanal) yeni.hosgeldinKanalId = kanal.id;
    if (rol) yeni.otoRolId = rol.id;
    if (mesaj) yeni.hosgeldinMesaji = mesaj;
    sunucuAyarGuncelle(guildId, yeni);
    return interaction.reply({ content: 'Karşılama ayarları kaydedildi.', ephemeral: true });
  }

  if (sub === 'sifirla') {
    sunucuAyarGuncelle(guildId, { hosgeldinMesaji: null });
    return interaction.reply({ content: 'Karşılama mesajı varsayılana döndü.', ephemeral: true });
  }

  const a = sunucuAyarGetir(guildId);
  return interaction.reply({
    embeds: [kageEmbed({
      baslik: 'KARŞILAMA AYARLARI',
      renk: TEMA.RENKLER.BILGI,
      alanlar: [
        { name: 'Kanal', value: a.hosgeldinKanalId ? `<#${a.hosgeldinKanalId}>` : 'Otomatik (hoş-geldin / yeni-savaşçılar)', inline: true },
        { name: 'Rol', value: a.otoRolId ? `<@&${a.otoRolId}>` : 'Yok', inline: true },
        { name: 'Mesaj', value: a.hosgeldinMesaji || 'Varsayılan', inline: false }
      ]
    })],
    ephemeral: true,
    allowedMentions: { parse: [] }
  });
}
