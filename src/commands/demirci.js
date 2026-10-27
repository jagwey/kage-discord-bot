import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { KILIC_SEVIYELERI, kilicGelistir, bakiyeGetir } from '../services/ekonomiServisi.js';

export const butonOnek = 'kage_demirci:';

export const data = new SlashCommandBuilder()
  .setName('demirci')
  .setDescription('Katananızı Ryo ile demircide dövüp geliştirir; düello gücünüzü artırırsınız.');

function seviyeCubugu(seviye) {
  return KILIC_SEVIYELERI.map(k => (k.seviye <= seviye ? '🟥' : '⬛')).join('');
}

function ocakEkrani(userId, { not = null } = {}) {
  const bakiye = bakiyeGetir(userId);
  const mevcut = bakiye.kilic;
  const sonraki = KILIC_SEVIYELERI.find(k => k.seviye === mevcut.seviye + 1);
  const yeter = sonraki && bakiye.ryo >= sonraki.maliyet;

  let aciklama = (not ? `${not}\n\n` : '') +
    `${seviyeCubugu(mevcut.seviye)} **${mevcut.seviye}/${KILIC_SEVIYELERI.length}**\n\n` +
    `🗡️ **Katanan:** ${mevcut.ad}\n` +
    `⚡ **Bonus:** \`+%${mevcut.bonus}\`  •  💰 **Cüzdan:** \`${bakiye.ryo} Ryo\`\n`;

  if (sonraki) {
    aciklama += `\n🔥 **Sonraki:** ${sonraki.ad}\n` +
      `📈 \`+%${mevcut.bonus}\` → \`+%${sonraki.bonus}\`  •  🪙 \`${sonraki.maliyet} Ryo\`\n` +
      `-# ${sonraki.desc}` +
      (yeter ? '' : `\n\n❌ **${sonraki.maliyet - bakiye.ryo} Ryo** eksik.`);
  } else {
    aciklama += `\n👑 Katanan en yüce kademede. Örs artık sana bir şey öğretemez.`;
  }

  const embed = kageEmbed({
    baslik: '⛩️🔨 KAGE DEMİRCİ OCAĞI',
    renk: sonraki ? TEMA.RENKLER.KAN_KIRMIZISI : TEMA.RENKLER.ALTIN,
    aciklama,
    altMetin: 'Kılıcın düello ve zindanlarda zafer şansını artırır.'
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${butonOnek}dov:${userId}`)
      .setLabel(sonraki ? `Kılıcı Döv (${sonraki.maliyet} Ryo)` : 'En Yüksek Seviye')
      .setStyle(sonraki && yeter ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(!yeter)
      .setEmoji('🔨')
  );

  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  return interaction.reply(ocakEkrani(interaction.user.id));
}

export async function buton(interaction) {
  const [, sahip] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu demirci ocağı sadece komutu yazan samuraya aittir. Kendin için `/demirci` yaz.', flags: MessageFlags.Ephemeral });
  }
  const sonuc = kilicGelistir(sahip);
  const not = sonuc.basarili
    ? `🔥 **ÖRSTEN KIVILCIMLAR SAÇILDI!** Katanan **${sonuc.yeniKilic.ad}** oldu. Yeni bonus \`+%${sonuc.yeniKilic.bonus}\`.`
    : `❌ ${sonuc.mesaj}`;
  return interaction.update(ocakEkrani(sahip, { not }));
}
