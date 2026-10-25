import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, duelloSonucuKaydet, ryoDus } from '../services/ekonomiServisi.js';

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
      .setDescription('Ortaya konulacak Ryo bahsi (Varsayılan: 0)')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(10000)
  );

function canBari(hp, maksHp = 100) {
  const yuzde = Math.max(0, Math.min(100, Math.round((hp / maksHp) * 100)));
  const dolu = Math.round(yuzde / 10);
  const bos = 10 - dolu;
  return `\`[${'█'.repeat(dolu)}${'-'.repeat(bos)}]\` ${hp}/${maksHp} HP`;
}

export async function execute(interaction) {
  const rakip = interaction.options.getUser('rakip');
  const bahis = interaction.options.getInteger('bahis') || 0;
  const meydanOkuyan = interaction.user;

  if (rakip.id === meydanOkuyan.id) {
    return interaction.reply({
      content: '⛩️ Kendi kılıcınla kendi gölgeni kesemezsin! Başka bir samuraya meydan oku.',
      ephemeral: true
    });
  }

  if (rakip.bot) {
    return interaction.reply({
      content: '🤖 Yapay zeka ve botlara kılıç çekemezsin. Etli kemikli bir savaşçı seç!',
      ephemeral: true
    });
  }

  // Bakiye kontrolleri
  if (bahis > 0) {
    const bM = bakiyeGetir(meydanOkuyan.id);
    const bR = bakiyeGetir(rakip.id);

    if (bM.ryo < bahis) {
      return interaction.reply({
        content: `❌ Yeterli Ryo'nuz yok! Bakiyeniz: \`${bM.ryo} Ryo\`, İstenen bahis: \`${bahis} Ryo\`.`,
        ephemeral: true
      });
    }

    if (bR.ryo < bahis) {
      return interaction.reply({
        content: `❌ Rakibiniz ${rakip.username} bu bahsi karşılayacak kadar Ryo'ya sahip değil! (Bakiyesi: \`${bR.ryo} Ryo\`)`,
        ephemeral: true
      });
    }
  }

  const meydanEmbed = kageEmbed({
    baslik: '⚔️ KANLI DÜELLO MEYDAN OKUMASI!',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**${meydanOkuyan.username}**, katanasını kınından çıkarıp **${rakip}** savaşçısına meydan okudu!\n\n` +
      `🪙 **Ortadaki Bahis:** \`${bahis > 0 ? `${bahis * 2} Ryo (${bahis} + ${bahis})` : 'Sadece Onur ve Şeref'}\`\n\n` +
      `Ey ${rakip}, bu onurlu çarpışmayı kabul ediyor musun?`,
    footer: `60 saniye içinde yanıt verilmezse düello iptal edilir.`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('duello_kabul')
      .setLabel('Kılıcını Çek (Kabul Et)')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.KATANA),
    new ButtonBuilder()
      .setCustomId('duello_red')
      .setLabel('Geri Çekil (Reddet)')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🏳️')
  );

  const yanit = await interaction.reply({
    content: `${rakip}`,
    embeds: [meydanEmbed],
    components: [row],
    fetchReply: true
  });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== rakip.id) {
      return i.reply({ content: 'Bu düello senin için değil!', ephemeral: true });
    }

    if (i.customId === 'duello_red') {
      collector.stop();
      return i.update({
        content: `🏳️ **${rakip.username}** kılıcını kınına soktu ve gölgeler arasına çekildi. Düello iptal edildi.`,
        embeds: [],
        components: []
      });
    }

    if (i.customId === 'duello_kabul') {
      collector.stop();

      // Bahis varsa düş
      if (bahis > 0) {
        ryoDus(meydanOkuyan.id, bahis);
        ryoDus(rakip.id, bahis);
      }

      // Dövüş Durumu
      let siraKimde = Math.random() < 0.5 ? meydanOkuyan : rakip;
      let hp1 = 100; // meydanOkuyan
      let hp2 = 100; // rakip
      let savunmada1 = false;
      let savunmada2 = false;
      let tur = 1;
      let sonHamle = 'Çelik sesleri yükseliyor! İlk hamleyi kim yapacak?';

      const dovusGuncelle = async (mesaj, butonlariKapat = false) => {
        const arenaEmbed = kageEmbed({
          baslik: `⚔️ SAMURAY MEYDANI • TUR #${tur}`,
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          aciklama: `**${meydanOkuyan.username}** VS **${rakip.username}**\n\n` +
            `🗡️ **${meydanOkuyan.username}:** ${canBari(hp1)}\n` +
            `🗡️ **${rakip.username}:** ${canBari(hp2)}\n\n` +
            `📜 **Son Olay:** *${sonHamle}*\n\n` +
            (butonlariKapat ? '🏁 **Dövüş Sona Erdi!**' : `👉 **Sıradaki Hamle:** ${siraKimde}`),
          footer: `Kage Dövüş Arenası • Bahis: ${bahis * 2} Ryo`
        });

        const dovusRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('hamle_katana')
            .setLabel('Katana Vuruşu (20-30)')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🗡️')
            .setDisabled(butonlariKapat),
          new ButtonBuilder()
            .setCustomId('hamle_golge')
            .setLabel('Gölge Tekniği (10-45)')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🌪️')
            .setDisabled(butonlariKapat),
          new ButtonBuilder()
            .setCustomId('hamle_savunma')
            .setLabel('Kalkan Blok (%50 Hasar Azalt)')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛡️')
            .setDisabled(butonlariKapat)
        );

        return i.message.edit({
          content: butonlariKapat ? `🏁 Dövüş bitti!` : `${siraKimde} hamleni seç! (30 sn)`,
          embeds: [arenaEmbed],
          components: [dovusRow]
        });
      };

      await dovusGuncelle(i.message);

      const dovusCollector = i.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000 // 3 dakika maks
      });

      dovusCollector.on('collect', async bi => {
        if (bi.user.id !== siraKimde.id) {
          return bi.reply({ content: 'Şu an rakibinin sırası, bekle!', ephemeral: true });
        }

        await bi.deferUpdate();

        const saldiran = siraKimde;
        const hedef = siraKimde.id === meydanOkuyan.id ? rakip : meydanOkuyan;
        const isP1 = saldiran.id === meydanOkuyan.id;

        if (bi.customId === 'hamle_savunma') {
          if (isP1) savunmada1 = true;
          else savunmada2 = true;
          sonHamle = `🛡️ **${saldiran.username}** savunma duruşuna geçti! Bir sonraki hasarı %50 kıracak.`;
        } else if (bi.customId === 'hamle_katana') {
          let hasar = Math.floor(Math.random() * 11) + 20; // 20 - 30
          if (!isP1 && savunmada1) { hasar = Math.round(hasar * 0.5); savunmada1 = false; }
          if (isP1 && savunmada2) { hasar = Math.round(hasar * 0.5); savunmada2 = false; }

          if (isP1) hp2 = Math.max(0, hp2 - hasar);
          else hp1 = Math.max(0, hp1 - hasar);

          sonHamle = `🗡️ **${saldiran.username}** kılıcını savurdu ve **${hasar} Hasar** vurdu!`;
        } else if (bi.customId === 'hamle_golge') {
          const sans = Math.random();
          let hasar = Math.floor(Math.random() * 36) + 10; // 10 - 45
          let kritik = false;

          if (sans > 0.75) {
            hasar = Math.round(hasar * 1.5);
            kritik = true;
          }

          if (!isP1 && savunmada1) { hasar = Math.round(hasar * 0.5); savunmada1 = false; }
          if (isP1 && savunmada2) { hasar = Math.round(hasar * 0.5); savunmada2 = false; }

          if (isP1) hp2 = Math.max(0, hp2 - hasar);
          else hp1 = Math.max(0, hp1 - hasar);

          sonHamle = kritik
            ? `💥 **KRİTİK VURUŞ!** **${saldiran.username}** gölge tekniğiyle rakibin arkasından vurup **${hasar} Hasar** indirdi!`
            : `🌪️ **${saldiran.username}** gölgelere karışarak **${hasar} Hasar** vurdu!`;
        }

        // Kazanan Kontrolü
        if (hp1 <= 0 || hp2 <= 0) {
          dovusCollector.stop();
          const kazanan = hp1 > 0 ? meydanOkuyan : rakip;
          const kaybeden = hp1 > 0 ? rakip : meydanOkuyan;
          const toplamOdul = bahis * 2;

          duelloSonucuKaydet(kazanan.id, kaybeden.id, toplamOdul);

          sonHamle += `\n\n👑 **ZAFER!** **${kazanan.username}** kılıcını zaferle havaya kaldırdı! ${bahis > 0 ? `\`${toplamOdul} Ryo\` kazandı!` : ''}`;
          await dovusGuncelle(bi.message, true);
          return;
        }

        // Sıra Değiştir
        siraKimde = siraKimde.id === meydanOkuyan.id ? rakip : meydanOkuyan;
        tur++;
        await dovusGuncelle(bi.message);
      });
    }
  });
}
