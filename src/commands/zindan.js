import { gorevIlerlet } from '../services/gorevServisi.js';
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { oyunStickerEkini } from '../config/oyunGorsel.js';
import { kullaniciYoldasGetir, YOLDAS_TURLERI } from '../services/yoldasServisi.js';
import {
  bakiyeGetir,
  zindanZaferiDetayli,
  olumCezasiUygula,
  esyaVarMi,
  esyaHarca,
  ryoDus,
  zindanBeklemeKalan,
  zindanBeklemeBaslat
} from '../services/ekonomiServisi.js';
import {
  RUTBE_ESIKLERI, RELIKLER, MAKS_RELIK,
  rutbeHarfi, rutbeAcikMi, zindanProfili, relikEtkisi, seriBonusOrani,
  canavarNiyeti, canavarHasari, zaferIsle, olumIsle, zindanSiralamasi,
  NIYET_METINLERI, MAKS_ODAK, MAKS_KAT, katZindani, katOdulCarpani, yoldasSavasEtkisi
} from '../services/zindanServisi.js';

export const data = new SlashCommandBuilder()
  .setName('zindan')
  .setDescription('Rütbeli zindanlarda iblislerle savaş; seri, kalıntı ve günlük bonus kazan.')
  .addStringOption(o => o
    .setName('islem')
    .setDescription('Ne yapmak istersin? (varsayılan: sefer)')
    .addChoices(
      { name: 'Sefere çık', value: 'sefer' },
      { name: 'Zindan profilim', value: 'profil' },
      { name: 'Zindan sıralaması', value: 'siralama' }
    ));

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
    minRyo: 60,
    maxRyo: 130,
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
    minRyo: 80,
    maxRyo: 170,
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
    minRyo: 150,
    maxRyo: 300,
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
    minRyo: 170,
    maxRyo: 340,
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
    minRyo: 280,
    maxRyo: 560,
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
    minRyo: 300,
    maxRyo: 620,
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
    minRyo: 480,
    maxRyo: 1000,
    lootTablosu: ['🐉 Kadim Ejder Pulu', '👑 Şogun Altın Mührü', '🔥 Ebedi Alev Taşı'],
    ozellik: '🔥 Kızgın Magma: Zemin her tur 5 HP yakar; blok tutarsan korunursun.'
  },
  {
    id: 'hiclik_boyutu',
    rank: '🟣 S-Rank (Efsanevi)',
    ad: '🌌 Hiçlik ve Gölge Boyutu',
    canavar: 'Kage Hükümdarı Ruhu (Nihai Boss)',
    canavarHp: 350,
    minAtk: 36,
    maxAtk: 60,
    minRyo: 900,
    maxRyo: 1800,
    lootTablosu: ['👑 Kage İmparatorluk Tacı', '🌌 Hiçlik Yıldızı', '🩸 Muramasa Kan Çeliği'],
    ozellik: '🌑 İkinci Faz: Hükümdarın canı yarıya inince darbeleri %30 sertleşir!'
  }
];

function canBari(mevcut, maksimum) {
  const yuzde = Math.max(0, Math.min(1, mevcut / maksimum));
  const dolu = Math.round(yuzde * 10);
  const bos = 10 - dolu;
  return `\`[${'█'.repeat(dolu)}${'░'.repeat(bos)}]\` **${mevcut}/${maksimum} HP**`;
}

function profilEmbedi(kullanici) {
  const p = zindanProfili(kullanici.id);
  const rutbeler = Object.entries(RUTBE_ESIKLERI)
    .map(([harf, esik]) => (rutbeAcikMi(harf, p.zafer) ? `✅ ${harf}` : `🔒 ${harf} (${esik} zafer)`))
    .join('  ');
  const relikMetni = p.relikler.length
    ? p.relikler.map(id => `${RELIKLER[id].emoji} **${RELIKLER[id].ad}**: ${RELIKLER[id].aciklama}`).join('\n')
    : '*Henüz kalıntın yok. Zindan zaferlerinde düşebilir.*';
  return kageEmbed({
    baslik: `📜 ZİNDAN SİCİLİ • ${kullanici.username}`,
    renk: TEMA.RENKLER.ALTIN,
    aciklama: `**Rütbeler:** ${rutbeler}\n\n**Kalıntılar (${p.relikler.length}/${MAKS_RELIK}):**\n${relikMetni}`,
    thumbnail: kullanici.displayAvatarURL({ dynamic: true }),
    alanlar: [
      { name: 'Zafer', value: String(p.zafer), inline: true },
      { name: 'Ölüm', value: String(p.olum), inline: true },
      { name: 'Seri', value: `${p.seri} (+%${Math.round(seriBonusOrani(p.seri) * 100)} sonraki ödül)`, inline: true },
      { name: 'En iyi seri', value: String(p.enIyiSeri), inline: true },
      { name: 'En derin kat', value: `${p.enDerinKat}/${MAKS_KAT}`, inline: true },
      { name: 'Temizlenen zindan', value: String(Object.keys(p.temizlenen).length), inline: true }
    ],
    altMetin: 'Seri ölünce sıfırlanır; geri çekilmek seriyi bozmaz.'
  });
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  const islem = interaction.options.getString('islem') || 'sefer';

  if (islem === 'profil') {
    return interaction.reply({ embeds: [profilEmbedi(interaction.user)] });
  }
  if (islem === 'siralama') {
    const liste = zindanSiralamasi(10);
    const metin = liste.length
      ? liste.map((x, i) => `${i + 1}. <@${x.uid}> — **${x.zafer}** zafer (en iyi seri ${x.enIyiSeri})`).join('\n')
      : 'Henüz kimse bir zindanı fethetmedi.';
    return interaction.reply({
      embeds: [kageEmbed({ baslik: '🏆 ZİNDAN SIRALAMASI', renk: TEMA.RENKLER.ALTIN, aciklama: metin })]
    });
  }

  const kalanMs = zindanBeklemeKalan(userId);
  if (kalanMs > 0) {
    const dk = Math.floor(kalanMs / 60000);
    const sn = Math.ceil((kalanMs % 60000) / 1000);
    return interaction.reply({
      content: `⏳ Katanan dinleniyor. Yeni zindan için **${dk}dk ${sn}sn** bekle.`,
      flags: MessageFlags.Ephemeral
    });
  }
  zindanBeklemeBaslat(userId);
  const bakiye = bakiyeGetir(userId);
  const kilic = bakiye.kilic;
  const kilicBonus = 1 + ((kilic?.bonus || 0) / 100);

  const profil = zindanProfili(userId);
  const etki = relikEtkisi(profil.relikler);

  // Yalnızca açılmış rütbelerdeki zindanlardan rastgele 3 farklı zindan seç
  const acikHavuz = ZINDAN_HAVUZU.filter(z => rutbeAcikMi(rutbeHarfi(z.rank), profil.zafer));
  const sonrakiKilit = Object.entries(RUTBE_ESIKLERI).find(([harf, esik]) => profil.zafer < esik);
  const karistirilmis = [...acikHavuz].sort(() => 0.5 - Math.random());
  let secenekler = karistirilmis.slice(0, 3);
  if (!secenekler.length) {
    secenekler = ZINDAN_HAVUZU.filter(z => rutbeHarfi(z.rank) === 'D').slice(0, 3);
  }
  if (!secenekler.length) secenekler = ZINDAN_HAVUZU.slice(0, 3);

  // 1. AŞAMA: ZİNDAN PORTALI & KAPI SEÇİMİ
  const kapiSecimEmbed = kageEmbed({
    baslik: '🌀 GÖLGE PORTALI AÇILDI • ZİNDANINI SEÇ!',
    renk: TEMA.RENKLER.BILGI,
    aciklama: `Karanlık gölge enerjisi yarıldı ve önüne üç gizemli boyut kapısı açıldı!\n` +
      `Kılıcını çek ve girmek istediğin zindanı seç. Kararsızlık samurayın sonudur!\n\n` +
      `⏳ **Süre:** \`30 Saniye\` içinde bir kapı seçmek zorundasın!\n` +
      `⚠️ **Ceza:** Zamanında kapı seçmezsen portal çöker ve kesenden **50 Ryo** yutulur!\n` +
      `🔥 **Seri:** ${profil.seri} zafer • **Zindan zaferin:** ${profil.zafer}` +
      (sonrakiKilit ? `\n🔒 Sıradaki rütbe **${sonrakiKilit[0]}** için ${sonrakiKilit[1] - profil.zafer} zafer daha gerekli.` : ''),
    alanlar: secenekler.map((z, idx) => ({
      name: `🚪 [KAPI ${idx + 1}] ${z.ad} — ${z.rank}`,
      value: `👾 **Boss:** \`${z.canavar}\` (${z.canavarHp} HP)\n` +
        `💰 **Ganimet:** \`~${z.minRyo} - ${z.maxRyo} Ryo\`\n` +
        `📜 **Özellik:** *${z.ozellik}*`,
      inline: false
    })),
    altMetin: `Kuşandığın Katana: ${kilic.ad} (+%${kilic.bonus} Hasar)`
  });

  const kapiStilleri = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger];
  const kapiRow = new ActionRowBuilder().addComponents(
    secenekler.map((z, i) =>
      new ButtonBuilder()
        .setCustomId(`kapi_${i}`)
        .setLabel(`Kapı ${i + 1}: ${z.ad.split(' ')[1] || `Zindan ${i + 1}`}`.slice(0, 80))
        .setStyle(kapiStilleri[i])
        .setEmoji('🚪')
    )
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
      ryoDus(userId, ceza, 'Zindan kararsızlık cezası');
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
      altMetin: `Kage Zindan RPG • Kararsızlık cezalandırılır.`
    });

    return portalMesaji.edit({ embeds: [zamanAsimiEmbed], components: [] });
  }

  // ==========================================
  // 2. AŞAMA: SAVAŞ ARENASI (SEÇİLEN ZİNDAN)
  // ==========================================
  const aktifYoldas = kullaniciYoldasGetir(userId);
  const yoldasTuru = aktifYoldas ? YOLDAS_TURLERI[aktifYoldas.turId] : null;
  const yEtki = yoldasSavasEtkisi(aktifYoldas, yoldasTuru);

  const maxOyuncuHp = 100 + etki.ekCan;
  let oyuncuHp = maxOyuncuHp;
  let kat = 1;
  let aktifZindan = katZindani(secilenZindan, kat);
  let canavarHp = aktifZindan.canavarHp;
  let maxCanavarHp = aktifZindan.canavarHp;
  let niyet = canavarNiyeti();
  let tur = 1;
  let odak = 0;
  let blokAktif = false;
  let ikinciFaz = false;
  // 'savas': hamle bekleniyor, 'karar': zafer sonrası derine in / ganimeti al seçimi.
  let asama = 'savas';
  let bitti = false;
  let mesgul = false;
  let sonOlay = `🚪 **${secilenZindan.ad}** kapısından içeri adım attın. Karanlığın içinden **${secilenZindan.canavar}** kükreyerek üzerine atıldı!`;

  const odakBari = () => '🔷'.repeat(odak) + '▫️'.repeat(MAKS_ODAK - odak);

  const arenaGuncelle = async () => {
    const yoldasSatiri = aktifYoldas && yoldasTuru && yoldasTuru.bonusTip !== 'ryo'
      ? `🐾 **Yoldaş:** ${aktifYoldas.ad} (${yoldasTuru.bonusTip})\n`
      : '';
    const embed = kageEmbed({
      baslik: `⚔️ SAVAŞ ARENASI • ${secilenZindan.ad}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**Boyut Seviyesi:** ${secilenZindan.rank} | **Kat:** ${kat}/${MAKS_KAT} | **Tur:** #${tur}\n\n` +
        `👤 **${interaction.user.username}** [${kilic.ad}]:\n${canBari(oyuncuHp, maxOyuncuHp)}\n` +
        `🎯 **Odak:** ${odakBari()}${odak >= MAKS_ODAK ? ' **Gölge Tekniği garanti!**' : ''}\n` +
        yoldasSatiri + `\n` +
        `👾 **${secilenZindan.canavar}**${kat > 1 ? ` *(Kat ${kat} • Öfkeli)*` : ''}${ikinciFaz ? ' 🌑 **2. FAZ**' : ''}:\n${canBari(canavarHp, maxCanavarHp)}\n` +
        `${NIYET_METINLERI[niyet]}\n\n` +
        `📜 **Meydan Durumu:**\n${sonOlay}\n\n` +
        `✨ **Zindan Özelliği:** *${secilenZindan.ozellik}*`,
      altMetin: `Saldır odak biriktirir • Ağır hamleye blok karşı vuruş kazandırır`
    });

    const golgeHazir = odak >= MAKS_ODAK;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('zindan_saldir').setLabel('Saldır').setEmoji('🗡️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('zindan_blok').setLabel('Savun/Blok').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('zindan_golge')
        .setLabel(golgeHazir ? 'Gölge Tekniği • GARANTİ' : `Gölge Tekniği (${odak}/${MAKS_ODAK})`)
        .setEmoji('💥')
        .setStyle(golgeHazir ? ButtonStyle.Success : ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('zindan_iksir').setLabel('Can İksiri').setEmoji('🧪').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('zindan_kac').setLabel('Geri Çekil').setEmoji('🏃‍♂️').setStyle(ButtonStyle.Secondary)
    );

    return portalMesaji.edit({ embeds: [embed], components: [row] });
  };

  const kararGoster = async () => {
    const sonraki = kat + 1;
    const embed = kageEmbed({
      baslik: `👑 KAT ${kat} TEMİZLENDİ! • ${secilenZindan.ad}`,
      renk: TEMA.RENKLER.BASARI,
      aciklama: `**${secilenZindan.canavar}** yere serildi ama zindanın dibinden daha derin bir kükreme geliyor...\n\n` +
        `❤️ **Canın:** ${oyuncuHp}/${maxOyuncuHp} *(inersen +20 HP dinlenirsin)*\n` +
        `🎯 **Odak:** ${odakBari()} *(korunur)*\n\n` +
        `💰 **Şu anki ganimet çarpanı:** x${katOdulCarpani(kat)}\n` +
        `🕳️ **Kat ${sonraki} çarpanı:** x${katOdulCarpani(sonraki)} *(canavar %25 daha güçlü)*\n\n` +
        `⚠️ Aşağıda ölürsen biriken ganimetin **tamamı** kaybolur.\n` +
        `⏳ *60 saniye içinde seçmezsen ganimeti alıp çıkarsın.*`,
      altMetin: 'Açgözlülük mü, bilgelik mi? Karar senin samuray.'
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('zindan_derin')
        .setLabel(`Derine İn (Kat ${sonraki} • x${katOdulCarpani(sonraki)})`)
        .setEmoji('🕳️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('zindan_ganimet')
        .setLabel('Ganimeti Al ve Çık')
        .setEmoji('💰')
        .setStyle(ButtonStyle.Success)
    );
    return portalMesaji.edit({ embeds: [embed], components: [row] });
  };

  await arenaGuncelle();

  const savasCollector = portalMesaji.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    idle: 60_000, // 1 dakika hamle yapılmazsa savaş biter
    time: 600_000
  });

  // Ganimeti öder ve zafer ekranını gösterir. sandikSecimi false ise sandık sorulmadan standart ganimet verilir.
  const odulVer = async (tamamlananKat, sandikSecimi) => {
    bitti = true;
    savasCollector.stop('zafer');

    let superSandikMi = false;
    if (sandikSecimi) {
      const sandikEmbed = kageEmbed({
        baslik: `💰 HAZİNE ODASI • ${secilenZindan.ad}`,
        renk: TEMA.RENKLER.BASARI,
        aciklama: `Arkasındaki gizli hazine odasında iki parıldayan sandık belirdi.\n` +
          `Birini seç: **Biri BÜYÜK HAZİNE (+%50 Bonus Ryo ve Garanti Nadir Eşya)**, diğeri Standart Ganimet!\n` +
          (tamamlananKat >= MAKS_KAT ? `🌟 *En dip kata indiğin için iki sandık da büyük hazine!*\n` : '') +
          `\n⏳ *15 saniye içinde bir sandık seç:*`,
        altMetin: `Kage Zindan RPG • Şansını dene!`
      });
      const sandikRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sandik_sol').setLabel('📦 Sol Sandık (Ay Taşı)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sandik_sag').setLabel('📦 Sağ Sandık (Güneş Taşı)').setStyle(ButtonStyle.Success)
      );
      await portalMesaji.edit({ embeds: [sandikEmbed], components: [sandikRow] });
      try {
        const sandikTiklama = await portalMesaji.awaitMessageComponent({
          componentType: ComponentType.Button,
          filter: i => i.user.id === userId,
          time: 15000
        });
        await sandikTiklama.deferUpdate();
        superSandikMi = tamamlananKat >= MAKS_KAT || Math.random() < 0.5;
      } catch {
        superSandikMi = false;
      }
    }

    const tabanRyo = Math.floor(Math.random() * (secilenZindan.maxRyo - secilenZindan.minRyo + 1)) + secilenZindan.minRyo;
    let kazanilanRyo = Math.round(tabanRyo * katOdulCarpani(tamamlananKat) * (superSandikMi ? 1.5 : 1));

    let dusenItem = null;
    // Süper sandıkta ve derin katlarda eşya garanti, normalde %70
    if (superSandikMi || tamamlananKat >= 2 || Math.random() < 0.70) {
      dusenItem = secilenZindan.lootTablosu[Math.floor(Math.random() * secilenZindan.lootTablosu.length)];
    }

    let yoldasBonusu = 0;
    if (aktifYoldas && yoldasTuru?.bonusTip === 'ryo') {
      yoldasBonusu = Math.round(kazanilanRyo * ((yoldasTuru.bonusDeger + (aktifYoldas.seviye - 1) * 3) / 100));
      kazanilanRyo += yoldasBonusu;
    }

    zindanZaferiDetayli(userId, kazanilanRyo, dusenItem);
    gorevIlerlet(userId, 'zindan');
    const bonus = zaferIsle(userId, secilenZindan, kazanilanRyo, Date.now(), Math.random, tamamlananKat);
    const bonusSatirlari = [];
    if (yoldasBonusu > 0) bonusSatirlari.push(`🐾 ${aktifYoldas.ad}: +${yoldasBonusu} Ryo`);
    if (bonus.relikBonusu) bonusSatirlari.push(`🐸 Kalıntı: +${bonus.relikBonusu}`);
    if (bonus.seriBonusu) bonusSatirlari.push(`🔥 Seri: +${bonus.seriBonusu}`);
    if (bonus.gunlukBonus) bonusSatirlari.push(`🌅 Günün ilk zaferi: +${bonus.gunlukBonus}`);

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
        { name: '🕳️ Temizlenen Kat', value: `${tamamlananKat}/${MAKS_KAT} (x${katOdulCarpani(tamamlananKat)})`, inline: true },
        { name: '🗡️ Kullanılan Silah', value: `${kilic.ad} (+%${kilic.bonus})`, inline: false },
        ...(bonusSatirlari.length
          ? [{ name: `✨ Bonus (+${bonus.bonusToplam} Ryo)`, value: bonusSatirlari.join('\n'), inline: false }]
          : []),
        { name: '🔥 Zafer Serisi', value: `${bonus.seri} • Toplam zafer: ${bonus.toplamZafer}`, inline: false },
        ...(bonus.yeniRelik
          ? [{
            name: '🎁 YENİ KALINTI!',
            value: `${RELIKLER[bonus.yeniRelik].emoji} **${RELIKLER[bonus.yeniRelik].ad}**: ${RELIKLER[bonus.yeniRelik].aciklama}`,
            inline: false
          }]
          : [])
      ],
      altMetin: `Eşyalarını görmek için /envanter yazabilirsin • kage95.com`
    });

    const { files: zaferFiles, attachmentUrl: zaferAtt } = oyunStickerEkini(interaction.user, interaction.member, 'zafer');
    if (zaferAtt) nihaiZaferEmbed.setThumbnail(zaferAtt);

    return portalMesaji.edit({ embeds: [nihaiZaferEmbed], files: zaferFiles, components: [] });
  };

  const olumGoster = async () => {
    bitti = true;
    savasCollector.stop('oldu');

    const olumSonucu = olumCezasiUygula(userId);
    const { kayipSeri } = olumIsle(userId);

    const olumEmbed = kageEmbed({
      baslik: `💀 ZİNDANDA CAN VERDİNİZ • ${secilenZindan.ad}`,
      renk: TEMA.RENKLER.HATA,
      aciklama: `**${interaction.user.username}**, **${secilenZindan.canavar}** karşısında ağır yaralandı ve zindanın soğuk zeminine yığıldı!\n\n` +
        (kat > 1 ? `🕳️ **Kat ${kat}'te düştün.** Önceki katlarda biriken ganimet karanlıkta kayboldu.\n\n` : '') +
        `🔥 **Ölüm Cezası:**\n${olumSonucu.kayipMesaji}\n\n` +
        `💰 **Kalan Cüzdanın:** \`${olumSonucu.kalanRyo} Ryo\`\n` +
        (kayipSeri > 0 ? `🔥 **${kayipSeri} zaferlik seri bozuldu.**\n` : '') + `\n` +
        `*Bir dahaki sefere /demirci ile katananı güçlendirip can iksiriyle gitmeyi unutma!*`,
      altMetin: `Kage Zindan RPG • Ölüm ciddidir.`
    });

    const { files: olumFiles, attachmentUrl: olumAtt } = oyunStickerEkini(interaction.user, interaction.member, 'aglama');
    if (olumAtt) olumEmbed.setThumbnail(olumAtt);

    return portalMesaji.edit({ embeds: [olumEmbed], files: olumFiles, components: [] });
  };

  // Kat 1'de kaçış ganimetsizdir; derin katta temizlenen katların ganimeti sandıksız ödenir.
  const kacisGoster = async (aciklama) => {
    if (kat > 1) return odulVer(kat - 1, false);
    bitti = true;
    savasCollector.stop('kacti');
    const kacisEmbed = kageEmbed({
      baslik: `🏃‍♂️ SAVAŞTAN GERİ ÇEKİLDİNİZ • ${secilenZindan.ad}`,
      renk: TEMA.RENKLER.UYARI_SARI,
      aciklama: `${aciklama}\n\n*Ganimet alamadın ama canını ve eşyalarını sağ salim kurtardın!*`
    });
    return portalMesaji.edit({ embeds: [kacisEmbed], components: [] });
  };

  const turIsle = async (customId) => {
    // ZAFER SONRASI KARAR
    if (asama === 'karar') {
      if (customId === 'zindan_ganimet') return odulVer(kat, true);
      if (customId !== 'zindan_derin') return;
      kat += 1;
      aktifZindan = katZindani(secilenZindan, kat);
      canavarHp = maxCanavarHp = aktifZindan.canavarHp;
      oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + 20);
      niyet = canavarNiyeti();
      blokAktif = false;
      ikinciFaz = false;
      asama = 'savas';
      sonOlay = `🕳️ Merdivenlerden **Kat ${kat}**'e indin, kısa bir nefeste **+20 HP** topladın. Karanlıkta daha öfkeli bir **${secilenZindan.canavar}** belirdi!`;
      return arenaGuncelle();
    }

    let turHasari = 0;
    const kalkanli = niyet === 'kalkan';

    // 1. KAÇIŞ: açık arazide garanti, diğer zindanlarda %75
    if (customId === 'zindan_kac') {
      if (secilenZindan.id === 'haydut_vadisi' || Math.random() < 0.75) {
        return kacisGoster(`**${interaction.user.username}**, canavarın ezici baskısı karşısında akıllıca bir manevra yaparak gölgelere sığındı ve zindandan kaçtı.`);
      }
      sonOlay = `🏃‍♂️ Kaçmaya çalıştın ama **${secilenZindan.canavar}** yolunu kesti!`;
    }

    // 2. SAVUNMA / BLOK
    if (customId === 'zindan_blok') {
      blokAktif = true;
      sonOlay = `🛡️ Katananı savunma pozisyonuna çektin!`;
    }

    // 3. CAN İKSİRİ İÇME
    if (customId === 'zindan_iksir') {
      const iksirVar = esyaVarMi(userId, 'İksir');
      const tazeHp = (secilenZindan.id === 'zehirli_mabet' ? 60 : 45) + etki.iksirEk;

      if (iksirVar) {
        esyaHarca(userId, 'İksir');
        oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + tazeHp);
        sonOlay = `🧪 Çantandaki iksiri kafana diktin ve **+${tazeHp} HP** tazeledin!`;
      } else {
        const guncel = bakiyeGetir(userId);
        if (guncel.ryo >= 50) {
          ryoDus(userId, 50, 'Zindan acil şifa parşömeni');
          const parsomenHp = 30 + etki.iksirEk;
          oyuncuHp = Math.min(maxOyuncuHp, oyuncuHp + parsomenHp);
          sonOlay = `🧪 Acil şifa parşömeni yaktın (\`-50 Ryo\`) ve **+${parsomenHp} HP** kazandın!`;
        } else {
          sonOlay = `❌ Çantanda iksir ve şifa parşömeni için yeterli Ryo yok! Hamleni boşa harcadın.`;
        }
      }
    }

    // 4. NORMAL KATANA SALDIRISI: odak biriktirir, kalkana karşı yarı hasar
    if (customId === 'zindan_saldir') {
      const ekZindanBonus = secilenZindan.id === 'kanli_torii' ? 5 : 0;
      const taban = Math.floor(Math.random() * 16) + 20; // 20-35
      let hasar = Math.round(taban * kilicBonus * etki.hasarCarpani) + ekZindanBonus;
      if (kalkanli) hasar = Math.round(hasar / 2);
      odak = Math.min(MAKS_ODAK, odak + 1);
      if (secilenZindan.id === 'bambu_ormani' && Math.random() < 0.2) {
        sonOlay = `🌫️ Bambu ormanının sisi içinde canavarı gözden kaybettin, darben boşa gitti! *(+1 odak)*`;
      } else {
        canavarHp = Math.max(0, canavarHp - hasar);
        turHasari += hasar;
        sonOlay = `🗡️ **${kilic.ad}** ile seri bir darbe savurdun ve canavara **${hasar} Hasar** verdin!` +
          (kalkanli ? ' *(kalkan darbeyi yarıya indirdi)*' : '') + ` *(+1 odak)*`;
      }
    }

    // 5. GÖLGE TEKNİĞİ: odak başına +%15 şans, tam odakta garanti; kalkanı parçalar
    if (customId === 'zindan_golge') {
      const garanti = odak >= MAKS_ODAK;
      const sans = 0.6 + etki.golgeSans + yEtki.kritik + odak * 0.15;
      odak = 0;
      if (garanti || Math.random() < sans) {
        const taban = Math.floor(Math.random() * 26) + 38; // 38-63
        let hasar = Math.round(taban * kilicBonus * etki.hasarCarpani);
        if (garanti) hasar = Math.round(hasar * 1.2);
        if (kalkanli) hasar = Math.round(hasar * 1.25);
        canavarHp = Math.max(0, canavarHp - hasar);
        turHasari += hasar;
        sonOlay = (garanti ? `💥 **ODAKLANMIŞ GÖLGE BIÇAĞI!**` : `💥 **KRİTİK GÖLGE BIÇAĞI!**`) +
          ` Gölgelerin içinden sıyrılıp canavara **${hasar} Hasar** indirdin!` +
          (kalkanli ? ' 🛡️ **Kalkanı parçaladın!**' : '');
      } else {
        sonOlay = `💨 Gölge tekniğin boşa savruldu, canavar hamleni çeviklikle savuşturdu!`;
      }
    }

    // Hiçlik Boyutu: can yarıya inince ikinci faz bir kez duyurulur
    if (secilenZindan.id === 'hiclik_boyutu' && !ikinciFaz && canavarHp > 0 && canavarHp <= maxCanavarHp / 2) {
      ikinciFaz = true;
      sonOlay += `\n🌑 **İKİNCİ FAZ!** Hükümdar ruhu gerçek formuna büründü, darbeleri artık %30 daha sert!`;
    }

    if (canavarHp <= 0) return zaferSonrasi();

    // ==========================================
    // CANAVARIN HAMLESİ
    // ==========================================
    if (niyet === 'kalkan') {
      sonOlay += `\n🛡️ **${secilenZindan.canavar}** siperinden çıkmadı, bu tur saldırmadı.`;
      blokAktif = false;
    } else if (niyet === 'sifa') {
      if (turHasari >= 30) {
        sonOlay += `\n✂️ Sert darben **${secilenZindan.canavar}**'nın şifasını böldü!`;
      } else {
        const sifa = Math.round(maxCanavarHp * 0.12);
        canavarHp = Math.min(maxCanavarHp, canavarHp + sifa);
        sonOlay += `\n💚 **${secilenZindan.canavar}** yaralarını sardı ve **+${sifa} HP** topladı.`;
      }
      blokAktif = false;
    } else {
      let canavarHasar = canavarHasari(aktifZindan, niyet, canavarHp);
      const agirHamleydi = niyet === 'agir';

      if (Math.random() < yEtki.kacinma) {
        canavarHasar = 0;
        sonOlay += `\n🦅 **${aktifYoldas.ad}** çığlık atarak uyardı, darbeden tamamen sıyrıldın!`;
      } else if (blokAktif) {
        const blokAzaltma = secilenZindan.id === 'buzul_magara' ? 0.75 : 0.65;
        canavarHasar = Math.max(2, Math.round(canavarHasar * (1 - blokAzaltma)));
        if (agirHamleydi) {
          const karsi = Math.round((Math.floor(Math.random() * 11) + 15) * kilicBonus);
          canavarHp = Math.max(0, canavarHp - karsi);
          odak = Math.min(MAKS_ODAK, odak + 1);
          sonOlay += `\n⚔️ **KUSURSUZ SAVUŞTURMA!** Ağır hamleyi karşıladın (**${canavarHasar} HP** aldın) ve anında **${karsi} Hasar** ile karşı vurdun! *(+1 odak)*`;
        } else {
          sonOlay += `\n🛡️ **BLOK!** Gelen darbeyi katananla karşıladın, hasar **${canavarHasar} HP**'ye düştü!`;
        }
      } else {
        sonOlay += agirHamleydi
          ? `\n💢 **${secilenZindan.canavar}** ağır hamlesini indirdi ve sana **${canavarHasar} Hasar** vurdu!`
          : `\n👾 **${secilenZindan.canavar}** öfkeyle karşı atağa geçti ve sana **${canavarHasar} Hasar** vurdu!`;
      }
      if (canavarHasar > 0 && yEtki.savunma > 0) {
        const azalan = Math.round(canavarHasar * yEtki.savunma);
        canavarHasar -= azalan;
        if (azalan > 0) sonOlay += ` *(🐉 ${aktifYoldas.ad} ${azalan} hasarı emdi)*`;
      }
      oyuncuHp = Math.max(0, oyuncuHp - canavarHasar);
      blokAktif = false;
    }

    // Magma Tapınağı: kızgın zemin her tur yakar, blok tutan korunur
    if (secilenZindan.id === 'magma_tapinagi') {
      if (customId === 'zindan_blok') {
        sonOlay += `\n🔥 Siperin seni kızgın magmadan da korudu.`;
      } else {
        oyuncuHp = Math.max(0, oyuncuHp - 5);
        sonOlay += `\n🔥 Kızgın zemin ayaklarını yaktı: **-5 HP**.`;
      }
    }

    if (canavarHp <= 0) return zaferSonrasi();
    if (oyuncuHp <= 0) return olumGoster();

    niyet = canavarNiyeti(Math.random, canavarHp / maxCanavarHp);
    tur++;
    return arenaGuncelle();
  };

  const zaferSonrasi = async () => {
    if (kat >= MAKS_KAT) return odulVer(kat, true);
    asama = 'karar';
    return kararGoster();
  };

  savasCollector.on('collect', async bi => {
    await bi.deferUpdate().catch(() => null);
    // Hızlı çift tıklamada iki tur aynı anda işlenmesin
    if (mesgul || bitti) return;
    mesgul = true;
    try {
      await turIsle(bi.customId);
    } catch (err) {
      console.error('[Zindan] Tur işlenemedi:', err.message);
    } finally {
      mesgul = false;
    }
  });

  savasCollector.on('end', async (_, sebep) => {
    if (bitti || (sebep !== 'idle' && sebep !== 'time')) return;
    try {
      // Karar ekranında süre dolarsa ganimet alınır; savaşta dolarsa geri çekilmiş sayılır.
      if (asama === 'karar') return await odulVer(kat, false);
      await kacisGoster(`⏳ **${interaction.user.username}** hamle yapmadan çok bekledi; **${secilenZindan.canavar}** gölgelere çekildi ve savaş yarım kaldı.`);
    } catch (err) {
      console.error('[Zindan] Süre sonu işlenemedi:', err.message);
    }
  });
}
