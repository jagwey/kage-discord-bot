import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, duelloSonucuKaydet, ryoDus, ryoEkle, MAKS_BAHIS } from '../services/ekonomiServisi.js';
import { canCubugu, ryoYaz } from '../config/oyunGorsel.js';

export const data = new SlashCommandBuilder()
  .setName('duello')
  .setDescription('Başka bir üyeye samuray düellosu meydan okur (İsteğe bağlı Ryo bahsiyle).')
  .addUserOption(opt =>
    opt.setName('rakip')
      .setDescription('Meydan okumak istediğiniz üye')
      .setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription(`Ortaya konulacak Ryo bahsi (0 - ${MAKS_BAHIS}, varsayılan: 0)`)
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(MAKS_BAHIS)
  );

const SIRA_SURESI_MS = 30000;
const MAKS_DOVUS_MS = 5 * 60 * 1000;
const MEDITASYON_HAKKI = 2;

const rastgele = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

export async function execute(interaction) {
  const rakip = interaction.options.getUser('rakip');
  const bahis = interaction.options.getInteger('bahis') || 0;
  const meydanOkuyan = interaction.user;

  if (rakip.id === meydanOkuyan.id) {
    return interaction.reply({
      content: '⛩️ Kendi kılıcınla kendi gölgeni kesemezsin! Başka bir samuraya meydan oku.',
      flags: MessageFlags.Ephemeral
    });
  }

  if (rakip.bot) {
    return interaction.reply({
      content: '🤖 Yapay zeka ve botlara kılıç çekemezsin. Etli kemikli bir savaşçı seç!',
      flags: MessageFlags.Ephemeral
    });
  }

  if (bahis > 0) {
    const bM = bakiyeGetir(meydanOkuyan.id);
    const bR = bakiyeGetir(rakip.id);
    if (bM.ryo < bahis) {
      return interaction.reply({
        content: `❌ Yeterli Ryo'nuz yok! Bakiyeniz: **${ryoYaz(bM.ryo)}**, istenen bahis: **${ryoYaz(bahis)}**.`,
        flags: MessageFlags.Ephemeral
      });
    }
    if (bR.ryo < bahis) {
      return interaction.reply({
        content: `❌ Rakibiniz ${rakip.username} bu bahsi karşılayacak kadar Ryo'ya sahip değil! (Bakiyesi: **${ryoYaz(bR.ryo)}**)`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  const davetRow = (kapali = false) => new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('duello_kabul')
      .setLabel('Kılıcını Çek')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.KATANA)
      .setDisabled(kapali),
    new ButtonBuilder()
      .setCustomId('duello_red')
      .setLabel('Geri Çekil')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🏳️')
      .setDisabled(kapali)
  );

  const yanit = await interaction.reply({
    content: `${rakip}`,
    embeds: [kageEmbed({
      baslik: '⚔️ KANLI DÜELLO MEYDAN OKUMASI!',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**${meydanOkuyan.username}**, katanasını kınından çıkarıp **${rakip}** savaşçısına meydan okudu!\n\n` +
        `🪙 **Ortadaki Bahis:** ${bahis > 0 ? `**${ryoYaz(bahis * 2)}** (${bahis} + ${bahis})` : 'Sadece onur ve şeref'}\n\n` +
        `Ey ${rakip}, bu onurlu çarpışmayı kabul ediyor musun?`,
      altMetin: '60 saniye içinde yanıt verilmezse düello iptal edilir.'
    })],
    components: [davetRow()],
    fetchReply: true
  });

  let baslandi = false;

  const davetCollector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  davetCollector.on('collect', async i => {
    if (i.user.id !== rakip.id) {
      return i.reply({ content: 'Bu düello senin için değil!', flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    if (i.customId === 'duello_red') {
      davetCollector.stop('red');
      return i.update({
        content: `🏳️ **${rakip.username}** kılıcını kınına soktu ve gölgeler arasına çekildi. Düello iptal edildi.`,
        embeds: [],
        components: []
      }).catch(() => null);
    }

    if (i.customId !== 'duello_kabul') return;
    await i.deferUpdate().catch(() => null);
    baslandi = true;
    davetCollector.stop('kabul');

    // Bahisleri kontrollü düş; ikincisi başarısız olursa ilkini iade et.
    if (bahis > 0) {
      if (!ryoDus(meydanOkuyan.id, bahis, 'düello bahis')) {
        return yanit.edit({
          content: `❌ ${meydanOkuyan.username}'in bakiyesi artık bahse yetmiyor. Düello iptal.`,
          embeds: [], components: []
        }).catch(() => null);
      }
      if (!ryoDus(rakip.id, bahis, 'düello bahis')) {
        ryoEkle(meydanOkuyan.id, bahis, 'düello iade');
        return yanit.edit({
          content: `❌ ${rakip.username}'in bakiyesi artık bahse yetmiyor. Düello iptal, bahis iade edildi.`,
          embeds: [], components: []
        }).catch(() => null);
      }
    }

    dovusuBaslat();
  });

  davetCollector.on('end', (_toplanan, neden) => {
    if (neden === 'time' && !baslandi) {
      yanit.edit({
        content: `⌛ **${rakip.username}** cevap vermedi. Düello iptal edildi.`,
        embeds: [], components: []
      }).catch(() => null);
    }
  });

  function dovusuBaslat() {
    const oyuncular = {
      [meydanOkuyan.id]: { kullanici: meydanOkuyan, hp: 100, savunma: false, meditasyon: MEDITASYON_HAKKI },
      [rakip.id]: { kullanici: rakip, hp: 100, savunma: false, meditasyon: MEDITASYON_HAKKI }
    };
    let sira = Math.random() < 0.5 ? meydanOkuyan : rakip;
    let tur = 1;
    let bitti = false;
    let sureAsimi = null;
    const kayit = ['Çelik sesleri yükseliyor! İlk hamleyi kim yapacak?'];
    const kayitEkle = metin => { kayit.push(metin); while (kayit.length > 3) kayit.shift(); };
    const digeri = k => (k.id === meydanOkuyan.id ? rakip : meydanOkuyan);

    const arenaGonder = (sonMesaj = null) => {
      const p1 = oyuncular[meydanOkuyan.id];
      const p2 = oyuncular[rakip.id];
      const durum = o => `${o.savunma ? '🛡️ ' : ''}${o.meditasyon > 0 ? `🧘×${o.meditasyon}` : ''}`.trim();
      const embed = kageEmbed({
        baslik: `⚔️ SAMURAY MEYDANI • TUR #${tur}`,
        renk: bitti ? TEMA.RENKLER.ALTIN : TEMA.RENKLER.KAN_KIRMIZISI,
        aciklama:
          `**${meydanOkuyan.username}** ${durum(p1)}\n${canCubugu(p1.hp)}\n\n` +
          `**${rakip.username}** ${durum(p2)}\n${canCubugu(p2.hp)}\n\n` +
          `📜 **Olay Günlüğü**\n${kayit.map(k => `> ${k}`).join('\n')}\n\n` +
          (sonMesaj || `👉 **Sıra:** ${sira}`),
        altMetin: bahis > 0 ? `Havuz: ${ryoYaz(bahis * 2)} • Her hamle için 30 sn` : 'Dostluk düellosu • Her hamle için 30 sn'
      });

      const satir = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hamle_katana').setLabel('Katana (20-30)')
          .setStyle(ButtonStyle.Primary).setEmoji('🗡️').setDisabled(bitti),
        new ButtonBuilder().setCustomId('hamle_golge').setLabel('Gölge (10-45)')
          .setStyle(ButtonStyle.Secondary).setEmoji('🌪️').setDisabled(bitti),
        new ButtonBuilder().setCustomId('hamle_savunma').setLabel('Kalkan')
          .setStyle(ButtonStyle.Success).setEmoji('🛡️').setDisabled(bitti),
        new ButtonBuilder().setCustomId('hamle_meditasyon').setLabel('Meditasyon (+15-25)')
          .setStyle(ButtonStyle.Secondary).setEmoji('🧘')
          .setDisabled(bitti || oyuncular[sira.id].meditasyon <= 0)
      );

      return yanit.edit({
        content: bitti ? '🏁 Dövüş bitti!' : `${sira} hamleni seç! (30 sn)`,
        embeds: [embed],
        components: [satir]
      }).catch(() => null);
    };

    /** Kazananı ilan eder, ödülü verir. */
    const bitir = async (kazanan, kaybeden, neden) => {
      bitti = true;
      clearTimeout(sureAsimi);
      dovusCollector.stop('bitti');
      duelloSonucuKaydet(kazanan.id, kaybeden.id, bahis * 2);
      await arenaGonder(
        `👑 **ZAFER!** **${kazanan.username}** ${neden}` +
        (bahis > 0 ? `\n🪙 **${ryoYaz(bahis * 2)}** kazandı!` : '')
      );
    };

    const sureyiKur = () => {
      clearTimeout(sureAsimi);
      sureAsimi = setTimeout(() => {
        if (bitti) return;
        const kaybeden = sira;
        const kazanan = digeri(sira);
        kayitEkle(`⌛ **${kaybeden.username}** hamle yapmadı, teslim sayıldı.`);
        bitir(kazanan, kaybeden, 'rakibin teslim olmasıyla meydanın galibi oldu!');
      }, SIRA_SURESI_MS);
    };

    const dovusCollector = yanit.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: MAKS_DOVUS_MS
    });

    dovusCollector.on('collect', async bi => {
      if (bi.user.id !== sira.id) {
        const katilimci = bi.user.id === meydanOkuyan.id || bi.user.id === rakip.id;
        return bi.reply({
          content: katilimci ? 'Şu an rakibinin sırası, bekle!' : 'Bu düelloda yerin yok.',
          flags: MessageFlags.Ephemeral
        }).catch(() => null);
      }
      await bi.deferUpdate().catch(() => null);
      if (bitti) return;

      const saldiran = sira;
      const hedef = digeri(sira);
      const ben = oyuncular[saldiran.id];
      const o = oyuncular[hedef.id];
      const kilic = bakiyeGetir(saldiran.id).kilic;
      const bonus = 1 + ((kilic?.bonus || 0) / 100);
      const kilicAdi = kilic?.ad || 'Katana';

      /** Hasarı uygular, kalkanı tüketir. */
      const vur = (ham) => {
        let hasar = Math.round(ham * bonus);
        let kalkanli = false;
        if (o.savunma) { hasar = Math.round(hasar * 0.5); o.savunma = false; kalkanli = true; }
        o.hp = Math.max(0, o.hp - hasar);
        return { hasar, kalkanli };
      };

      if (bi.customId === 'hamle_savunma') {
        ben.savunma = true;
        kayitEkle(`🛡️ **${saldiran.username}** savunma duruşuna geçti, sıradaki hasar yarıya inecek.`);
      } else if (bi.customId === 'hamle_meditasyon') {
        if (ben.meditasyon <= 0) {
          return bi.followUp({ content: 'Meditasyon hakkın kalmadı.', flags: MessageFlags.Ephemeral }).catch(() => null);
        }
        ben.meditasyon--;
        const iyilesme = Math.min(100 - ben.hp, rastgele(15, 25));
        ben.hp += iyilesme;
        kayitEkle(`🧘 **${saldiran.username}** nefesini topladı, **+${iyilesme} HP**.`);
      } else if (bi.customId === 'hamle_katana') {
        const { hasar, kalkanli } = vur(rastgele(20, 30));
        kayitEkle(`🗡️ **${saldiran.username}** [${kilicAdi}] ile **${hasar}** hasar vurdu${kalkanli ? ' (kalkan kırdı)' : ''}.`);
      } else if (bi.customId === 'hamle_golge') {
        const kritik = Math.random() > 0.75;
        const { hasar, kalkanli } = vur(Math.round(rastgele(10, 45) * (kritik ? 1.5 : 1)));
        kayitEkle(kritik
          ? `💥 **KRİTİK!** **${saldiran.username}** gölgelerden çıkıp **${hasar}** hasar indirdi${kalkanli ? ' (kalkan kırdı)' : ''}!`
          : `🌪️ **${saldiran.username}** gölgelere karışıp **${hasar}** hasar vurdu${kalkanli ? ' (kalkan kırdı)' : ''}.`);
      } else {
        return;
      }

      if (o.hp <= 0) {
        return bitir(saldiran, hedef, 'kılıcını zaferle havaya kaldırdı!');
      }

      sira = hedef;
      tur++;
      sureyiKur();
      await arenaGonder();
    });

    dovusCollector.on('end', async (_t, neden) => {
      if (bitti || neden === 'bitti') return;
      // Süre doldu, kimse kazanmadı: bahisleri iade et.
      bitti = true;
      clearTimeout(sureAsimi);
      if (bahis > 0) {
        ryoEkle(meydanOkuyan.id, bahis, 'düello iade');
        ryoEkle(rakip.id, bahis, 'düello iade');
      }
      kayitEkle('⏳ Düello çok uzadı, iki savaşçı da kılıcını indirdi.');
      await arenaGonder(`🤝 **BERABERLİK.** ${bahis > 0 ? 'Bahisler iade edildi.' : ''}`);
    });

    sureyiKur();
    arenaGonder();
  }
}
