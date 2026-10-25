import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import {
  bakiyeGetir,
  zindanZaferiDetayli,
  olumCezasiUygula,
  esyaVarMi,
  esyaHarca
} from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('zindan')
  .setDescription('Kage zindanlarına inip iblislerle interaktif savaşır ve ganimet yağmalarsınız.');

const ZINDANLAR = [
  {
    ad: '⛩️ Kanlı Torii Geçidi',
    canavar: 'Ruhsuz Samuray Muhafızı',
    canavarHp: 80,
    minAtk: 12,
    maxAtk: 22,
    minRyo: 100,
    maxRyo: 250,
    lootTablosu: ['🏮 Antik Torii Parşömeni', '🧪 Küçük Can İksiri', '🥋 Paslı Zırh Parçası']
  },
  {
    ad: '🌲 Lanetli Bambu Ormanı',
    canavar: 'Gölge Tengu Suikastçısı',
    canavarHp: 130,
    minAtk: 18,
    maxAtk: 32,
    minRyo: 220,
    maxRyo: 500,
    lootTablosu: ['🪶 Tengu Tüyü', '🔮 Gölge Kristali', '🧪 Kızıl Can İksiri']
  },
  {
    ad: '🏯 Harabe Şogun Kalesi',
    canavar: 'Kadim Oni İblisi (Mini-Boss)',
    canavarHp: 180,
    minAtk: 25,
    maxAtk: 42,
    minRyo: 400,
    maxRyo: 850,
    lootTablosu: ['🩸 Oni Boynuzu', '⚔️ Lanetli Çelik Parçası', '💎 Parlak Yakut']
  },
  {
    ad: '🌋 Yeraltı Magma Tapınağı',
    canavar: 'Kızıl Ejder Efendisi (BÜYÜK BOSS)',
    canavarHp: 260,
    minAtk: 32,
    maxAtk: 55,
    minRyo: 800,
    maxRyo: 1800,
    lootTablosu: ['🐉 Kadim Ejder Pulu', '👑 Şogun Altın Mührü', '🔥 Ebedi Alev Taşı']
  }
];

function canBari(mevcut, maksimum) {
  const yuzde = Math.max(0, Math.min(1, mevcut / maksimum));
  const dolu = Math.round(yuzde * 10);
  const bos = 10 - dolu;
  return `\`[${'█'.repeat(dolu)}${'░'.repeat(bos)}]\` **${mevcut}/${maksimum} HP**`;
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bakiye = bakiyeGetir(userId);
  const kilic = bakiye.kilic;
  const kilicBonus = 1 + ((kilic?.bonus || 0) / 100);

  // Rastgele zindan seç
  const zindan = ZINDANLAR[Math.floor(Math.random() * ZINDANLAR.length)];

  let oyuncuHp = 100;
  const maxOyuncuHp = 100;
  let canavarHp = zindan.canavarHp;
  const maxCanavarHp = zindan.canavarHp;
  let tur = 1;
  let sonOlay = `Karanlık koridorlardan ağır ayak sesleri duyuldu... Karşında: **${zindan.canavar}**!`;

  const arenaGuncelle = async (mesaj, butonlariKapat = false) => {
    const embed = kageEmbed({
      baslik: `🏰 ZİNDAN AKINI • ${zindan.ad}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**Savaş Meydanı:** Tur #${tur}\n\n` +
        `👤 **${interaction.user.username}** [${kilic.ad}]:\n${canBari(oyuncuHp, maxOyuncuHp)}\n\n` +
        `👾 **${zindan.canavar}**:\n${canBari(canavarHp, maxCanavarHp)}\n\n` +
        `📜 **Son Durum:**\n*${sonOlay}*`,
      footer: `Kage Zindan RPG • Katanan gücünü belirler!`
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('zindan_saldir')
        .setLabel('Katana Vuruşu')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗡️')
        .setDisabled(butonlariKapat),
      new ButtonBuilder()
        .setCustomId('zindan_golge')
        .setLabel('Gölge Tekniği')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🌪️')
        .setDisabled(butonlariKapat),
      new ButtonBuilder()
        .setCustomId('zindan_iksir')
        .setLabel('Can İksiri (+40 HP)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🧪')
        .setDisabled(butonlariKapat),
      new ButtonBuilder()
        .setCustomId('zindan_kac')
        .setLabel('Geri Çekil (Kaç)')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏃')
        .setDisabled(butonlariKapat)
    );

    return mesaj.edit({
      embeds: [embed],
      components: [row]
    });
  };

  const baslangicEmbed = kageEmbed({
    baslik: `🏰 ZİNDANA GİRİLDİ • ${zindan.ad}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Meşalelerin alevi titriyor... Zindanın derinliklerinde **${zindan.canavar}** pusuda bekliyor!\n\n` +
      `👤 **Sağlığın:** ${canBari(oyuncuHp, maxOyuncuHp)}\n` +
      `👾 **Düşman Sağlığı:** ${canBari(canavarHp, maxCanavarHp)}\n` +
      `🗡️ **Kuşandığın Silah:** **${kilic.ad}** (+%${kilic.bonus} Hasar Bonusu)\n\n` +
      `*Kılıcını kınından çıkar ve hamleni seç!*`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('zindan_saldir').setLabel('Katana Vuruşu').setStyle(ButtonStyle.Danger).setEmoji('🗡️'),
    new ButtonBuilder().setCustomId('zindan_golge').setLabel('Gölge Tekniği').setStyle(ButtonStyle.Primary).setEmoji('🌪️'),
    new ButtonBuilder().setCustomId('zindan_iksir').setLabel('Can İksiri').setStyle(ButtonStyle.Success).setEmoji('🧪'),
    new ButtonBuilder().setCustomId('zindan_kac').setLabel('Geri Çekil').setStyle(ButtonStyle.Secondary).setEmoji('🏃')
  );

  const yanit = await interaction.reply({
    embeds: [baslangicEmbed],
    components: [row],
    fetchReply: true
  });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000
  });

  collector.on('collect', async bi => {
    if (bi.user.id !== userId) {
      return bi.reply({ content: 'Bu zindan seferi sadece komutu başlatan samuraya aittir.', ephemeral: true });
    }

    await bi.deferUpdate();

    // 1. Kaçma
    if (bi.customId === 'zindan_kac') {
      collector.stop();
      const kacisEmbed = kageEmbed({
        baslik: '🏃 ZİNDANDAN GERİ ÇEKİLDİNİZ',
        renk: TEMA.RENKLER.UYARI_SARI,
        aciklama: `**${interaction.user.username}**, canavarın ezici gücünü hissedip gölgelerin arasına dalarak güvenli şekilde zindandan kaçtı.\n\n*Ganimet alamadın ama canını ve eşyalarını kurtardın.*`
      });
      return bi.message.edit({ embeds: [kacisEmbed], components: [] });
    }

    // 2. Can İksiri İçme
    if (bi.customId === 'zindan_iksir') {
      const iksirVar = esyaVarMi(userId, 'İksir');
      if (iksirVar) {
        esyaHarca(userId, 'İksir');
        oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + 45);
        sonOlay = `🧪 Çantandaki iksiri kafana diktin ve **+45 HP** tazeledin!`;
      } else {
        // İksir yoksa Ryo harcayarak acil can basabilir
        const guncelBakiye = bakiyeGetir(userId);
        if (guncelBakiye.ryo >= 50) {
          esyaHarca(userId, 'yok'); // dummy
          zindanZaferiDetayli(userId, -50); // 50 Ryo kes
          oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + 30);
          sonOlay = `🧪 Acil şifa parşömeni açtın (\`-50 Ryo\`) ve **+30 HP** kazandın!`;
        } else {
          sonOlay = `❌ Çantanda can iksiri ve yeterli Ryo kalmamış! Hamleni boşa harcadın.`;
        }
      }
    }

    // 3. Normal Katana Saldırısı
    if (bi.customId === 'zindan_saldir') {
      const taban = Math.floor(Math.random() * 16) + 20; // 20-35
      const hasar = Math.round(taban * kilicBonus);
      canavarHp = Math.max(0, canavarHp - hasar);
      sonOlay = `🗡️ **${kilic.ad}** ile vurdun ve canavara **${hasar} Hasar** verdin!`;
    }

    // 4. Gölge Tekniği (Riskli Kritik)
    if (bi.customId === 'zindan_golge') {
      const sans = Math.random();
      if (sans > 0.4) {
        const taban = Math.floor(Math.random() * 26) + 35; // 35-60
        const hasar = Math.round(taban * kilicBonus);
        canavarHp = Math.max(0, canavarHp - hasar);
        sonOlay = `💥 **KRİTİK GÖLGE SALDIRISI!** Gölgeler arasından atılıp canavara **${hasar} Hasar** indirdin!`;
      } else {
        sonOlay = `💨 Gölge tekniğin boşa gitti, canavar hamleni savuşturdu!`;
      }
    }

    // Canavar Öldü mü?
    if (canavarHp <= 0) {
      collector.stop();

      // Ganimet Belirle
      const kazanilanRyo = Math.floor(Math.random() * (zindan.maxRyo - zindan.minRyo + 1)) + zindan.minRyo;
      const sans = Math.random();
      let dusenItem = null;

      // %70 şansla nadir eşya düşer
      if (sans < 0.70) {
        dusenItem = zindan.lootTablosu[Math.floor(Math.random() * zindan.lootTablosu.length)];
      }

      zindanZaferiDetayli(userId, kazanilanRyo, dusenItem);

      const zaferEmbed = kageEmbed({
        baslik: `👑 ZİNDAN TEMİZLENDİ & ZAFER! • ${zindan.ad}`,
        renk: TEMA.RENKLER.BASARI,
        aciklama: `**Tebrikler Şanlı Samuray!**\n\n` +
          `**${zindan.canavar}** katananın son darbesiyle yere serildi ve zindandaki gizli hazine sandığı açıldı!\n\n` +
          `*${rastgeleSlogan()}*`,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
        alanlar: [
          { name: '💰 Yağmalanan Ryo', value: `\`+${kazanilanRyo} Ryo\``, inline: true },
          { name: '🎒 Düşen Nadir Eşya', value: dusenItem ? `**${dusenItem}** *(Çantana eklendi)*` : '*Bu sefer özel eşya düşmedi.*', inline: true },
          { name: '🗡️ Kullanılan Silah', value: `${kilic.ad} (+%${kilic.bonus})`, inline: false }
        ],
        footer: `Eşyalarını görmek için /envanter yazabilirsin • kage95.com`
      });

      return bi.message.edit({ embeds: [zaferEmbed], components: [] });
    }

    // Canavarın Karşı Saldırısı
    const canavarHasar = Math.floor(Math.random() * (zindan.maxAtk - zindan.minAtk + 1)) + zindan.minAtk;
    oyuncuHp = Math.max(0, oyuncuHp - canavarHasar);
    sonOlay += `\n👾 **${zindan.canavar}** öfkeyle karşı saldırıya geçti ve sana **${canavarHasar} Hasar** vurdu!`;

    // Oyuncu Öldü mü? (ÖLÜM CEZASI & EŞYA KAYBI)
    if (oyuncuHp <= 0) {
      collector.stop();

      const olumSonucu = olumCezasiUygula(userId);

      const olumEmbed = kageEmbed({
        baslik: `💀 ZİNDANDA CAN VERDİNİZ • ${zindan.ad}`,
        renk: TEMA.RENKLER.HATA,
        aciklama: `**${interaction.user.username}**, **${zindan.canavar}** karşısında ağır yaralandı ve zindanın soğuk zeminine yığıldı!\n\n` +
          `🔥 **Ölüm Cezası:**\n${olumSonucu.kayipMesaji}\n\n` +
          `💰 **Kalan Cüzdanın:** \`${olumSonucu.kalanRyo} Ryo\`\n\n` +
          `*Bir dahaki sefere /demirci ile katananı güçlendirip can iksiriyle gitmeyi unutma!*`,
        footer: `Kage Zindan RPG • Ölüm ciddidir.`
      });

      return bi.message.edit({ embeds: [olumEmbed], components: [] });
    }

    tur++;
    await arenaGuncelle(bi.message);
  });
}
