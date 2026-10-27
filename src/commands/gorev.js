import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { gecisSatiri } from '../config/panel.js';
import { gorevDurumu, gorevOdulAl, TAMAMLAMA_BONUSU } from '../services/gorevServisi.js';

export const butonOnek = 'kage_gorev:';

export const data = new SlashCommandBuilder()
  .setName('gorev')
  .setDescription('Günlük samuray görevlerini gör; bitirince Ryo ödülünü topla.');

function panel(userId, not = '') {
  const d = gorevDurumu(userId);
  const satirlar = d.gorevler.map(g => {
    const bitti = g.ilerleme >= g.hedef;
    const isaret = g.alindi ? '✅' : bitti ? '🎁' : '⬜';
    return `${isaret} **${g.ad}**: ${g.aciklama} (${g.ilerleme}/${g.hedef}) — ${ryoYaz(g.ryo)}`;
  });
  const embed = kageEmbed({
    baslik: 'GÜNLÜK GÖREVLER',
    renk: TEMA.RENKLER.ALTIN,
    aciklama: (not ? `${not}\n\n` : '') + satirlar.join('\n') +
      `\n\nHepsini bitirirsen ekstra **${ryoYaz(TAMAMLAMA_BONUSU)}** ${d.bonusAlindi ? '(alındı)' : ''}`,
    alanlar: [{ name: 'Tamamlanan gün', value: String(d.tamamlanan), inline: true }]
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}al:${userId}`).setLabel('Ödülleri al').setEmoji('🎁')
      .setStyle(ButtonStyle.Success).setDisabled(d.alinabilir < 1)
  );
  return { embeds: [embed], components: [row, gecisSatiri('zindan', 'boss', 'balik', 'dojo', 'gunluk')] };
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.user.id));
}

export async function buton(interaction) {
  const sahip = interaction.customId.slice(butonOnek.length).split(':')[1];
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu görevler sana ait değil. Kendin için `/gorev` yaz.', flags: MessageFlags.Ephemeral });
  }
  const s = gorevOdulAl(sahip);
  const not = s.basarili
    ? `🎁 **${ryoYaz(s.toplam + s.bonus)}** cüzdana eklendi${s.bonus ? ' (günlük bonus dahil)' : ''}.`
    : 'Alınacak ödül yok.';
  return interaction.update(panel(sahip, not));
}
