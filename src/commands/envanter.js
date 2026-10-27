import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { gecisSatiri } from '../config/panel.js';
import { bakiyeGetir, KILIC_SEVIYELERI } from '../services/ekonomiServisi.js';
import { zanaatProfili, MALZEMELER, TARIFLER, esyaDayanimi, azamiDayanim, bonusMetni } from '../services/zanaatServisi.js';
import { balikDurumu, BALIKLAR, TUR_SAYISI, akvaryumGeliri, AKVARYUM_YUVA } from '../services/balikServisi.js';
import { kullaniciYoldasGetir, yoldasAdi, yoldasDurumu, evrimlestiMi } from '../services/yoldasServisi.js';

export const data = new SlashCommandBuilder()
  .setName('envanter')
  .setDescription('Çanta, malzeme, dövülmüş eşya, balık ve yoldaşını kategorilere ayrılmış olarak gösterir.')
  .addUserOption(opt =>
    opt.setName('kullanici')
      .setDescription('Envanterini görmek istediğiniz samuray (boşsa kendiniz)')
      .setRequired(false)
  );

export const butonOnek = 'envanter:';

const SAYFA_BOYU = 10;

export const KATEGORILER = {
  genel: { etiket: 'Genel', emoji: '📜' },
  canta: { etiket: 'Çanta', emoji: '🎒' },
  zanaat: { etiket: 'Zanaat', emoji: '🔥' },
  balik: { etiket: 'Balık', emoji: '🎣' },
  yoldas: { etiket: 'Yoldaş', emoji: '🐾' }
};

const sayi = n => Number(n || 0).toLocaleString('tr-TR');

/** Bir kategorinin satırları. Uzun listeler sayfalanır. */
export function kategoriSatirlari(kat, userId) {
  if (kat === 'canta') {
    const b = bakiyeGetir(userId);
    const satirlar = [];
    if (b.korumaTilsimi > 0) satirlar.push(`🧿 **Koruma Tılsımı** ×${b.korumaTilsimi}`);
    if (b.seriKalkani > 0) satirlar.push(`🛡️ **Seri Kalkanı** ×${b.seriKalkani}`);
    const sayac = {};
    for (const e of b.envanter) sayac[e] = (sayac[e] || 0) + 1;
    for (const [ad, n] of Object.entries(sayac)) satirlar.push(`• ${ad}${n > 1 ? ` ×${n}` : ''}`);
    return satirlar;
  }
  if (kat === 'zanaat') {
    const z = zanaatProfili(userId);
    const satirlar = [];
    const malzemeler = Object.entries(z.malzeme || {}).filter(([id, n]) => MALZEMELER[id] && n > 0);
    if (malzemeler.length) {
      satirlar.push('**Malzemeler**');
      for (const [id, n] of malzemeler) satirlar.push(`${MALZEMELER[id].emoji} ${MALZEMELER[id].ad} ×${n}`);
    }
    const esyalar = (z.esyalar || []).filter(id => TARIFLER[id]);
    if (esyalar.length) {
      satirlar.push('**Dövülmüş eşyalar**');
      const kusanili = new Set(Object.values(z.kusanilan || {}));
      for (const id of esyalar) {
        const t = TARIFLER[id];
        const d = esyaDayanimi(z, id);
        const durum = d <= 0 ? ' 💔 kırık' : kusanili.has(id) ? ' ✅ kuşanılı' : '';
        satirlar.push(`${t.emoji} **${t.ad}**${durum} • ${d}/${azamiDayanim(id)} • ${bonusMetni(t.bonus)}`);
      }
    }
    return satirlar;
  }
  if (kat === 'balik') {
    const bd = balikDurumu(userId);
    const satirlar = [];
    const canta = Object.entries(bd.canta || {}).filter(([, n]) => n > 0);
    if (canta.length) {
      satirlar.push(`**Balık çantası** • ${sayi(bd.cantaDeger)} Ryo değerinde`);
      for (const [id, n] of canta) {
        const b = BALIKLAR.find(x => x.id === id);
        if (b) satirlar.push(`${b.emoji} ${b.ad} ×${n} • ${sayi(b.deger * n)} Ryo`);
      }
    }
    if (bd.akvaryum.length) {
      satirlar.push(`**Akvaryum** ${bd.akvaryum.length}/${AKVARYUM_YUVA} • saatte ${sayi(bd.saatlikGelir)} Ryo`);
      for (const av of bd.akvaryum) {
        const b = BALIKLAR.find(x => x.id === av.id);
        if (b) satirlar.push(`${b.emoji} ${b.ad} ${av.kg} kg • saatte ${akvaryumGeliri(av)} Ryo`);
      }
    }
    return satirlar;
  }
  return [];
}

function sayfaSayisi(kat, userId) {
  if (kat === 'genel' || kat === 'yoldas') return 1;
  return Math.max(1, Math.ceil(kategoriSatirlari(kat, userId).length / SAYFA_BOYU));
}

const BOS_METIN = {
  canta: '*Çanta boş. `/market` ve `/karaborsa` ile eşya alabilirsin.*',
  zanaat: '*Malzeme ya da eşya yok. Zindan, boss ve balıktan malzeme düşer; `/demirci` ile dövebilirsin.*',
  balik: '*Çanta ve akvaryum boş. `/balik` ile oltanı at.*'
};

function genelAciklama(userId) {
  const b = bakiyeGetir(userId);
  const bd = balikDurumu(userId);
  const z = zanaatProfili(userId);
  const malzemeAdet = Object.values(z.malzeme || {}).reduce((t, n) => t + (n > 0 ? n : 0), 0);
  return `👤 **Unvan:** \`${b.unvan}\`\n` +
    `🗡️ **Katana:** **${b.kilic.ad}** (Sv. ${b.kilic.seviye}/${KILIC_SEVIYELERI.length} • Güç +%${b.kilic.bonus})\n` +
    `💰 **Nakit:** \`${sayi(b.ryo)} Ryo\` • 🏦 **Banka:** \`${sayi(b.banka)} Ryo\`\n\n` +
    `⚔️ **Savaş sicili**\n` +
    `• Düello: \`${b.duelloZafer}\` zafer / \`${b.duelloMaglubiyet}\` mağlubiyet\n` +
    `• Temizlenen zindan: \`${b.zindanZafer}\`\n` +
    `• Günlük seri: \`${b.streak}\` gün\n\n` +
    `🎒 **Özet**\n` +
    `• Çanta: \`${b.envanter.length}\` eşya, \`${b.korumaTilsimi}\` tılsım, \`${b.seriKalkani}\` kalkan\n` +
    `• Zanaat: \`${malzemeAdet}\` malzeme, \`${(z.esyalar || []).length}\` dövülmüş eşya\n` +
    `• Balık: \`${bd.kesfedilen.filter(id => BALIKLAR.some(t => t.id === id && !t.cop)).length}/${TUR_SAYISI}\` tür, akvaryumda \`${bd.akvaryum.length}\``;
}

function yoldasAciklama(userId) {
  const y = kullaniciYoldasGetir(userId);
  if (!y) return '*Henüz yoldaşın yok. `/yoldas sec` ile bir yol arkadaşı edin.*';
  const d = yoldasDurumu(y);
  const RUH = { ac: '😣 Aç', kuskun: '😞 Küskün', normal: '🙂 Normal', mutlu: '😄 Mutlu' };
  return `**${yoldasAdi(y)}**${evrimlestiMi(y) ? ' ✨ evrimleşmiş' : ''}\n\n` +
    `⭐ **Seviye:** \`${y.seviye || 1}\` • XP \`${y.xp || 0}/${(y.seviye || 1) * 100}\`\n` +
    `🍖 **Tokluk:** \`%${d.tokluk}\` • 💞 **Mutluluk:** \`%${d.mutluluk}\`\n` +
    `🎭 **Ruh hali:** ${RUH[d.ruh]}\n` +
    `🧭 **Sefer:** ${y.sefer ? 'yolda' : 'evde'} • tamamlanan \`${y.seferSayisi || 0}\``;
}

/**
 * Envanter panelini kurar.
 * @param {{izleyenId:string, hedef:{id:string, ad:string, avatarUrl?:string}, kat?:string, sayfa?:number}} p
 */
export function envanterPaneli({ izleyenId, hedef, kat = 'genel', sayfa = 0 }) {
  if (!KATEGORILER[kat]) kat = 'genel';
  const toplam = sayfaSayisi(kat, hedef.id);
  sayfa = Math.min(Math.max(0, sayfa), toplam - 1);

  let aciklama;
  if (kat === 'genel') aciklama = genelAciklama(hedef.id);
  else if (kat === 'yoldas') aciklama = yoldasAciklama(hedef.id);
  else {
    const satirlar = kategoriSatirlari(kat, hedef.id).slice(sayfa * SAYFA_BOYU, (sayfa + 1) * SAYFA_BOYU);
    aciklama = satirlar.length ? satirlar.join('\n') : BOS_METIN[kat];
  }

  const k = KATEGORILER[kat];
  const embed = kageEmbed({
    baslik: `${k.emoji} ENVANTER • ${hedef.ad} • ${k.etiket}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama,
    thumbnail: hedef.avatarUrl,
    altMetin: `Sayfa ${sayfa + 1}/${toplam} • Kage 95 Samuray Kütüğü`
  });

  const kimlik = (eylem, yeniKat, yeniSayfa) => `${butonOnek}${eylem}:${izleyenId}:${hedef.id}.${yeniKat}.${yeniSayfa}`;
  const katSatiri = new ActionRowBuilder().addComponents(
    Object.entries(KATEGORILER).map(([id, c]) => new ButtonBuilder()
      .setCustomId(kimlik('k', id, 0))
      .setLabel(c.etiket)
      .setEmoji(c.emoji)
      .setStyle(id === kat ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(id === kat))
  );
  const satirlar = [katSatiri];
  if (toplam > 1) {
    satirlar.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(kimlik('s', kat, sayfa - 1)).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(sayfa === 0),
      new ButtonBuilder().setCustomId(kimlik('x', kat, sayfa)).setLabel(`${sayfa + 1}/${toplam}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(kimlik('s', kat, sayfa + 1)).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(sayfa >= toplam - 1)
    ));
  }
  if (hedef.id === izleyenId) satirlar.push(gecisSatiri('demirci', 'balik', 'yoldas', 'bakiye', 'basarim'));
  return { embeds: [embed], components: satirlar };
}

const kisiBilgisi = user => ({ id: user.id, ad: user.username, avatarUrl: user.displayAvatarURL({ size: 256 }) });

export async function execute(interaction) {
  const hedef = interaction.options.getUser('kullanici') || interaction.user;
  return interaction.reply(envanterPaneli({ izleyenId: interaction.user.id, hedef: kisiBilgisi(hedef) }));
}

export async function buton(interaction) {
  const [, , izleyenId, durum] = interaction.customId.split(':');
  if (interaction.user.id !== izleyenId) {
    return interaction.reply({ content: '🎒 Bu panel başkasının. Kendi envanterin için `/envanter` yaz.', flags: MessageFlags.Ephemeral });
  }
  const [hedefId, kat, sayfa] = durum.split('.');
  const user = interaction.client.users.cache.get(hedefId) || await interaction.client.users.fetch(hedefId).catch(() => null);
  const hedef = user ? kisiBilgisi(user) : { id: hedefId, ad: 'Samuray' };
  return interaction.update(envanterPaneli({ izleyenId, hedef, kat, sayfa: Number(sayfa) || 0 }));
}
