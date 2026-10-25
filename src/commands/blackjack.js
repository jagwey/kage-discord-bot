import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, ryoEkle, ryoDus } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('blackjack')
  .setDescription('Kage 21 Blackjack masasında krupiyeye karşı kart oynar ve Ryo kazanırsınız.')
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription('Ortaya koymak istediğiniz Ryo miktarı')
      .setRequired(true)
      .setMinValue(10)
  );

// Kart Deste Sistemi
const DESTE_TIPLERI = ['♠️', '♥️', '♦️', '♣️'];
const DESTE_DEGERLERI = [
  { ad: 'A', deger: 11 },
  { ad: '2', deger: 2 },
  { ad: '3', deger: 3 },
  { ad: '4', deger: 4 },
  { ad: '5', deger: 5 },
  { ad: '6', deger: 6 },
  { ad: '7', deger: 7 },
  { ad: '8', deger: 8 },
  { ad: '9', deger: 9 },
  { ad: '10', deger: 10 },
  { ad: 'J', deger: 10 },
  { ad: 'Q', deger: 10 },
  { ad: 'K', deger: 10 }
];

function desteOlustur() {
  const deste = [];
  for (const tip of DESTE_TIPLERI) {
    for (const d of DESTE_DEGERLERI) {
      deste.push({ ad: d.ad, tip, deger: d.deger, gosterim: `\`[${d.ad}${tip}]\`` });
    }
  }
  // Karıştır (Fisher-Yates)
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

  // A'ları 11'den 1'e düşür gerekirse
  while (toplam > 21 && asSayisi > 0) {
    toplam -= 10;
    asSayisi--;
  }

  return toplam;
}

function elMetni(el, gizli = false) {
  if (gizli) {
    return `${el[0].gosterim} \`[🎴 ??]\``;
  }
  return el.map(k => k.gosterim).join(' ');
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  let bahis = interaction.options.getInteger('bahis');
  const bakiye = bakiyeGetir(userId);

  if (bakiye.ryo < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanınızda \`${bakiye.ryo} Ryo\` var, gereken bahis: \`${bahis} Ryo\`.`,
      ephemeral: true
    });
  }

  // İlk bahsi düş
  ryoDus(userId, bahis);

  const deste = desteOlustur();
  const oyuncuEli = [deste.pop(), deste.pop()];
  const krupiyeEli = [deste.pop(), deste.pop()];

  let oyunBitti = false;
  let ikiyeKatlandi = false;

  const durumEmbedUret = (baslik, renk, durumAciklamasi, gizliKrupiye = true) => {
    const oyuncuSkor = elSkoruHesapla(oyuncuEli);
    const krupiyeSkor = gizliKrupiye ? elSkoruHesapla([krupiyeEli[0]]) : elSkoruHesapla(krupiyeEli);

    return kageEmbed({
      baslik,
      renk,
      aciklama: `${durumAciklamasi}\n\n` +
        `🤵 **Krupiye Masası:**\n${elMetni(krupiyeEli, gizliKrupiye)}\n` +
        `Skor: **${gizliKrupiye ? `${krupiyeSkor} + ?` : krupiyeSkor}**\n\n` +
        `👤 **${interaction.user.username} (Sen):**\n${elMetni(oyuncuEli, false)}\n` +
        `Skor: **${oyuncuSkor}**\n\n` +
        `💰 **Aktif Bahis:** \`${bahis} Ryo\``,
      footer: `Kage 21 Casino • Şansını iyi kullan!`
    });
  };

  const butonRowOlustur = (canDouble) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bj_hit')
        .setLabel('Kart Çek (Hit)')
        .setEmoji('🃏')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('bj_stand')
        .setLabel('Dur (Stand)')
        .setEmoji('🛑')
        .setStyle(ButtonStyle.Secondary)
    );

    if (canDouble) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('bj_double')
          .setLabel('İkiye Katla (2x)')
          .setEmoji('⚡')
          .setStyle(ButtonStyle.Success)
      );
    }
    return row;
  };

  const oyuncuSkor = elSkoruHesapla(oyuncuEli);
  const krupiyeSkor = elSkoruHesapla(krupiyeEli);

  // Doğrudan Blackjack Kontrolü
  if (oyuncuSkor === 21) {
    if (krupiyeSkor === 21) {
      ryoEkle(userId, bahis); // Berabere, bahsi iade et
      const embed = durumEmbedUret(
        '🤝 BERABERE! (PUSH)',
        TEMA.RENKLER.BILGI,
        'İki taraf da anında 21 yaptı! Bahsiniz cüzdanınıza iade edildi.',
        false
      );
      return interaction.reply({ embeds: [embed] });
    } else {
      const kazanc = Math.floor(bahis * 2.5); // Doğal Blackjack 3:2
      ryoEkle(userId, kazanc);
      const yeniBakiye = bakiyeGetir(userId).ryo;
      const embed = durumEmbedUret(
        '🔥 DOĞAL BLACKJACK! KAZANDINIZ!',
        TEMA.RENKLER.BASARI,
        `Mükemmel el! İlk iki kartta 21 vurdun!\n**Ödeme (3:2):** \`+${kazanc - bahis} Ryo\`\n**Yeni Bakiye:** \`${yeniBakiye} Ryo\``,
        false
      );
      return interaction.reply({ embeds: [embed] });
    }
  }

  // Oyuncu bakiyesi 2x için yeterli mi?
  const guncelBakiye = bakiyeGetir(userId);
  const canDouble = guncelBakiye.ryo >= bahis;

  const baslangicEmbed = durumEmbedUret(
    '🎲 KAGE 21 • BLACKJACK MASASI',
    TEMA.RENKLER.KAN_KIRMIZISI,
    'Kartlar dağıtıldı! Hamleni seç:',
    true
  );

  const mesaj = await interaction.reply({
    embeds: [baslangicEmbed],
    components: [butonRowOlustur(canDouble)],
    fetchReply: true
  });

  const collector = mesaj.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    time: 60000
  });

  collector.on('collect', async bi => {
    await bi.deferUpdate();

    // 1. İkiye Katla
    if (bi.customId === 'bj_double') {
      ryoDus(userId, bahis);
      bahis *= 2;
      ikiyeKatlandi = true;
      oyuncuEli.push(deste.pop());
      collector.stop('double');
      return;
    }

    // 2. Kart Çek (Hit)
    if (bi.customId === 'bj_hit') {
      oyuncuEli.push(deste.pop());
      const guncelSkor = elSkoruHesapla(oyuncuEli);

      if (guncelSkor > 21) {
        collector.stop('bust');
        return;
      }

      if (guncelSkor === 21) {
        collector.stop('stand');
        return;
      }

      // Devam ediyor
      const guncelEmbed = durumEmbedUret(
        '🎲 KAGE 21 • BLACKJACK MASASI',
        TEMA.RENKLER.KAN_KIRMIZISI,
        'Bir kart çektin. Sıradaki hamlen?',
        true
      );
      return bi.message.edit({ embeds: [guncelEmbed], components: [butonRowOlustur(false)] });
    }

    // 3. Dur (Stand)
    if (bi.customId === 'bj_stand') {
      collector.stop('stand');
      return;
    }
  });

  collector.on('end', async (_, sebep) => {
    let oyuncuSkorSon = elSkoruHesapla(oyuncuEli);

    // Oyuncu Patladıysa (Bust)
    if (oyuncuSkorSon > 21 || sebep === 'bust') {
      const kalanBakiye = bakiyeGetir(userId).ryo;
      const embed = durumEmbedUret(
        '💥 YANDINIZ! (BUST)',
        TEMA.RENKLER.HATA,
        `Skorun 21'i aştı ve eli kaybettin!\n\n💸 **Kaybedilen:** \`-${bahis} Ryo\`\n🪙 **Kalan Bakiye:** \`${kalanBakiye} Ryo\``,
        false
      );
      return mesaj.edit({ embeds: [embed], components: [] });
    }

    // Krupiye Sırası: Krupiye 17 veya üstüne kadar kart çeker
    while (elSkoruHesapla(krupiyeEli) < 17) {
      krupiyeEli.push(deste.pop());
    }

    const krupiyeSkorSon = elSkoruHesapla(krupiyeEli);

    // Krupiye Patladıysa
    if (krupiyeSkorSon > 21) {
      const kazanc = bahis * 2;
      ryoEkle(userId, kazanc);
      const yeniBakiye = bakiyeGetir(userId).ryo;
      const embed = durumEmbedUret(
        '🎉 KRUPİYE PATLADI! KAZANDINIZ!',
        TEMA.RENKLER.BASARI,
        `Krupiye 21'i aştı (${krupiyeSkorSon}) ve masayı sen topladın!\n\n` +
        `💰 **Kazanılan Net:** \`+${bahis} Ryo\` (Toplam: \`${kazanc} Ryo\`)\n` +
        `🪙 **Yeni Bakiye:** \`${yeniBakiye} Ryo\``,
        false
      );
      return mesaj.edit({ embeds: [embed], components: [] });
    }

    // Skor Karşılaştırma
    if (oyuncuSkorSon > krupiyeSkorSon) {
      const kazanc = bahis * 2;
      ryoEkle(userId, kazanc);
      const yeniBakiye = bakiyeGetir(userId).ryo;
      const embed = durumEmbedUret(
        '🏆 TEBRİKLER! MASAYI YENDİNİZ!',
        TEMA.RENKLER.BASARI,
        `Elin krupiyeden daha yüksek çıktı (${oyuncuSkorSon} vs ${krupiyeSkorSon})!\n\n` +
        `💰 **Kazanılan Net:** \`+${bahis} Ryo\` (Toplam: \`${kazanc} Ryo\`)\n` +
        `🪙 **Yeni Bakiye:** \`${yeniBakiye} Ryo\``,
        false
      );
      return mesaj.edit({ embeds: [embed], components: [] });
    } else if (oyuncuSkorSon === krupiyeSkorSon) {
      ryoEkle(userId, bahis); // Bahsi iade et
      const yeniBakiye = bakiyeGetir(userId).ryo;
      const embed = durumEmbedUret(
        '🤝 BERABERE (PUSH)',
        TEMA.RENKLER.BILGI,
        `İki tarafın da skoru eşit (${oyuncuSkorSon})! Bahsiniz aynen iade edildi.\n\n` +
        `🪙 **Bakiyeniz:** \`${yeniBakiye} Ryo\``,
        false
      );
      return mesaj.edit({ embeds: [embed], components: [] });
    } else {
      const kalanBakiye = bakiyeGetir(userId).ryo;
      const embed = durumEmbedUret(
        '💀 KRUPİYE KAZANDI',
        TEMA.RENKLER.HATA,
        `Krupiyenin eli seninkinden yüksek çıktı (${krupiyeSkorSon} vs ${oyuncuSkorSon}).\n\n` +
        `💸 **Kaybedilen:** \`-${bahis} Ryo\`\n` +
        `🪙 **Kalan Bakiye:** \`${kalanBakiye} Ryo\``,
        false
      );
      return mesaj.edit({ embeds: [embed], components: [] });
    }
  });
}
