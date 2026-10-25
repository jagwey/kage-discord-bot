import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
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
    footer: `Satın almak için aşağıdaki butonları kullanın • kage95.com`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('market_unvan_golge')
      .setLabel('Gölge Suikastçısı (800 Ryo)')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🥷'),
    new ButtonBuilder()
      .setCustomId('market_unvan_onur')
      .setLabel('Onurlu Daimyo (2000 Ryo)')
      .setStyle(ButtonStyle.Success)
      .setEmoji('⛩️'),
    new ButtonBuilder()
      .setCustomId('market_muska_sans')
      .setLabel('Şans Muskası (600 Ryo)')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🏮')
  );

  const yanit = await interaction.reply({ embeds: [embed], components: [row] });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu pazar tezgahı sadece komutu yazana aittir.', ephemeral: true });
    }

    const urunId = i.customId.replace('market_', '');
    const sonuc = marketSatinAl(userId, urunId);

    if (!sonuc.basarili) {
      return i.reply({ content: `❌ ${sonuc.mesaj}`, ephemeral: true });
    }

    await i.reply({
      content: `🎉 **Tebrikler!** **${sonuc.urun.ad}** satın alındı!\n💰 Kalan Bakiyeniz: \`${sonuc.kalanRyo} Ryo\`.`,
      ephemeral: true
    });
  });
}
