import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import {
  AYLAR, dogumGunuAyarla, dogumGunuSil, dogumGunuGetir, yaklasanDogumGunleri
} from '../services/toplulukServisi.js';
import { sunucuAyarGuncelle } from '../services/veritabaniServisi.js';

export const data = new SlashCommandBuilder()
  .setName('dogum-gunu')
  .setDescription('Doğum gününü kaydet; o gün Kage seni kutlasın ve Ryo hediye etsin.')
  .addSubcommand(sub =>
    sub.setName('ayarla')
      .setDescription('Doğum gününü kaydeder (yıl sorulmaz).')
      .addIntegerOption(o => o.setName('gun').setDescription('Gün').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption(o => o.setName('ay').setDescription('Ay').setRequired(true)
        .addChoices(...AYLAR.map((ad, i) => ({ name: ad, value: i + 1 }))))
  )
  .addSubcommand(sub =>
    sub.setName('sil')
      .setDescription('Kayıtlı doğum gününü siler.')
  )
  .addSubcommand(sub =>
    sub.setName('yaklasan')
      .setDescription('Sunucuda yaklaşan doğum günlerini listeler.')
  )
  .addSubcommand(sub =>
    sub.setName('kanal')
      .setDescription('Kutlamaların yapılacağı kanalı seçer (yönetici).')
      .addChannelOption(o => o.setName('kanal').setDescription('Kutlama kanalı').setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'ayarla') {
    const gun = interaction.options.getInteger('gun');
    const ay = interaction.options.getInteger('ay');
    const sonuc = dogumGunuAyarla(interaction.user.id, gun, ay);
    if (!sonuc.basarili) return interaction.reply({ content: sonuc.hata, flags: MessageFlags.Ephemeral });
    return interaction.reply({
      content: `🎂 ${gun} ${AYLAR[ay - 1]} kaydedildi. O gün sabah kılıcını bileyip seni kutlayacağım.\n-# Kage`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === 'sil') {
    const vardi = dogumGunuSil(interaction.user.id);
    return interaction.reply({
      content: vardi ? 'doğum günün silindi.' : 'zaten kayıtlı bir doğum günün yoktu.',
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === 'yaklasan') {
    const liste = yaklasanDogumGunleri(interaction.guild, 366, 10);
    const benim = dogumGunuGetir(interaction.user.id);
    const satirlar = liste.map(d => {
      const ne = d.kalan === 0 ? '**bugün** 🎉' : d.kalan === 1 ? 'yarın' : `${d.kalan} gün sonra`;
      return `• <@${d.userId}> • ${d.gun} ${AYLAR[d.ay - 1]} • ${ne}`;
    });
    return interaction.reply({
      content: `🎂 Yaklaşan doğum günleri\n${satirlar.length ? satirlar.join('\n') : 'henüz kimse kaydetmedi.'}` +
        (benim ? '' : '\n-# sen de `/dogum-gunu ayarla` ile ekle'),
      allowedMentions: { parse: [] }
    });
  }

  if (sub === 'kanal') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'bunu sadece sunucuyu yönetenler seçebilir.', flags: MessageFlags.Ephemeral });
    }
    const kanal = interaction.options.getChannel('kanal');
    sunucuAyarGuncelle(interaction.guild.id, { dogumGunuKanalId: kanal.id });
    return interaction.reply({ content: `kutlamalar artık ${kanal} kanalında.`, flags: MessageFlags.Ephemeral });
  }
}
