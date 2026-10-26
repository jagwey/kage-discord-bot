import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
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

const ETIKET = { yazi: '🌸 Yazı', tura: '🐉 Tura' };
const KARE = ['🪙', '⚪', '🪙', '⚫'];

const tekrarButonu = (kapali = false) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('yt_tekrar').setLabel('Tekrar At').setEmoji('🪙')
      .setStyle(ButtonStyle.Success).setDisabled(kapali)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bahis = interaction.options.getInteger('bahis');
  const secim = interaction.options.getString('secim');

  const mevcut = bakiyeGetir(userId).ryo;
  if (mevcut < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanında **${ryoYaz(mevcut)}** var, gereken bahis: **${ryoYaz(bahis)}**.`,
      ephemeral: true
    });
  }
  if (!ryoDus(userId, bahis, 'yazıtura bahis')) {
    return interaction.reply({ content: '❌ Bahis düşülemedi, bakiye değişmiş olabilir.', ephemeral: true });
  }

  const mesaj = await interaction.reply({
    embeds: [kageEmbed({
      baslik: '🪙 GÖLGE MADENİ PARASI',
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `Tahminin: **${ETIKET[secim]}**\n\n${KARE[0]} Para havada…`,
      altMetin: `Bahis: ${ryoYaz(bahis)}`
    })],
    fetchReply: true
  });

  let mesgul = false;

  /** Bir atış yapar. Bahis önceden düşülmüş olmalı. */
  async function at(duzenle) {
    for (let i = 1; i < KARE.length; i++) {
      await duzenle({
        embeds: [kageEmbed({
          baslik: '🪙 GÖLGE MADENİ PARASI',
          renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
          aciklama: `Tahminin: **${ETIKET[secim]}**\n\n${KARE[i]} Para havada${'.'.repeat(i)}`,
          altMetin: `Bahis: ${ryoYaz(bahis)}`
        })],
        components: [tekrarButonu(true)]
      });
      await bekle(600);
    }

    const sonuc = Math.random() < 0.5 ? 'yazi' : 'tura';
    const kazandi = sonuc === secim;
    if (kazandi) ryoEkle(userId, bahis * 2, 'yazıtura ödeme');
    const bakiye = bakiyeGetir(userId).ryo;
    const tekrarMumkun = bakiye >= bahis;

    await duzenle({
      embeds: [kageEmbed({
        baslik: kazandi ? '🏆 DOĞRU TAHMİN!' : '💀 YANLIŞ TAHMİN',
        renk: kazandi ? TEMA.RENKLER.BASARI : TEMA.RENKLER.HATA,
        aciklama:
          `Tahminin: **${ETIKET[secim]}** • Gelen: **${ETIKET[sonuc]}**\n\n` +
          (kazandi ? `**+${ryoYaz(bahis)}** kazandın!` : `**-${ryoYaz(bahis)}** kaybettin.`) +
          `\n🪙 Bakiye: **${ryoYaz(bakiye)}**`,
        altMetin: tekrarMumkun ? '45 sn içinde aynı bahisle tekrar atabilirsin' : 'Bakiyen bir sonraki atış için yetersiz'
      })],
      components: tekrarMumkun ? [tekrarButonu(false)] : []
    });
  }

  const collector = mesaj.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.customId === 'yt_tekrar',
    time: 45000
  });

  collector.on('collect', async bi => {
    if (bi.user.id !== userId) {
      return bi.reply({ content: '⛔ Bu para senin değil. Kendi `/yazitura` oyununu başlat.', ephemeral: true }).catch(() => null);
    }
    await bi.deferUpdate().catch(() => null);
    if (mesgul) return;
    mesgul = true;
    try {
      if (!ryoDus(userId, bahis, 'yazıtura bahis')) {
        await mesaj.edit({ components: [] }).catch(() => null);
        return collector.stop('bakiye');
      }
      await at(p => mesaj.edit(p));
      collector.resetTimer();
    } catch (err) {
      console.error('[YaziTura] Atış hatası:', err.message);
    } finally {
      mesgul = false;
    }
  });

  collector.on('end', () => {
    if (!mesgul) mesaj.edit({ components: [] }).catch(() => null);
  });

  mesgul = true;
  try {
    await at(p => mesaj.edit(p));
  } catch (err) {
    console.error('[YaziTura] Atış hatası:', err.message);
  } finally {
    mesgul = false;
  }
}
