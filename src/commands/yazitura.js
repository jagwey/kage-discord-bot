import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, ryoEkle, ryoDus, MAKS_BAHIS } from '../services/ekonomiServisi.js';
import { bekle, ryoYaz } from '../config/oyunGorsel.js';

export const data = new SlashCommandBuilder()
  .setName('yazitura')
  .setDescription('Gölge Madeni Parası: yazı mı tura mı? Doğru tahmin bahsi ikiye katlar.')
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription(`Ortaya koymak istediğiniz Ryo miktarı (10 - ${MAKS_BAHIS})`)
      .setRequired(true)
      .setMinValue(10)
      .setMaxValue(MAKS_BAHIS)
  )
  .addStringOption(opt =>
    opt.setName('secim')
      .setDescription('Tahmininiz')
      .setRequired(true)
      .addChoices(
        { name: '🌸 Yazı', value: 'yazi' },
        { name: '🐉 Tura', value: 'tura' }
      )
  );

export const butonOnek = 'kage_yt:';
const ETIKET = { yazi: '🌸 Yazı', tura: '🐉 Tura' };
const KARE = ['🪙', '⚪', '🪙', '⚫'];
const mesgul = new Set();

const butonlar = (userId, bahis, kapali = false) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}at:${userId}:${bahis}:yazi`).setLabel(`Yazı (${bahis})`).setEmoji('🌸')
      .setStyle(ButtonStyle.Primary).setDisabled(kapali),
    new ButtonBuilder().setCustomId(`${butonOnek}at:${userId}:${bahis}:tura`).setLabel(`Tura (${bahis})`).setEmoji('🐉')
      .setStyle(ButtonStyle.Danger).setDisabled(kapali),
    new ButtonBuilder().setCustomId(`${butonOnek}at:${userId}:${bahis * 2}:${Math.random() < 0.5 ? 'yazi' : 'tura'}`).setLabel(`Rastgele 2× (${bahis * 2})`).setEmoji('🎲')
      .setStyle(ButtonStyle.Secondary).setDisabled(kapali || bahis * 2 > MAKS_BAHIS)
  );

const ekran = (baslik, renk, aciklama, altMetin) => ({ embeds: [kageEmbed({ baslik, renk, aciklama, altMetin })] });

/** Bir atış yapar. Bahis önceden düşülmüş olmalı. */
async function at(userId, bahis, secim, duzenle) {
  for (let i = 1; i < KARE.length; i++) {
    await duzenle({
      ...ekran('🪙 GÖLGE MADENİ PARASI', TEMA.RENKLER.GOLGE_KIRMIZISI,
        `Tahminin: **${ETIKET[secim]}**

${KARE[i]} Para havada${'.'.repeat(i)}`, `Bahis: ${ryoYaz(bahis)}`),
      components: [butonlar(userId, bahis, true)]
    });
    await bekle(600);
  }

  const sonuc = Math.random() < 0.5 ? 'yazi' : 'tura';
  const kazandi = sonuc === secim;
  if (kazandi) ryoEkle(userId, bahis * 2, 'yazıtura ödeme');
  const bakiye = bakiyeGetir(userId).ryo;

  await duzenle({
    ...ekran(kazandi ? '🏆 DOĞRU TAHMİN!' : '💀 YANLIŞ TAHMİN', kazandi ? TEMA.RENKLER.BASARI : TEMA.RENKLER.HATA,
      `Tahminin: **${ETIKET[secim]}** • Gelen: **${ETIKET[sonuc]}**

` +
      (kazandi ? `**+${ryoYaz(bahis)}** kazandın!` : `**-${ryoYaz(bahis)}** kaybettin.`) +
      `
🪙 Bakiye: **${ryoYaz(bakiye)}**`,
      bakiye >= bahis ? 'Yeni tahminini butonla seç' : 'Bakiyen bir sonraki atış için yetersiz'),
    components: bakiye >= bahis ? [butonlar(userId, bahis)] : []
  });
}

async function oyna(userId, bahis, secim, duzenle) {
  if (mesgul.has(userId)) return;
  mesgul.add(userId);
  try {
    await at(userId, bahis, secim, duzenle);
  } catch (err) {
    console.error('[YaziTura] Atış hatası:', err.message);
  } finally {
    mesgul.delete(userId);
  }
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bahis = interaction.options.getInteger('bahis');
  const secim = interaction.options.getString('secim');

  const mevcut = bakiyeGetir(userId).ryo;
  if (mevcut < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanında **${ryoYaz(mevcut)}** var, gereken bahis: **${ryoYaz(bahis)}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
  if (!ryoDus(userId, bahis, 'yazıtura bahis')) {
    return interaction.reply({ content: '❌ Bahis düşülemedi, bakiye değişmiş olabilir.', flags: MessageFlags.Ephemeral });
  }

  const yanit = await interaction.reply({
    ...ekran('🪙 GÖLGE MADENİ PARASI', TEMA.RENKLER.GOLGE_KIRMIZISI,
      `Tahminin: **${ETIKET[secim]}**

${KARE[0]} Para havada…`, `Bahis: ${ryoYaz(bahis)}`),
    withResponse: true
  });
  const mesaj = yanit.resource?.message ?? yanit;
  await oyna(userId, bahis, secim, p => mesaj.edit(p));
}

export async function buton(interaction) {
  const [, sahip, bahisMetni, secim] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: '⛔ Bu para senin değil. Kendi `/yazitura` oyununu başlat.', flags: MessageFlags.Ephemeral });
  }
  const bahis = Math.min(MAKS_BAHIS, Math.max(10, Number(bahisMetni) || 10));
  if (mesgul.has(sahip)) return interaction.deferUpdate();
  if (!ETIKET[secim] || !ryoDus(sahip, bahis, 'yazıtura bahis')) {
    return interaction.reply({ content: `❌ Yetersiz bakiye. Bu atış için **${ryoYaz(bahis)}** gerekir.`, flags: MessageFlags.Ephemeral });
  }
  await interaction.deferUpdate();
  await oyna(sahip, bahis, secim, p => interaction.message.edit(p));
}
