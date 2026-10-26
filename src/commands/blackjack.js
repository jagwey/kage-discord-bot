import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, ryoEkle, ryoDus, MAKS_BAHIS } from '../services/ekonomiServisi.js';
import { bekle, ryoYaz, kartlariCiz, skorEtiketi } from '../config/oyunGorsel.js';

export const data = new SlashCommandBuilder()
  .setName('blackjack')
  .setDescription('Kage 21 Blackjack masasında krupiyeye karşı kart oynar ve Ryo kazanırsınız.')
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription(`Ortaya koymak istediğiniz Ryo miktarı (10 - ${MAKS_BAHIS})`)
      .setRequired(true)
      .setMinValue(10)
      .setMaxValue(MAKS_BAHIS)
  );

const SEMBOLLER = ['♠', '♥', '♦', '♣'];
const DEGERLER = [
  { ad: 'A', deger: 11 }, { ad: '2', deger: 2 }, { ad: '3', deger: 3 }, { ad: '4', deger: 4 },
  { ad: '5', deger: 5 }, { ad: '6', deger: 6 }, { ad: '7', deger: 7 }, { ad: '8', deger: 8 },
  { ad: '9', deger: 9 }, { ad: '10', deger: 10 }, { ad: 'J', deger: 10 }, { ad: 'Q', deger: 10 },
  { ad: 'K', deger: 10 }
];

function desteOlustur() {
  const deste = [];
  for (const sembol of SEMBOLLER) {
    for (const d of DEGERLER) deste.push({ ad: d.ad, sembol, deger: d.deger });
  }
  // Fisher-Yates karıştırma
  for (let i = deste.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deste[i], deste[j]] = [deste[j], deste[i]];
  }
  return deste;
}

function elSkoruHesapla(el) {
  let toplam = 0;
  let asSayisi = 0;
  for (const kart of el) {
    toplam += kart.deger;
    if (kart.ad === 'A') asSayisi++;
  }
  // As'ları gerekirse 11'den 1'e düşür
  while (toplam > 21 && asSayisi > 0) {
    toplam -= 10;
    asSayisi--;
  }
  return toplam;
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  let bahis = interaction.options.getInteger('bahis');
  const bakiye = bakiyeGetir(userId);

  if (bakiye.ryo < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanında **${ryoYaz(bakiye.ryo)}** var, gereken bahis: **${ryoYaz(bahis)}**.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (!ryoDus(userId, bahis, 'blackjack bahis')) {
    return interaction.reply({ content: '❌ Bahis düşülemedi, bakiye değişmiş olabilir.', flags: MessageFlags.Ephemeral });
  }

  const deste = desteOlustur();
  const oyuncuEli = [deste.pop(), deste.pop()];
  const krupiyeEli = [deste.pop(), deste.pop()];

  /**
   * Masa embed'i. `gizli` true iken krupiyenin ikinci kartı kapalıdır.
   * `durum` en üstteki kısa açıklama satırıdır.
   */
  const masaEmbed = ({ baslik, renk, durum, gizli, altMetin }) => {
    const krupiyeSkor = gizli
      ? `${elSkoruHesapla([krupiyeEli[0]])} + ?`
      : skorEtiketi(elSkoruHesapla(krupiyeEli));
    return kageEmbed({
      baslik,
      renk,
      aciklama:
        `${durum}\n\n` +
        `🤵 **Krupiye** • Skor: **${krupiyeSkor}**\n${kartlariCiz(krupiyeEli, gizli)}\n` +
        `👤 **${interaction.user.username}** • Skor: **${skorEtiketi(elSkoruHesapla(oyuncuEli))}**\n${kartlariCiz(oyuncuEli)}\n` +
        `💰 **Bahis:** ${ryoYaz(bahis)}`,
      altMetin: altMetin || `Kage 21 Casino • Destede ${deste.length} kart`
    });
  };

  const butonlar = (ikiyeKatlanabilir, kapali = false) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bj_hit').setLabel('Kart Çek').setEmoji('🃏')
        .setStyle(ButtonStyle.Primary).setDisabled(kapali),
      new ButtonBuilder().setCustomId('bj_stand').setLabel('Dur').setEmoji('🛑')
        .setStyle(ButtonStyle.Secondary).setDisabled(kapali)
    );
    if (ikiyeKatlanabilir) {
      row.addComponents(
        new ButtonBuilder().setCustomId('bj_double').setLabel('İkiye Katla').setEmoji('⚡')
          .setStyle(ButtonStyle.Success).setDisabled(kapali)
      );
    }
    return [row];
  };

  const oyuncuIlk = elSkoruHesapla(oyuncuEli);
  const krupiyeIlk = elSkoruHesapla(krupiyeEli);

  // Doğal blackjack
  if (oyuncuIlk === 21) {
    if (krupiyeIlk === 21) {
      ryoEkle(userId, bahis, 'blackjack iade');
      return interaction.reply({
        embeds: [masaEmbed({
          baslik: '🤝 BERABERE • İKİ TARAF DA BLACKJACK',
          renk: TEMA.RENKLER.BILGI,
          durum: `Bahsin iade edildi. Bakiye: **${ryoYaz(bakiyeGetir(userId).ryo)}**`,
          gizli: false
        })]
      });
    }
    const odeme = Math.floor(bahis * 2.5);
    ryoEkle(userId, odeme, 'blackjack ödeme');
    return interaction.reply({
      embeds: [masaEmbed({
        baslik: '🔥 DOĞAL BLACKJACK!',
        renk: TEMA.RENKLER.ALTIN,
        durum: `İlk iki kartta 21! 3:2 ödeme: **+${ryoYaz(odeme - bahis)}**\nBakiye: **${ryoYaz(bakiyeGetir(userId).ryo)}**`,
        gizli: false
      })]
    });
  }

  const ilkEmbed = masaEmbed({
    baslik: '🎲 KAGE 21 • BLACKJACK MASASI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    durum: 'Kartlar dağıtıldı. Hamleni seç.',
    gizli: true
  });
  const mesaj = await interaction.reply({
    embeds: [ilkEmbed],
    components: butonlar(bakiyeGetir(userId).ryo >= bahis),
    fetchReply: true
  });

  const collector = mesaj.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    time: 60000
  });

  collector.on('collect', async bi => {
    await bi.deferUpdate();

    if (bi.customId === 'bj_double') {
      if (!ryoDus(userId, bahis, 'blackjack bahis')) return;
      bahis *= 2;
      oyuncuEli.push(deste.pop());
      return collector.stop(elSkoruHesapla(oyuncuEli) > 21 ? 'bust' : 'double');
    }

    if (bi.customId === 'bj_hit') {
      oyuncuEli.push(deste.pop());
      const skor = elSkoruHesapla(oyuncuEli);
      if (skor > 21) return collector.stop('bust');
      if (skor === 21) return collector.stop('stand');
      return mesaj.edit({
        embeds: [masaEmbed({
          baslik: '🎲 KAGE 21 • BLACKJACK MASASI',
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          durum: 'Kart çektin. Sıradaki hamlen?',
          gizli: true
        })],
        components: butonlar(false)
      });
    }

    if (bi.customId === 'bj_stand') return collector.stop('stand');
  });

  collector.on('end', async (_, sebep) => {
    const oyuncuSkor = elSkoruHesapla(oyuncuEli);

    if (oyuncuSkor > 21) {
      return mesaj.edit({
        embeds: [masaEmbed({
          baslik: '💥 YANDIN! (BUST)',
          renk: TEMA.RENKLER.HATA,
          durum: `Skorun 21'i aştı.\n💸 **Kayıp:** -${ryoYaz(bahis)} • Bakiye: **${ryoYaz(bakiyeGetir(userId).ryo)}**`,
          gizli: false
        })],
        components: []
      });
    }

    // Krupiye kartı açar, sonra 17'ye kadar tek tek çeker (animasyonlu)
    await mesaj.edit({
      embeds: [masaEmbed({
        baslik: '🤵 KRUPİYE SIRASI',
        renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
        durum: sebep === 'time' ? 'Süre doldu, otomatik DUR. Krupiye kartını açıyor…' : 'Krupiye kartını açıyor…',
        gizli: false
      })],
      components: butonlar(false, true)
    }).catch(() => {});

    // Animasyon düzenlemeleri başarısız olsa bile ödeme mutlaka hesaplanır
    while (elSkoruHesapla(krupiyeEli) < 17) {
      await bekle(1100);
      krupiyeEli.push(deste.pop());
      await mesaj.edit({
        embeds: [masaEmbed({
          baslik: '🤵 KRUPİYE SIRASI',
          renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
          durum: 'Krupiye kart çekti…',
          gizli: false
        })]
      }).catch(() => {});
    }
    await bekle(800);

    const krupiyeSkor = elSkoruHesapla(krupiyeEli);
    let baslik, renk, durum;

    if (krupiyeSkor > 21 || oyuncuSkor > krupiyeSkor) {
      ryoEkle(userId, bahis * 2, 'blackjack ödeme');
      baslik = krupiyeSkor > 21 ? '🎉 KRUPİYE PATLADI!' : '🏆 MASAYI YENDİN!';
      renk = TEMA.RENKLER.BASARI;
      durum = `**+${ryoYaz(bahis)}** kazandın (ödeme: ${ryoYaz(bahis * 2)})`;
    } else if (oyuncuSkor === krupiyeSkor) {
      ryoEkle(userId, bahis, 'blackjack iade');
      baslik = '🤝 BERABERE (PUSH)';
      renk = TEMA.RENKLER.BILGI;
      durum = 'Skorlar eşit, bahsin iade edildi.';
    } else {
      baslik = '💀 KRUPİYE KAZANDI';
      renk = TEMA.RENKLER.HATA;
      durum = `**-${ryoYaz(bahis)}** kaybettin.`;
    }

    await mesaj.edit({
      embeds: [masaEmbed({
        baslik,
        renk,
        durum: `${durum}\n🪙 Bakiye: **${ryoYaz(bakiyeGetir(userId).ryo)}**`,
        gizli: false,
        altMetin: 'Kage 21 Casino • Tekrar oynamak için /blackjack'
      })],
      components: []
    }).catch(() => {});
  });
}
