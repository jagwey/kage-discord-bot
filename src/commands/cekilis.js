import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import {
  MAKS_ODUL, MIN_DK, MAKS_DK, cekilisOlustur, mesajBagla, cekilisGetir, katilimDegistir,
  erkenBitir, aktifCekilisler, sonucuDuyur
} from '../services/cekilisServisi.js';

export const butonOnek = 'kage_cekilis:';

export const data = new SlashCommandBuilder()
  .setName('cekilis')
  .setDescription('Çekiliş düzenle (yönetici).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('baslat').setDescription('Yeni çekiliş başlat.')
    .addStringOption(o => o.setName('odul').setDescription('Ödül').setRequired(true).setMaxLength(MAKS_ODUL))
    .addIntegerOption(o => o.setName('dakika').setDescription(`Süre, dakika (${MIN_DK} - ${MAKS_DK})`)
      .setRequired(true).setMinValue(MIN_DK).setMaxValue(MAKS_DK))
    .addIntegerOption(o => o.setName('kazanan').setDescription('Kazanan sayısı (1 - 10)').setMinValue(1).setMaxValue(10)))
  .addSubcommand(s => s.setName('bitir').setDescription('Çekilişi hemen bitir ve kazananı seç.')
    .addStringOption(o => o.setName('id').setDescription('Çekiliş kodu').setRequired(true)))
  .addSubcommand(s => s.setName('liste').setDescription('Aktif çekilişleri göster.'));

export function cekilisEmbed(c) {
  return kageEmbed({
    baslik: `🎁 ÇEKİLİŞ • ${c.odul}`,
    renk: TEMA.RENKLER.ALTIN,
    aciklama: 'Katılmak için aşağıdaki butona bas. Tekrar basarsan ayrılırsın.\n\n' +
      `⏳ Bitiş: <t:${Math.floor(c.bitis / 1000)}:R>\n🏆 Kazanan sayısı: **${c.kazananSayisi}**\n` +
      `👥 Katılımcı: **${c.katilimcilar.length}**`,
    altMetin: `Kod: ${c.id}`
  });
}

function butonSatiri(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}${id}`).setLabel('Katıl / Ayrıl').setEmoji('🎉').setStyle(ButtonStyle.Success)
  );
}

export async function execute(interaction) {
  const alt = interaction.options.getSubcommand();

  if (alt === 'baslat') {
    const sonuc = cekilisOlustur({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      odul: interaction.options.getString('odul'),
      dakika: interaction.options.getInteger('dakika'),
      kazananSayisi: interaction.options.getInteger('kazanan') || 1,
      olusturanId: interaction.user.id
    });
    if (!sonuc.basarili) return interaction.reply({ content: `❌ ${sonuc.hata}`, flags: MessageFlags.Ephemeral });
    const c = sonuc.cekilis;
    const mesaj = await interaction.reply({
      embeds: [cekilisEmbed(c)], components: [butonSatiri(c.id)], fetchReply: true
    });
    mesajBagla(c.id, mesaj.id);
    return;
  }

  if (alt === 'bitir') {
    const c = erkenBitir(interaction.options.getString('id').trim(), interaction.guildId);
    if (!c) return interaction.reply({ content: '❌ Bu kodla aktif bir çekiliş yok.', flags: MessageFlags.Ephemeral });
    await sonucuDuyur(interaction.client, c);
    return interaction.reply({ content: '✅ Çekiliş bitirildi.', flags: MessageFlags.Ephemeral });
  }

  const liste = aktifCekilisler(interaction.guildId);
  if (!liste.length) return interaction.reply({ content: 'Aktif çekiliş yok.', flags: MessageFlags.Ephemeral });
  return interaction.reply({
    content: liste.map(c => `\`${c.id}\` • **${c.odul}** • <t:${Math.floor(c.bitis / 1000)}:R> • 👥 ${c.katilimcilar.length}`).join('\n'),
    flags: MessageFlags.Ephemeral
  });
}

export async function buton(interaction) {
  const id = interaction.customId.slice(butonOnek.length);
  const sonuc = katilimDegistir(id, interaction.user.id);
  if (sonuc.durum === 'yok' || sonuc.durum === 'bitti') {
    return interaction.reply({ content: '⌛ Bu çekiliş bitti.', flags: MessageFlags.Ephemeral });
  }
  const c = cekilisGetir(id);
  await interaction.update({ embeds: [cekilisEmbed(c)], components: [butonSatiri(id)] }).catch(() => null);
  return interaction.followUp({
    content: sonuc.durum === 'katildi' ? '🎉 Çekilişe katıldın!' : '👋 Çekilişten ayrıldın.',
    flags: MessageFlags.Ephemeral
  }).catch(() => null);
}
