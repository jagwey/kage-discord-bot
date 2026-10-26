import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { dojoDurumu, dojoTopla, dojoGelistir, MAKS_SEVIYE, DEPO_SAAT } from '../services/dojoServisi.js';

export const butonOnek = 'kage_dojo:';

export const data = new SlashCommandBuilder()
  .setName('dojo')
  .setDescription('Kendi dojonu kur; saat başı Ryo üretir, gelip topla ve yükselt.');

function panel(userId, not = '') {
  const d = dojoDurumu(userId);
  const embed = kageEmbed({
    baslik: 'DOJO',
    renk: TEMA.RENKLER.ALTIN,
    aciklama: (not ? `${not}\n\n` : '') + (d.seviye < 1
      ? 'Henüz bir dojon yok. İlk taşı koy; sen yokken de Ryo üretsin.'
      : `Seviye **${d.seviye}/${MAKS_SEVIYE}** • Saatlik üretim **${ryoYaz(d.saatlik)}**\nBiriken: **${ryoYaz(d.bekleyen)}**`),
    alanlar: [
      { name: 'Sonraki seviye', value: d.sonrakiBedel ? ryoYaz(d.sonrakiBedel) : 'En yüksek seviye', inline: true },
      { name: 'Depo', value: `${DEPO_SAAT} saatlik üretim dolunca durur`, inline: true },
      { name: 'Toplam kazanç', value: ryoYaz(d.toplam || 0), inline: true }
    ]
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}topla:${userId}`).setLabel('Topla').setEmoji('💰').setStyle(ButtonStyle.Success).setDisabled(d.bekleyen < 1),
    new ButtonBuilder().setCustomId(`${butonOnek}gelistir:${userId}`).setLabel(d.seviye < 1 ? 'Dojoyu kur' : 'Yükselt').setEmoji('🏯').setStyle(ButtonStyle.Primary).setDisabled(d.seviye >= MAKS_SEVIYE)
  );
  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.user.id));
}

export async function buton(interaction) {
  const [eylem, sahip] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu dojo sana ait değil. Kendin için `/dojo` yaz.', flags: MessageFlags.Ephemeral });
  }
  let not = '';
  if (eylem === 'topla') {
    const s = dojoTopla(sahip);
    not = s.basarili ? `💰 **${ryoYaz(s.miktar)}** cüzdana eklendi.` : 'Toplanacak Ryo yok.';
  } else if (eylem === 'gelistir') {
    const s = dojoGelistir(sahip);
    if (s.basarili) not = `🏯 Dojo **${s.seviye}. seviye** oldu (-${ryoYaz(s.bedel)}).`;
    else if (s.sebep === 'yetersiz') not = `Yetersiz Ryo. Gereken: ${ryoYaz(s.bedel)}.`;
    else not = 'Dojo zaten en yüksek seviyede.';
  }
  return interaction.update(panel(sahip, not));
}
