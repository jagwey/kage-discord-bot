import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { KILIC_SEVIYELERI, kilicGelistir, bakiyeGetir } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('demirci')
  .setDescription('Katananızı Ryo ile demircide dövüp geliştirir; düello gücünüzü artırırsınız.');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bakiye = bakiyeGetir(userId);
  const mevcutKilic = bakiye.kilic;
  const sonrakiKilic = KILIC_SEVIYELERI.find(k => k.seviye === mevcutKilic.seviye + 1);

  let aciklama = `**Usta Demircinin Ocağına Hoş Geldiniz!**\n\n` +
    `🗡️ **Mevcut Katananız:** **${mevcutKilic.ad}** (Seviye ${mevcutKilic.seviye}/5)\n` +
    `⚡ **Kazanma Bonusu:** \`+%${mevcutKilic.bonus}\`\n` +
    `💰 **Cüzdanınız:** \`${bakiye.ryo} Ryo\`\n\n`;

  if (sonrakiKilic) {
    aciklama += `🔥 **Sonraki Seviye:** **${sonrakiKilic.ad}**\n` +
      `📈 **Yeni Bonus:** \`+%${sonrakiKilic.bonus}\`\n` +
      `🪙 **Gereken Maliyet:** \`${sonrakiKilic.maliyet} Ryo\`\n\n` +
      `*Kılıcınızı bir üst kademeye dövmek için aşağıdaki butona basın!*`;
  } else {
    aciklama += `👑 **Tebrikler!** Katananız ulaşılabilecek en yüksek kademede (**Efsanevi Gölge Kılıcı**) parlıyor!`;
  }

  const embed = kageEmbed({
    baslik: '🔨 KAGE DEMİRCİ OCAĞI • KILIÇ GELİŞTİRME',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama,
    footer: `Kılıcınız düello ve zindanlarda zafer şansınızı artırır!`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kilic_dov_btn')
      .setLabel(sonrakiKilic ? `Kılıcı Döv (${sonrakiKilic.maliyet} Ryo)` : 'En Yüksek Seviye')
      .setStyle(sonrakiKilic ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(!sonrakiKilic)
      .setEmoji('🔨')
  );

  const yanit = await interaction.reply({ embeds: [embed], components: [row] });

  if (!sonrakiKilic) return;

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 45000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu demirci ocağı sadece komutu yazan samuraya aittir.', ephemeral: true });
    }

    const sonuc = kilicGelistir(userId);
    if (!sonuc.basarili) {
      return i.reply({ content: `❌ ${sonuc.mesaj}`, ephemeral: true });
    }

    await i.update({
      content: `🔥 **BAŞARILI!** Demircinin örsünden kıvılcımlar saçıldı!\nKatananız **${sonuc.yeniKilic.ad}** kademesine yükseltildi!\n⚡ Yeni Güç Bonusu: \`+%${sonuc.yeniKilic.bonus}\`\n💰 Kalan Bakiye: \`${sonuc.kalanRyo} Ryo\``,
      embeds: [],
      components: []
    });
  });
}
