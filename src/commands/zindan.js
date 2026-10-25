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
  esyaHarca,
  ryoDus
} from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('zindan')
  .setDescription('3 rastgele zindandan birini seçip iblislerle savaşır ve ganimet yağmalarsınız.');

// ==========================================
// 8 FARKLI DERECEDE ZİNDAN HAVUZU (E'den S'ye)
// ==========================================
const ZINDAN_HAVUZU = [
  {
    id: 'haydut_vadisi',
    rank: '🟢 D-Rank (Kolay)',
    ad: '🌾 Haydutlar Vadisi',
    canavar: 'Maskeli Ronin Çetesi',
    canavarHp: 75,
    minAtk: 10,
    maxAtk: 18,
    minRyo: 90,
    maxRyo: 220,
    lootTablosu: ['🥋 Yırtık Kimono', '🧪 Küçük Şifa İksiri', '🗡️ Paslı Hançer'],
    ozellik: '🌾 Açık Arazi: Kaçış manevrası her zaman %100 başarılı olur.'
  },
  {
    id: 'kanli_torii',
    rank: '🟢 D-Rank (Kolay)',
    ad: '⛩️ Kanlı Torii Kapısı',
    canavar: 'Ruhsuz Samuray Muhafızı',
    canavarHp: 90,
    minAtk: 12,
    maxAtk: 22,
    minRyo: 120,
    maxRyo: 280,
    lootTablosu: ['🏮 Antik Torii Parşömeni', '🧪 Küçük Can İksiri', '🥋 Paslı Zırh Parçası'],
    ozellik: '🏮 Kutsal Fenerler: Katana vuruşları canavara +5 ek hasar vurur.'
  },
  {
    id: 'bambu_ormani',
    rank: '🟡 C-Rank (Orta)',
    ad: '🌲 Lanetli Bambu Ormanı',
    canavar: 'Gölge Tengu Suikastçısı',
    canavarHp: 135,
    minAtk: 16,
    maxAtk: 28,
    minRyo: 250,
    maxRyo: 550,
    lootTablosu: ['🪶 Tengu Tüyü', '🔮 Gölge Kristali', '🧪 Kızıl Can İksiri'],
    ozellik: '🌫️ Yoğun Sis: Canavar bazen darbeleri savuşturabilir.'
  },
  {
    id: 'zehirli_mabet',
    rank: '🟡 C-Rank (Orta)',
    ad: '🏚️ Terk Edilmiş Zehir Mabedi',
    canavar: 'Zehirli Kunoichi Ruhu',
    canavarHp: 145,
    minAtk: 18,
    maxAtk: 30,
    minRyo: 280,
    maxRyo: 620,
    lootTablosu: ['🧪 Zehirli Şuriken', '📜 Gizli Gölge Parşömeni', '🧪 Kızıl Can İksiri'],
    ozellik: '🧪 Şifalı Otlar: Can iksirleri savaşta +15 ekstra HP doldurur.'
  },
  {
    id: 'sogun_kalesi',
    rank: '🟠 B-Rank (Zor)',
    ad: '🏯 Harabe Şogun Kalesi',
    canavar: 'Kadim Oni İblisi (Mini-Boss)',
    canavarHp: 195,
    minAtk: 24,
    maxAtk: 40,
    minRyo: 500,
    maxRyo: 1050,
    lootTablosu: ['🩸 Oni Boynuzu', '⚔️ Lanetli Çelik Parçası', '💎 Parlak Yakut'],
    ozellik: '🩸 İblis Öfkesi: Canavarın canı azaldıkça saldırıları sertleşir.'
  },
  {
    id: 'buzul_magara',
    rank: '🟠 B-Rank (Zor)',
    ad: '❄️ Buzul Ejder Mağarası',
    canavar: 'Buz Hayaleti Kutsal Kurt',
    canavarHp: 205,
    minAtk: 22,
    maxAtk: 38,
    minRyo: 550,
    maxRyo: 1150,
    lootTablosu: ['❄️ Sonsuz Buz Çiçeği', '🐺 Ak Kurt Postu', '💎 Elmas Parçası'],
    ozellik: '❄️ Ayaz Kalkanı: Başarılı blok yapmak gelen hasarı %75 emer.'
  },
  {
    id: 'magma_tapinagi',
    rank: '🔴 A-Rank (Kabus)',
    ad: '🌋 Yeraltı Magma Tapınağı',
    canavar: 'Kızıl Magma Ejderi (Büyük Boss)',
    canavarHp: 280,
    minAtk: 32,
    maxAtk: 52,
    minRyo: 900,
    maxRyo: 2000,
    lootTablosu: ['🐉 Kadim Ejder Pulu', '👑 Şogun Altın Mührü', '🔥 Ebedi Alev Taşı'],
    ozellik: '🔥 Kızgın Magma: Ağır hasar riski ancak devasa altın ödülü!'
  },
  {
    id: 'hiclik_boyutu',
    rank: '🟣 S-Rank (Efsanevi)',
    ad: '🌌 Hiçlik ve Gölge Boyutu',
    canavar: 'Kage Hükümdarı Ruhu (Nihai Boss)',
    canavarHp: 350,
    minAtk: 36,
    maxAtk: 60,
    minRyo: 1800,
    maxRyo: 3600,
    lootTablosu: ['👑 Kage İmparatorluk Tacı', '🌌 Hiçlik Yıldızı', '🩸 Muramasa Kan Çeliği'],
    ozellik: '⚡ Kadim Güç: Bu zindanı temizleyen klan tarihine adını yazdırır!'
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

  // Havuzdan rastgele 3 farklı zindan seç
  const karistirilmis = [...ZINDAN_HAVUZU].sort(() => 0.5 - Math.random());
  const secenekler = karistirilmis.slice(0, 3);

  // 1. AŞAMA: ZİNDAN PORTALI & KAPI SEÇİMİ
  const kapiSecimEmbed = kageEmbed({
    baslik: '🌀 GÖLGE PORTALI AÇILDI • ZİNDANINI SEÇ!',
    renk: TEMA.RENKLER.BILGI,
    aciklama: `Karanlık gölge enerjisi yarıldı ve önüne üç gizemli boyut kapısı açıldı!\n` +
      `Kılıcını çek ve girmek istediğin zindanı seç. Kararsızlık samurayın sonudur!\n\n` +
      `⏳ **Süre:** \`30 Saniye\` içinde bir kapı seçmek zorundasın!\n` +
      `⚠️ **Ceza:** Zamanında kapı seçmezsen portal çöker ve kesenden **50 Ryo** yutulur!`,
    alanlar: secenekler.map((z, idx) => ({
      name: `🚪 [KAPI ${idx + 1}] ${z.ad} — ${z.rank}`,
      value: `👾 **Boss:** \`${z.canavar}\` (${z.canavarHp} HP)\n` +
        `💰 **Ganimet:** \`~${z.minRyo} - ${z.maxRyo} Ryo\`\n` +
        `📜 **Özellik:** *${z.ozellik}*`,
      inline: false
    })),
    footer: `Kuşandığın Katana: ${kilic.ad} (+%${kilic.bonus} Hasar)`
  });

  const kapiRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kapi_0')
      .setLabel(`Kapı 1: ${secenekler[0].ad.split(' ')[1] || 'Zindan 1'}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🚪'),
    new ButtonBuilder()
      .setCustomId('kapi_1')
      .setLabel(`Kapı 2: ${secenekler[1].ad.split(' ')[1] || 'Zindan 2'}`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('🚪'),
    new ButtonBuilder()
      .setCustomId('kapi_2')
      .setLabel(`Kapı 3: ${secenekler[2].ad.split(' ')[1] || 'Zindan 3'}`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🚪')
  );

  const portalMesaji = await interaction.reply({
    embeds: [kapiSecimEmbed],
    components: [kapiRow],
    fetchReply: true
  });

  let secilenZindan = null;

  try {
    const kapiTiklama = await portalMesaji.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId,
      time: 30000
    });

    await kapiTiklama.deferUpdate();

    const secimIndex = parseInt(kapiTiklama.customId.replace('kapi_', ''), 10);
    secilenZindan = secenekler[secimIndex] || secenekler[0];
  } catch (err) {
    // 30 saniye doldu, kullanıcı kapı seçmedi -> BOYUTSAL ÇÖKÜŞ CEZASI!
    const guncelBakiye = bakiyeGetir(userId);
    const ceza = Math.min(guncelBakiye.ryo, 50);
    if (ceza > 0) {
      ryoDus(userId, ceza);
    }
    const kalanRyo = bakiyeGetir(userId).ryo;

    const zamanAsimiEmbed = kageEmbed({
      baslik: '🌀 BOYUTSAL ÇÖKÜŞ • ZAMAN AŞIMI!',
      renk: TEMA.RENKLER.HATA,
      aciklama: `**${interaction.user.username}**, üç kapının önünde çok fazla tereddüt ettin!\n\n` +
        `Gölge portalının dengesi bozuldu, kara delik şiddetle çöktü ve oluşan girdap cüzdanından **${ceza} Ryo** yuttu!\n\n` +
        `💸 **Kaybedilen:** \`-${ceza} Ryo\`\n` +
        `🪙 **Kalan Cüzdanın:** \`${kalanRyo} Ryo\`\n\n` +
        `*Bir dahaki sefere katananı kuşan ve saniyeler içinde karar ver!*`,
      footer: `Kage Zindan RPG • Kararsızlık cezalandırılır.`
    });

    return portalMesaji.edit({ embeds: [zamanAsimiEmbed], components: [] });
  }

  // ==========================================
  // 2. AŞAMA: SAVAŞ ARENASI (SEÇİLEN ZİNDAN)
  // ==========================================
  let oyuncuHp = 100;
  const maxOyuncuHp = 100;
  let canavarHp = secilenZindan.canavarHp;
  const maxCanavarHp = secilenZindan.canavarHp;
  let tur = 1;
  let blokAktif = false;
  let sonOlay = `🚪 **${secilenZindan.ad}** kapısından içeri adım attın. Karanlığın içinden **${secilenZindan.canavar}** kükreyerek üzerine atıldı!`;

  const arenaGuncelle = async (mesaj) => {
    const embed = kageEmbed({
      baslik: `⚔️ SAVAŞ ARENASI • ${secilenZindan.ad}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**Boyut Seviyesi:** ${secilenZindan.rank} | **Tur:** #${tur}\n\n` +
        `👤 **${interaction.user.username}** [${kilic.ad}]:\n${canBari(oyuncuHp, maxOyuncuHp)}\n\n` +
        `👾 **${secilenZindan.canavar}**:\n${canBari(canavarHp, maxCanavarHp)}\n\n` +
        `📜 **Meydan Durumu:**\n*${sonOlay}*\n\n` +
        `✨ **Zindan Özelliği:** *${secilenZindan.ozellik}*`,
      footer: `Hamleni seç • Katanan keskin olsun!`
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('zindan_saldir')
        .setLabel('Saldır')
        .setEmoji('🗡️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('zindan_blok')
        .setLabel('Savun/Blok')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('zindan_golge')
        .setLabel('Gölge Tekniği')
        .setEmoji('💥')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('zindan_iksir')
        .setLabel('Can İksiri')
        .setEmoji('🧪')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('zindan_kac')
        .setLabel('Geri Çekil')
        .setEmoji('🏃‍♂️')
        .setStyle(ButtonStyle.Secondary)
    );

    return mesaj.edit({ embeds: [embed], components: [row] });
  };

  await arenaGuncelle(portalMesaji);

  const savasCollector = portalMesaji.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    time: 120000 // 2 dakika savaş süresi
  });

  savasCollector.on('collect', async bi => {
    await bi.deferUpdate();

    // 1. KAÇIŞ
    if (bi.customId === 'zindan_kac') {
      savasCollector.stop('kacti');
      const kacisEmbed = kageEmbed({
        baslik: `🏃‍♂️ SAVAŞTAN GERİ ÇEKİLDİNİZ • ${secilenZindan.ad}`,
        renk: TEMA.RENKLER.UYARI_SARI,
        aciklama: `**${interaction.user.username}**, canavarın ezici baskısı karşısında akıllıca bir manevra yaparak gölgelere sığındı ve zindandan kaçtı.\n\n*Ganimet alamadın ama canını ve eşyalarını sağ salim kurtardın!*`
      });
      return bi.message.edit({ embeds: [kacisEmbed], components: [] });
    }

    // 2. SAVUNMA / BLOK
    if (bi.customId === 'zindan_blok') {
      blokAktif = true;
      sonOlay = `🛡️ Katananı savunma pozisyonuna çektin! Canavarın bir sonraki hamlesini savuşturmaya hazırsın.`;
    }

    // 3. CAN İKSİRİ İÇME
    if (bi.customId === 'zindan_iksir') {
      const iksirVar = esyaVarMi(userId, 'İksir');
      let tazeHp = secilenZindan.id === 'zehirli_mabet' ? 60 : 45;

      if (iksirVar) {
        esyaHarca(userId, 'İksir');
        oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + tazeHp);
        sonOlay = `🧪 Çantandaki iksiri kafana diktin ve **+${tazeHp} HP** tazeledin!`;
      } else {
        const guncel = bakiyeGetir(userId);
        if (guncel.ryo >= 50) {
          ryoDus(userId, 50);
          oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + 30);
          sonOlay = `🧪 Acil şifa parşömeni yaktın (\`-50 Ryo\`) ve **+30 HP** kazandın!`;
        } else {
          sonOlay = `❌ Çantanda iksir ve şifa parşömeni için yeterli Ryo yok! Hamleni boşa harcadın.`;
        }
      }
    }

    // 4. NORMAL KATANA SALDIRISI
    if (bi.customId === 'zindan_saldir') {
      let ekZindanBonus = secilenZindan.id === 'kanli_torii' ? 5 : 0;
      const taban = Math.floor(Math.random() * 16) + 20; // 20-35
      const hasar = Math.round(taban * kilicBonus) + ekZindanBonus;
      canavarHp = Math.max(0, canavarHp - hasar);
      sonOlay = `🗡️ **${kilic.ad}** ile seri bir darbe savurdun ve canavara **${hasar} Hasar** verdin!`;
    }

    // 5. GÖLGE TEKNİĞİ (RİSKLİ KRİTİK)
    if (bi.customId === 'zindan_golge') {
      const sans = Math.random();
      if (sans > 0.4) {
        const taban = Math.floor(Math.random() * 26) + 38; // 38-63
        const hasar = Math.round(taban * kilicBonus);
        canavarHp = Math.max(0, canavarHp - hasar);
        sonOlay = `💥 **KRİTİK GÖLGE BIÇAĞI!** Gölgelerin içinden sıyrılıp canavara **${hasar} Hasar** indirdin!`;
      } else {
        sonOlay = `💨 Gölge tekniğin boşa savruldu, canavar hamleni çeviklikle savuşturdu!`;
      }
    }

    // ==========================================
    // CANAVAR ÖLDÜ MÜ? -> HAZİNE SANDIĞI SEÇİMİ!
    // ==========================================
    if (canavarHp <= 0) {
      savasCollector.stop('zafer');

      // Zafer sonrası 2 sandık seçimi sunalım!
      const sandikEmbed = kageEmbed({
        baslik: `👑 CANAVAR DEVRİLDİ! • ${secilenZindan.ad}`,
        renk: TEMA.RENKLER.BASARI,
        aciklama: `**${secilenZindan.canavar}** son nefesini vererek yere serildi!\n\n` +
          `Arkasındaki gizli hazine odasında iki parıldayan sandık belirdi.\n` +
          `Birini seç: **Biri BÜYÜK HAZİNE (+%50 Bonus Ryo ve Garanti Nadir Eşya)**, diğeri Standart Ganimet!\n\n` +
          `⏳ *15 saniye içinde bir sandık seç:*`,
        footer: `Kage Zindan RPG • Şansını dene!`
      });

      const sandikRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sandik_sol')
          .setLabel('📦 Sol Sandık (Ay Taşı)')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('sandik_sag')
          .setLabel('📦 Sağ Sandık (Güneş Taşı)')
          .setStyle(ButtonStyle.Success)
      );

      const sandikMesaji = await bi.message.edit({
        embeds: [sandikEmbed],
        components: [sandikRow]
      });

      let superSandikMi = false;
      try {
        const sandikTiklama = await sandikMesaji.awaitMessageComponent({
          componentType: ComponentType.Button,
          filter: i => i.user.id === userId,
          time: 15000
        });
        await sandikTiklama.deferUpdate();
        // %50 şansla büyük hazine sandığı
        superSandikMi = Math.random() < 0.5;
      } catch {
        superSandikMi = false;
      }

      let tabanRyo = Math.floor(Math.random() * (secilenZindan.maxRyo - secilenZindan.minRyo + 1)) + secilenZindan.minRyo;
      let kazanilanRyo = superSandikMi ? Math.round(tabanRyo * 1.5) : tabanRyo;

      let dusenItem = null;
      // Süper sandıkta %100, normalde %70 eşya
      if (superSandikMi || Math.random() < 0.70) {
        dusenItem = secilenZindan.lootTablosu[Math.floor(Math.random() * secilenZindan.lootTablosu.length)];
      }

      zindanZaferiDetayli(userId, kazanilanRyo, dusenItem);

      const nihaiZaferEmbed = kageEmbed({
        baslik: `🏆 ZİNDAN FETİH EDİLDİ & ZAFER! • ${secilenZindan.ad}`,
        renk: TEMA.RENKLER.BASARI,
        aciklama: `**Tebrikler Şanlı Samuray!**\n\n` +
          (superSandikMi
            ? `🌟 **ŞANS SENİNLEYDİ!** Açtığın sandık **EFSANEVİ BÜYÜK HAZİNE SANDIĞI** çıktı! (+%50 Bonus Ryo)\n\n`
            : `📦 Standart sandığı açtın ve zindan hazinelerini heybene doldurdun!\n\n`) +
          `*${rastgeleSlogan()}*`,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
        alanlar: [
          { name: '💰 Yağmalanan Ryo', value: `\`+${kazanilanRyo} Ryo\``, inline: true },
          { name: '🎒 Düşen Eşya', value: dusenItem ? `**${dusenItem}** *(Çantana eklendi)*` : '*Özel eşya bulunamadı.*', inline: true },
          { name: '🗡️ Kullanılan Silah', value: `${kilic.ad} (+%${kilic.bonus})`, inline: false }
        ],
        footer: `Eşyalarını görmek için /envanter yazabilirsin • kage95.com`
      });

      return bi.message.edit({ embeds: [nihaiZaferEmbed], components: [] });
    }

    // ==========================================
    // CANAVARIN KARŞI SALDIRISI
    // ==========================================
    let canavarHasar = Math.floor(Math.random() * (secilenZindan.maxAtk - secilenZindan.minAtk + 1)) + secilenZindan.minAtk;

    if (blokAktif) {
      const blokAzaltma = secilenZindan.id === 'buzul_magara' ? 0.75 : 0.65;
      canavarHasar = Math.max(2, Math.round(canavarHasar * (1 - blokAzaltma)));
      sonOlay += `\n🛡️ **KUSURSUZ BLOK!** Gelen darbeyi katananla karşıladın, hasar **${canavarHasar} HP**'ye düştü!`;
      blokAktif = false;
    } else {
      sonOlay += `\n👾 **${secilenZindan.canavar}** öfkeyle karşı atağa geçti ve sana **${canavarHasar} Hasar** vurdu!`;
    }

    oyuncuHp = Math.max(0, oyuncuHp - canavarHasar);

    // ==========================================
    // OYUNCU ÖLDÜ MÜ? -> ÖLÜM CEZASI & EŞYA KAYBI!
    // ==========================================
    if (oyuncuHp <= 0) {
      savasCollector.stop('oldu');

      const olumSonucu = olumCezasiUygula(userId);

      const olumEmbed = kageEmbed({
        baslik: `💀 ZİNDANDA CAN VERDİNİZ • ${secilenZindan.ad}`,
        renk: TEMA.RENKLER.HATA,
        aciklama: `**${interaction.user.username}**, **${secilenZindan.canavar}** karşısında ağır yaralandı ve zindanın soğuk zeminine yığıldı!\n\n` +
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
