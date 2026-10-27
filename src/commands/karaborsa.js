import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { MALZEMELER, malzemeMetni } from '../services/zanaatServisi.js';
import { MAKS_ISLEM_ADEDI, piyasa, malzemeAl, malzemeSat, nadirAl } from '../services/karaBorsaServisi.js';
import { oyunOlayi } from '../services/oyunOlayServisi.js';

export const butonOnek = 'kage_kb:';

const MALZEME_SECENEKLERI = Object.entries(MALZEMELER).filter(([, m]) => !m.borsaDisi).map(([id, m]) => ({ name: `${m.emoji} ${m.ad}`, value: id }));
const malzemeSecenegi = o => o.setName('malzeme').setDescription('Malzeme').setRequired(true).addChoices(...MALZEME_SECENEKLERI);
const adetSecenegi = o => o.setName('adet').setDescription(`Adet (1-${MAKS_ISLEM_ADEDI})`).setMinValue(1).setMaxValue(MAKS_ISLEM_ADEDI);

export const data = new SlashCommandBuilder()
  .setName('karaborsa')
  .setDescription('Gölge tüccarı: fiyatlar her saat değişir, her saat bir nadir mal gelir.')
  .addSubcommand(s => s.setName('bak').setDescription('Bu saatin fiyatlarını ve nadir malını gösterir.'))
  .addSubcommand(s => s.setName('al').setDescription('Tüccardan malzeme al.').addStringOption(malzemeSecenegi).addIntegerOption(adetSecenegi))
  .addSubcommand(s => s.setName('sat').setDescription('Tüccara malzeme sat.').addStringOption(malzemeSecenegi).addIntegerOption(adetSecenegi));

/** Çarpan 1'in üstündeyse fiyat pahalı, altındaysa ucuz. */
function trend(carpan) {
  if (carpan >= 1.25) return '📈';
  if (carpan <= 0.85) return '📉';
  return '➖';
}

function piyasaMesaji() {
  const p = piyasa();
  const satirlar = Object.entries(p.fiyatlar).map(([id, f]) => {
    const m = MALZEMELER[id];
    return `${trend(f.carpan)} ${m.emoji} **${m.ad}**: al ${ryoYaz(f.al)} • sat ${ryoYaz(f.sat)}`;
  }).join('\n');
  const n = p.nadir;
  const embed = kageEmbed({
    baslik: '🏮 KARA BORSA',
    renk: TEMA.RENKLER.GOLGE_SIYAHI,
    aciklama: `Fenerin altında pelerinli bir tüccar fısıldıyor: "Fiyatlar saat başı değişir, samuray."\n\n${satirlar}`,
    alanlar: [
      { name: `${n.emoji} Saatin nadir malı: ${n.ad}`, value: `${malzemeMetni(n.icerik)}\nFiyat: ${ryoYaz(n.fiyat)} • Stok: **${p.nadirKalan}**`, inline: false },
      { name: 'Yeni mal', value: `<t:${Math.floor(p.bitis / 1000)}:R>`, inline: true }
    ],
    altMetin: '📈 pahalı, 📉 ucuz. Nadir maldan saatte bir kez alabilirsin.'
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}nadir`).setLabel('Nadir malı al').setEmoji(n.emoji)
      .setStyle(ButtonStyle.Success).setDisabled(p.nadirKalan < 1)
  );
  return { embeds: [embed], components: [row] };
}

function notEkle(userId, mesaj) {
  const { notlar } = oyunOlayi(userId, 'karaBorsa');
  return notlar.length ? `${mesaj}\n${notlar.join('\n')}` : mesaj;
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  if (sub === 'bak') return interaction.reply(piyasaMesaji());

  const malzemeId = interaction.options.getString('malzeme');
  const adet = interaction.options.getInteger('adet') ?? 1;

  if (sub === 'al') {
    const s = malzemeAl(userId, malzemeId, adet);
    if (!s.basarili) return interaction.reply({ content: `❌ ${s.mesaj}`, flags: MessageFlags.Ephemeral });
    return interaction.reply({ content: notEkle(userId, `🏮 ${s.adet}x ${s.malzeme.emoji} **${s.malzeme.ad}** aldın. Ödenen: ${ryoYaz(s.fiyat)}`) });
  }

  if (sub === 'sat') {
    const s = malzemeSat(userId, malzemeId, adet);
    if (!s.basarili) return interaction.reply({ content: `❌ ${s.mesaj}`, flags: MessageFlags.Ephemeral });
    return interaction.reply({ content: notEkle(userId, `🏮 ${s.adet}x ${s.malzeme.emoji} **${s.malzeme.ad}** sattın. Kazanç: ${ryoYaz(s.kazanc)}`) });
  }
}

export async function buton(interaction) {
  const userId = interaction.user.id;
  const s = nadirAl(userId);
  if (!s.basarili) return interaction.reply({ content: `❌ ${s.mesaj}`, flags: MessageFlags.Ephemeral });
  await interaction.update(piyasaMesaji());
  return interaction.followUp({
    content: notEkle(userId, `🏮 <@${userId}> ${s.esya.emoji} **${s.esya.ad}** kaptı: ${malzemeMetni(s.esya.icerik)}`)
  });
}
