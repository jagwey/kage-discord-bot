import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { MARKET_URUNLERI, marketSatinAl, bakiyeGetir } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Kage samuray pazarını açar; unvanlar ve eşyalar satın alırsınız.');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bakiye = bakiyeGetir(userId);

  let aciklama = `**Cüzdanınız:** \`${bakiye.ryo} Ryo\`\n\n` +
    `Aşağıdaki eşyaları veya unvanları Ryo harcayarak satın alabilirsiniz:\n\n`;

  MARKET_URUNLERI.forEach((urun, i) => {
    aciklama += `**${i + 1}. ${urun.ad}** • \`${urun.fiyat} Ryo\`\n` +
      `*${urun.desc}*\n\n`;
  });

  const embed = kageEmbed({
    baslik: '🏮 KAGE SAMURAY PAZARI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama,
    altMetin: `Satın almak için aşağıdaki butonları kullanın • kage95.com`
  });

  const stiller = { unvan: ButtonStyle.Secondary, muska: ButtonStyle.Primary };
  const row = new ActionRowBuilder().addComponents(
    MARKET_URUNLERI.slice(0, 5).map((urun, i) =>
      new ButtonBuilder()
        .setCustomId(`market_${urun.id}`)
        .setLabel(`${i + 1}. ${urun.deger} (${urun.fiyat} Ryo)`.slice(0, 80))
        .setStyle(stiller[urun.tip] || ButtonStyle.Secondary)
    )
  );

  const yanit = await interaction.reply({ embeds: [embed], components: [row] });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu pazar tezgahı sadece komutu yazana aittir.', flags: MessageFlags.Ephemeral });
    }

    const urunId = i.customId.replace('market_', '');
    const sonuc = marketSatinAl(userId, urunId);

    if (!sonuc.basarili) {
      return i.reply({ content: `❌ ${sonuc.mesaj}`, flags: MessageFlags.Ephemeral });
    }

    await i.reply({
      content: sonuc.tekrar
        ? `🔁 **${sonuc.urun.ad}** zaten sizdeydi, ücretsiz kuşandınız.`
        : `🎉 **Tebrikler!** **${sonuc.urun.ad}** satın alındı!\n💰 Kalan Bakiyeniz: \`${sonuc.kalanRyo} Ryo\`.`,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}
