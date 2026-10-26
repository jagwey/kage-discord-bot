import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { liderlikListesi } from '../services/ekonomiServisi.js';
import { ryoYaz } from '../config/oyunGorsel.js';

export const data = new SlashCommandBuilder()
  .setName('liderlik')
  .setDescription('Ryo servetine göre en zengin 10 samurayı gösterir.');

const MADALYA = ['🥇', '🥈', '🥉'];

export async function execute(interaction) {
  const liste = liderlikListesi(10).filter(l => l.toplam > 0);
  if (!liste.length) {
    return interaction.reply({ content: 'Henüz kimsenin serveti yok.', flags: MessageFlags.Ephemeral });
  }

  const satirlar = liste.map((l, i) =>
    `${MADALYA[i] || `**${i + 1}.**`} <@${l.userId}> • \`${ryoYaz(l.toplam)}\` • ⚔️ ${l.duelloZafer} zafer`
  );

  const embed = kageEmbed({
    baslik: '🏆 KAGE SERVET SIRALAMASI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: satirlar.join('\n'),
    altMetin: 'Sıralama cüzdan + banka toplamına göredir.'
  });

  return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
