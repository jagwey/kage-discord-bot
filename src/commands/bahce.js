import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { gecisSatiri } from '../config/panel.js';
import {
  bahceDurumu, tohumEk, bahceyiSula, hasatEt, ambariSat, parselAl,
  TOHUMLAR, MAHSULLER, MAKS_PARSEL, ALTIN_SANS, SULU_ALTIN_SANS, ALTIN_CARPAN, SULAMA_KISALTMA
} from '../services/bahceServisi.js';

export const butonOnek = 'kage_bahce:';

export const data = new SlashCommandBuilder()
  .setName('bahce')
  .setDescription('Tohum ek, sula, hasat et; mahsulünü sat ya da pazarda takas et.');

function cubuk(oran) {
  const dolu = Math.round(oran * 8);
  return '▰'.repeat(dolu) + '▱'.repeat(8 - dolu);
}

function parselSatiri(p, i) {
  if (!p) return `\`${i + 1}\` · 🟫 *Boş parsel*`;
  const t = p.tohumBilgi;
  if (p.hazir) return `\`${i + 1}\` · ${t.emoji} **${t.ad}** ✅ hasada hazır${p.sulandi ? ' 💧' : ''}`;
  return `\`${i + 1}\` · ${t.emoji} **${t.ad}** ${cubuk(p.oran)} <t:${Math.ceil(p.bitis / 1000)}:R>${p.sulandi ? ' 💧' : ''}`;
}

export function panel(userId, not = '', simdi = Date.now()) {
  const d = bahceDurumu(userId, simdi);
  const satirlar = d.parseller.map(parselSatiri);
  if (d.sonrakiParselBedeli) satirlar.push(`\`${d.parselSayisi + 1}\` · 🔒 *Kilitli parsel (${ryoYaz(d.sonrakiParselBedeli)})*`);

  const ambar = Object.entries(d.ambar)
    .filter(([id, n]) => MAHSULLER[id] && n > 0)
    .map(([id, n]) => `${MAHSULLER[id].altin ? '✨' : MAHSULLER[id].emoji} ${MAHSULLER[id].ad} x${n}`)
    .join('\n') || 'Ambar boş.';

  const embed = kageEmbed({
    baslik: 'SAMURAY BAHÇESİ',
    renk: TEMA.RENKLER.BASARI,
    aciklama: (not ? `${not}\n\n` : '') + satirlar.join('\n'),
    alanlar: [
      { name: `Ambar (${ryoYaz(d.ambarDeger)})`, value: ambar, inline: false },
      { name: 'Toplam hasat', value: `${d.toplamHasat} (✨ ${d.altinHasat} altın)`, inline: true },
      { name: 'Altın mahsul şansı', value: `%${Math.round(ALTIN_SANS * 100)} • sulanınca %${Math.round(SULU_ALTIN_SANS * 100)}`, inline: true },
      { name: 'Parsel', value: `${d.parselSayisi}/${MAKS_PARSEL}`, inline: true }
    ],
    altMetin: `Tohum butonu ilk boş parsele eker. Sulama kalan süreyi %${SULAMA_KISALTMA * 100} kısaltır; altın mahsul ${ALTIN_CARPAN} kat değerlidir.`
  });

  const id = eylem => `${butonOnek}${eylem}:${userId}`;
  const eylemler = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(id('hasat')).setLabel(`Hasat (${d.hazirSayisi})`).setEmoji('🧺')
      .setStyle(d.hazirSayisi ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!d.hazirSayisi),
    new ButtonBuilder().setCustomId(id('sula')).setLabel('Hepsini sula').setEmoji('💧')
      .setStyle(ButtonStyle.Primary).setDisabled(!d.sulanabilir),
    new ButtonBuilder().setCustomId(id('sat')).setLabel('Ambarı sat').setEmoji('💰')
      .setStyle(ButtonStyle.Secondary).setDisabled(d.ambarDeger < 1),
    new ButtonBuilder().setCustomId(id('parsel'))
      .setLabel(d.sonrakiParselBedeli ? `Parsel al (${ryoYaz(d.sonrakiParselBedeli)})` : 'Parseller tam')
      .setEmoji('🔓').setStyle(ButtonStyle.Secondary).setDisabled(!d.sonrakiParselBedeli),
    new ButtonBuilder().setCustomId(id('yenile')).setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );
  const tohumlar = new ActionRowBuilder().addComponents(TOHUMLAR.map(t =>
    new ButtonBuilder()
      .setCustomId(`${butonOnek}ek:${userId}:${t.id}`)
      .setLabel(`${t.ad} ${t.bedel}`)
      .setEmoji(t.emoji)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!d.bosSayisi)
  ));
  return {
    embeds: [embed],
    components: [eylemler, tohumlar, gecisSatiri('balik', 'yoldas', 'envanter', 'gorev', 'bakiye')]
  };
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.user.id));
}

function sureMetni(dk) {
  return dk >= 60 ? `${dk / 60} saat` : `${dk} dk`;
}

export async function buton(interaction) {
  const [eylem, sahip, param] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu bahçe sana ait değil. Kendin için `/bahce` yaz.', flags: MessageFlags.Ephemeral });
  }

  let not = '';
  if (eylem === 'ek') {
    const s = tohumEk(sahip, param);
    if (s.basarili) not = `🌱 ${s.tohum.emoji} **${s.tohum.ad}** ${s.parsel + 1}. parsele ekildi. ${sureMetni(s.tohum.sureDk)} sonra hasada hazır.`;
    else if (s.sebep === 'dolu') not = 'Boş parsel yok. Önce hasat et ya da yeni parsel al.';
    else if (s.sebep === 'yetersiz') not = `Yetersiz Ryo. Tohum bedeli: ${ryoYaz(s.bedel)}.`;
    else not = 'Böyle bir tohum yok.';
  } else if (eylem === 'sula') {
    const s = bahceyiSula(sahip);
    not = s.basarili ? `💧 ${s.adet} parsel sulandı. Büyüme hızlandı, altın mahsul şansı arttı.` : 'Sulanacak filiz yok.';
  } else if (eylem === 'hasat') {
    const s = hasatEt(sahip);
    if (s.basarili) {
      const altin = s.hasat.filter(h => h.altin);
      not = `🧺 ${s.hasat.length} mahsul ambara kaldırıldı.` +
        (altin.length ? `\n✨ **Altın mahsul:** ${altin.map(h => MAHSULLER[h.id].ad).join(', ')}` : '');
      if (s.notlar?.length) not += `\n${s.notlar.join('\n')}`;
    } else not = 'Olgunlaşmış mahsul yok.';
  } else if (eylem === 'sat') {
    const s = ambariSat(sahip);
    not = s.basarili ? `💰 ${s.adet} mahsul satıldı: **${ryoYaz(s.miktar)}**.` : 'Ambar boş.';
  } else if (eylem === 'parsel') {
    const s = parselAl(sahip);
    if (s.basarili) not = `🔓 ${s.parsel}. parsel açıldı (-${ryoYaz(s.bedel)}).`;
    else if (s.sebep === 'yetersiz') not = `Yetersiz Ryo. Gereken: ${ryoYaz(s.bedel)}.`;
    else not = 'Bütün parseller açık.';
  }
  return interaction.update(panel(sahip, not));
}
