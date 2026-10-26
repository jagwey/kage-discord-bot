import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sonHareketler, MIN_KAYIT_MIKTARI } from '../services/ekonomiLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ekonomi-log')
  .setDescription('Son Ryo hareketlerini göster (yönetici).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption(o => o.setName('uye').setDescription('Yalnız bu üyenin hareketleri'))
  .addIntegerOption(o => o.setName('adet').setDescription('Kaç kayıt (1-25, varsayılan 15)').setMinValue(1).setMaxValue(25));

export async function execute(interaction) {
  const uye = interaction.options.getUser('uye');
  const adet = interaction.options.getInteger('adet') || 15;
  const liste = sonHareketler(adet, uye?.id || null);
  if (!liste.length) {
    return interaction.reply({ content: 'Kayıtlı Ryo hareketi yok.', flags: MessageFlags.Ephemeral });
  }

  const satirlar = liste.map(k => {
    const isaret = k.tur === 'ekle' ? '➕' : '➖';
    const zaman = `<t:${Math.floor(k.t / 1000)}:R>`;
    const neden = k.n ? ` • ${k.n}` : '';
    return `${isaret} <@${k.u}> **${k.m}** Ryo${neden} ${zaman}`;
  });

  return interaction.reply({
    embeds: [kageEmbed({
      baslik: uye ? `EKONOMİ GÜNLÜĞÜ • ${uye.username}` : 'EKONOMİ GÜNLÜĞÜ',
      renk: TEMA.RENKLER.GOLGE_SIYAHI,
      aciklama: satirlar.join('\n'),
      altMetin: `${MIN_KAYIT_MIKTARI} Ryo altı hareketler kaydedilmez.`
    })],
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] }
  });
}
