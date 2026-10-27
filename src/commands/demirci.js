import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { KILIC_SEVIYELERI, kilicGelistir, bakiyeGetir } from '../services/ekonomiServisi.js';

const SURE_MS = 120_000;

export const data = new SlashCommandBuilder()
  .setName('demirci')
  .setDescription('Katananızı Ryo ile demircide dövüp geliştirir; düello gücünüzü artırırsınız.');

function seviyeCubugu(seviye) {
  return KILIC_SEVIYELERI.map(k => (k.seviye <= seviye ? '🟥' : '⬛')).join('');
}

function ocakEkrani(userId, { not = null, kapali = false } = {}) {
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
    altMetin: kapali ? 'Ocak soğudu. Tekrar dövmek için /demirci yaz.' : 'Kılıcın düello ve zindanlarda zafer şansını artırır.'
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kilic_dov_btn')
      .setLabel(sonraki ? `Kılıcı Döv (${sonraki.maliyet} Ryo)` : 'En Yüksek Seviye')
      .setStyle(sonraki && yeter ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(kapali || !yeter)
      .setEmoji('🔨')
  );

  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  const yanit = await interaction.reply({ ...ocakEkrani(userId), withResponse: true });
  const mesaj = yanit.resource?.message ?? yanit;
  if (!mesaj?.createMessageComponentCollector) return;

  const collector = mesaj.createMessageComponentCollector({ componentType: ComponentType.Button, time: SURE_MS });

  collector.on('collect', async i => {
    try {
      if (i.user.id !== userId) {
        return await i.reply({ content: 'Bu demirci ocağı sadece komutu yazan samuraya aittir.', flags: MessageFlags.Ephemeral });
      }
      const sonuc = kilicGelistir(userId);
      if (!sonuc.basarili) {
        return await i.reply({ content: `❌ ${sonuc.mesaj}`, flags: MessageFlags.Ephemeral });
      }
      collector.resetTimer();
      await i.update(ocakEkrani(userId, {
        not: `🔥 **ÖRSTEN KIVILCIMLAR SAÇILDI!** Katanan **${sonuc.yeniKilic.ad}** oldu. Yeni bonus \`+%${sonuc.yeniKilic.bonus}\`.`
      }));
    } catch (err) {
      console.error('[Demirci] buton hatası:', err.message);
    }
  });

  collector.on('end', () => {
    mesaj.edit(ocakEkrani(userId, { kapali: true })).catch(() => null);
  });
}
