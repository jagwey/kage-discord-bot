import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoDus, ryoEkle } from '../services/ekonomiServisi.js';
import { ryoYaz } from '../config/oyunGorsel.js';

const MIN = 10;
const MAKS = 5000;
const BEKLEME_MS = 30_000;
const sonOdeme = new Map();

export const data = new SlashCommandBuilder()
  .setName('ode')
  .setDescription('Başka bir üyeye Ryo gönderir.')
  .addUserOption(o => o.setName('alici').setDescription('Ryo alacak üye').setRequired(true))
  .addIntegerOption(o =>
    o.setName('miktar').setDescription(`Gönderilecek Ryo (${MIN} - ${MAKS})`)
      .setRequired(true).setMinValue(MIN).setMaxValue(MAKS)
  );

export async function execute(interaction) {
  const alici = interaction.options.getUser('alici');
  const miktar = interaction.options.getInteger('miktar');
  const gonderen = interaction.user;

  if (alici.bot) return interaction.reply({ content: '❌ Botlara Ryo gönderemezsin.', flags: MessageFlags.Ephemeral });
  if (alici.id === gonderen.id) return interaction.reply({ content: '❌ Kendine Ryo gönderemezsin.', flags: MessageFlags.Ephemeral });

  const kalan = (sonOdeme.get(gonderen.id) || 0) + BEKLEME_MS - Date.now();
  if (kalan > 0) {
    return interaction.reply({ content: `⏳ Yeni transfer için ${Math.ceil(kalan / 1000)} sn bekle.`, flags: MessageFlags.Ephemeral });
  }

  if (!ryoDus(gonderen.id, miktar, `Transfer -> ${alici.id}`)) {
    return interaction.reply({ content: '❌ Cüzdanında yeterli Ryo yok.', flags: MessageFlags.Ephemeral });
  }
  ryoEkle(alici.id, miktar, `Transfer <- ${gonderen.id}`);
  sonOdeme.set(gonderen.id, Date.now());

  const embed = kageEmbed({
    baslik: '💸 RYO TRANSFERİ',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `<@${gonderen.id}> ➜ <@${alici.id}>\n**${ryoYaz(miktar)}** gönderildi.`
  });
  return interaction.reply({ embeds: [embed], allowedMentions: { users: [alici.id] } });
}
