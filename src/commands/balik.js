import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import {
  balikDurumu, oltaAt, cantayiSat, oltaYukselt, BALIKLAR, TUR_SAYISI, MAKS_OLTA, GUNLUK_ATIS
} from '../services/balikServisi.js';

export const butonOnek = 'kage_balik:';

export const data = new SlashCommandBuilder()
  .setName('balik')
  .setDescription('Gölette olta at, nadir balık yakala, koleksiyonunu tamamla ve sat.');

function panel(userId, not = '') {
  const d = balikDurumu(userId);
  const cantaSatir = BALIKLAR
    .filter(b => d.canta[b.id])
    .map(b => `${b.emoji} ${b.ad} x${d.canta[b.id]}`)
    .join('\n') || 'Çanta boş.';
  const rekor = d.rekor ? BALIKLAR.find(b => b.id === d.rekor.id) : null;
  const embed = kageEmbed({
    baslik: 'GÖLET',
    renk: TEMA.RENKLER.BILGI,
    aciklama: (not ? `${not}\n\n` : '') + `Olta seviyesi **${d.olta}/${MAKS_OLTA}** • Bugünkü atış **${d.bugun}/${GUNLUK_ATIS}**`,
    alanlar: [
      { name: `Çanta (${ryoYaz(d.cantaDeger)})`, value: cantaSatir, inline: false },
      { name: 'Koleksiyon', value: `${d.kesfedilen.length}/${TUR_SAYISI} tür`, inline: true },
      { name: 'Rekor', value: rekor ? `${rekor.emoji} ${rekor.ad} ${d.rekor.kg} kg` : 'Henüz yok', inline: true },
      { name: 'Sonraki olta', value: d.sonrakiBedel ? ryoYaz(d.sonrakiBedel) : 'En yüksek seviye', inline: true }
    ]
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}at:${userId}`).setLabel('Olta at').setEmoji('🎣').setStyle(ButtonStyle.Primary).setDisabled(d.kalanAtis < 1),
    new ButtonBuilder().setCustomId(`${butonOnek}sat:${userId}`).setLabel('Çantayı sat').setEmoji('💰').setStyle(ButtonStyle.Success).setDisabled(d.cantaDeger < 1),
    new ButtonBuilder().setCustomId(`${butonOnek}yukselt:${userId}`).setLabel('Olta yükselt').setEmoji('🪝').setStyle(ButtonStyle.Secondary).setDisabled(d.olta >= MAKS_OLTA)
  );
  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.user.id));
}

export async function buton(interaction) {
  const [eylem, sahip] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu olta sana ait değil. Kendin için `/balik` yaz.', flags: MessageFlags.Ephemeral });
  }
  let not = '';
  if (eylem === 'at') {
    const s = oltaAt(sahip);
    if (!s.basarili) {
      not = s.sebep === 'limit'
        ? 'Bugünlük atış hakkın bitti. Yarın gel.'
        : `Olta suya dönüyor, **${Math.ceil(s.beklemeMs / 1000)} sn** bekle.`;
    } else if (s.balik.cop) {
      not = `${s.balik.emoji} Oltaya **${s.balik.ad}** takıldı. Şanssız atış.`;
    } else {
      not = `${s.balik.emoji} **${s.balik.ad}** yakaladın (${s.kg} kg)!`;
      if (s.yeniTur) not += `\n🆕 Yeni tür keşfi: +${ryoYaz(s.bonus)}`;
      if (s.yeniRekor) not += '\n🏆 Kişisel rekor!';
    }
  } else if (eylem === 'sat') {
    const s = cantayiSat(sahip);
    not = s.basarili ? `💰 ${s.adet} av satıldı: **${ryoYaz(s.miktar)}**.` : 'Satılacak av yok.';
  } else if (eylem === 'yukselt') {
    const s = oltaYukselt(sahip);
    if (s.basarili) not = `🪝 Olta **${s.olta}. seviye** oldu (-${ryoYaz(s.bedel)}). Nadir balık şansı arttı.`;
    else if (s.sebep === 'yetersiz') not = `Yetersiz Ryo. Gereken: ${ryoYaz(s.bedel)}.`;
    else not = 'Olta zaten en yüksek seviyede.';
  }
  return interaction.update(panel(sahip, not));
}
