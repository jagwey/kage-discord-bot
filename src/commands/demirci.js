import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import {
  KILIC_SEVIYELERI, KORUMA_TILSIMI_FIYAT, KORUMA_TILSIMI_MAKS, GERILEME_SEVIYESI,
  kilicGelistir, kilicRiski, korumaTilsimiAl, bakiyeGetir
} from '../services/ekonomiServisi.js';
import {
  MALZEMELER, TARIFLER, bonusMetni, malzemeMetni, zanaatProfili, esyaDov, esyaKusan,
  esyaDayanimi, azamiDayanim, tamirBedeli, esyaTamir
} from '../services/zanaatServisi.js';
import { oyunOlayi } from '../services/oyunOlayServisi.js';

export const butonOnek = 'kage_demirci:';

export const data = new SlashCommandBuilder()
  .setName('demirci')
  .setDescription('Ocak: katananı döv, eşya yap ve kuşan, yıpranan eşyaları tamir et.');

const SEKMELER = [
  { id: 'kilic', ad: 'Kılıç', emoji: '🗡️' },
  { id: 'esya', ad: 'Eşya', emoji: '⚒️' },
  { id: 'tamir', ad: 'Tamir', emoji: '🛠️' }
];

function cubuk(dolu, toplam, uzunluk = 10) {
  const n = toplam > 0 ? Math.round((dolu / toplam) * uzunluk) : 0;
  return '█'.repeat(n) + '░'.repeat(uzunluk - n);
}

function satirlaraBol(butonlar) {
  const satirlar = [];
  for (let i = 0; i < butonlar.length; i += 5) {
    satirlar.push(new ActionRowBuilder().addComponents(butonlar.slice(i, i + 5)));
  }
  return satirlar;
}

function sekmeSatiri(userId, aktif) {
  return new ActionRowBuilder().addComponents(SEKMELER.map(s =>
    new ButtonBuilder()
      .setCustomId(`${butonOnek}sekme:${userId}:${s.id}`)
      .setLabel(s.ad)
      .setEmoji(s.emoji)
      .setStyle(s.id === aktif ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(s.id === aktif)
  ));
}

function kilicSekmesi(userId) {
  const bakiye = bakiyeGetir(userId);
  const mevcut = bakiye.kilic;
  const sonraki = KILIC_SEVIYELERI.find(k => k.seviye === mevcut.seviye + 1);
  const yeter = sonraki && bakiye.ryo >= sonraki.maliyet;

  let aciklama = `${KILIC_SEVIYELERI.map(k => (k.seviye <= mevcut.seviye ? '🟥' : '⬛')).join('')} **${mevcut.seviye}/${KILIC_SEVIYELERI.length}**\n\n` +
    `🗡️ **Katanan:** ${mevcut.ad}\n` +
    `⚡ **Bonus:** \`+%${mevcut.bonus}\`  •  💰 **Cüzdan:** ${ryoYaz(bakiye.ryo)}\n` +
    `🧿 **Koruma tılsımı:** ${bakiye.korumaTilsimi}/${KORUMA_TILSIMI_MAKS}`;

  if (sonraki) {
    const risk = kilicRiski(sonraki, bakiye.ocakSans);
    aciklama += `\n\n🔥 **Sonraki:** ${sonraki.ad}\n` +
      `📈 \`+%${mevcut.bonus}\` → \`+%${sonraki.bonus}\`  •  🪙 ${ryoYaz(sonraki.maliyet)}\n` +
      `💥 **Kırılma riski:** %${risk}` +
      (bakiye.ocakSans ? ` _(ocak ısındı: -%${bakiye.ocakSans})_` : '') +
      (risk && sonraki.seviye >= GERILEME_SEVIYESI ? '\n-# Kırılırsa kılıç bir kademe geriler. Koruma tılsımı bunu önler.' : '') +
      `\n-# ${sonraki.desc}` +
      (yeter ? '' : `\n\n❌ **${sonraki.maliyet - bakiye.ryo} Ryo** eksik.`);
  } else {
    aciklama += '\n\n👑 Katanan en yüce kademede. Örs artık sana bir şey öğretemez.';
  }

  const butonlar = [
    new ButtonBuilder()
      .setCustomId(`${butonOnek}dov:${userId}`)
      .setLabel(sonraki ? `Kılıcı Döv (${sonraki.maliyet} Ryo)` : 'En Yüksek Seviye')
      .setStyle(yeter ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(!yeter)
      .setEmoji('🔨'),
    new ButtonBuilder()
      .setCustomId(`${butonOnek}tilsim:${userId}`)
      .setLabel(`Koruma Tılsımı (${KORUMA_TILSIMI_FIYAT} Ryo)`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!sonraki || bakiye.korumaTilsimi >= KORUMA_TILSIMI_MAKS || bakiye.ryo < KORUMA_TILSIMI_FIYAT)
      .setEmoji('🧿')
  ];

  return {
    renk: sonraki ? TEMA.RENKLER.KAN_KIRMIZISI : TEMA.RENKLER.ALTIN,
    aciklama,
    altMetin: 'Kılıcın düello ve zindanlarda zafer şansını artırır. Her kırılma ocağı ısıtır, sonraki deneme kolaylaşır.',
    satirlar: [new ActionRowBuilder().addComponents(butonlar)]
  };
}

function esyaSekmesi(userId) {
  const p = zanaatProfili(userId);
  const satirlar = Object.entries(TARIFLER).map(([id, t]) => {
    const durum = p.esyalar.includes(id) ? (p.kusanilan[t.yuva] === id ? ' ✅' : ' 📦') : '';
    return `${t.emoji} **${t.ad}**${t.efsanevi ? ' 🌟' : ''}${durum} — ${malzemeMetni(t.malzeme)} + ${ryoYaz(t.ryo)}\n-# ${bonusMetni(t.bonus)}`;
  });
  const butonlar = Object.entries(TARIFLER).map(([id, t]) => {
    const var_ = p.esyalar.includes(id);
    const takili = p.kusanilan[t.yuva] === id;
    return new ButtonBuilder()
      .setCustomId(`${butonOnek}esya:${userId}:${id}`)
      .setLabel(takili ? `${t.ad} (takılı)` : var_ ? `${t.ad} kuşan` : `${t.ad} döv`)
      .setEmoji(t.emoji)
      .setStyle(takili ? ButtonStyle.Success : var_ ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(takili);
  });
  const malzeme = Object.entries(MALZEMELER).map(([id, m]) => `${m.emoji} ${p.malzeme[id] || 0}`).join('  ');
  return {
    renk: TEMA.RENKLER.ALTIN,
    aciklama: `🧰 **Çanta:** ${malzeme}\n\n${satirlar.join('\n')}`,
    altMetin: '✅ kuşanılı, 📦 çantada, 🌟 efsanevi: Kadim Çekirdek yalnızca boss öldürmeden düşer.',
    satirlar: satirlaraBol(butonlar)
  };
}

function tamirSekmesi(userId) {
  const p = zanaatProfili(userId);
  if (!p.esyalar.length) {
    return {
      renk: TEMA.RENKLER.BILGI,
      aciklama: 'Tamir edilecek eşyan yok. **Eşya** sekmesinden bir şey döv.',
      altMetin: 'Kuşanılı eşyalar zindan ve boss savaşında yıpranır.',
      satirlar: []
    };
  }
  const satirlar = p.esyalar.filter(id => TARIFLER[id]).map(id => {
    const t = TARIFLER[id];
    const kalan = esyaDayanimi(p, id);
    const azami = azamiDayanim(id);
    const bedel = tamirBedeli(p, id);
    return `${t.emoji} **${t.ad}**${kalan <= 0 ? ' 💔' : ''}\n\`${cubuk(kalan, azami)}\` ${kalan}/${azami}` +
      (bedel ? ` • tamir: ${ryoYaz(bedel.ryo)} + ${malzemeMetni(bedel.malzeme)}` : '');
  });
  const butonlar = p.esyalar.filter(id => TARIFLER[id]).map(id => {
    const t = TARIFLER[id];
    const bedel = tamirBedeli(p, id);
    return new ButtonBuilder()
      .setCustomId(`${butonOnek}tamir:${userId}:${id}`)
      .setLabel(bedel ? `${t.ad} tamir` : `${t.ad} sağlam`)
      .setEmoji(t.emoji)
      .setStyle(bedel ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(!bedel);
  });
  return {
    renk: TEMA.RENKLER.BILGI,
    aciklama: satirlar.join('\n'),
    altMetin: 'Kuşanılı eşyalar zindan zaferinde 6, boss vuruşunda 2 yıpranır. Kırık eşya bonus vermez.',
    satirlar: satirlaraBol(butonlar)
  };
}

const SEKME_EKRANLARI = { kilic: kilicSekmesi, esya: esyaSekmesi, tamir: tamirSekmesi };

function ocakEkrani(userId, sekme = 'kilic', { not = null } = {}) {
  const s = SEKME_EKRANLARI[sekme](userId);
  const embed = kageEmbed({
    baslik: `🔨 KAGE OCAĞI • ${SEKMELER.find(x => x.id === sekme).ad.toLocaleUpperCase('tr')}`,
    renk: s.renk,
    aciklama: (not ? `${not}\n\n` : '') + s.aciklama,
    altMetin: s.altMetin
  });
  return { embeds: [embed], components: [sekmeSatiri(userId, sekme), ...s.satirlar] };
}

function kilicNotu(sonuc) {
  if (sonuc.basarili) {
    return `🔥 **ÖRSTEN KIVILCIMLAR SAÇILDI!** Katanan **${sonuc.yeniKilic.ad}** oldu. Yeni bonus \`+%${sonuc.yeniKilic.bonus}\`.`;
  }
  if (!sonuc.kirildi) return `❌ ${sonuc.mesaj}`;
  if (sonuc.korundu) return `💥 **Çelik çatladı!** 🧿 Koruma tılsımı parçalandı, katanan **${sonuc.kilic.ad}** kademesinde kaldı.`;
  if (sonuc.geriledi) return `💥 **Çelik çatladı!** Katanan **${sonuc.kilic.ad}** kademesine geriledi. Ocak ısındı, sonraki risk düştü.`;
  return `💥 **Çelik çatladı!** Ryo yandı ama kılıcın sağlam. Ocak ısındı, sonraki risk düştü.`;
}

function esyaIslemi(userId, tarifId) {
  const p = zanaatProfili(userId);
  if (p.esyalar.includes(tarifId)) {
    const s = esyaKusan(userId, tarifId);
    return s.basarili ? `✅ ${s.tarif.emoji} **${s.tarif.ad}** kuşanıldı.` : `❌ ${s.mesaj}`;
  }
  const s = esyaDov(userId, tarifId);
  if (!s.basarili) return `❌ ${s.mesaj}`;
  let not = `🔨 Örs kızardı, çekiç indi: ${s.tarif.emoji} **${s.tarif.ad}** dövüldü! (${bonusMetni(s.tarif.bonus)})`;
  if (s.kusanildi) not += '\nYuva boştu, eşya kuşanıldı.';
  const { notlar } = oyunOlayi(userId, 'zanaat');
  if (notlar.length) not += `\n${notlar.join('\n')}`;
  return not;
}

function tamirIslemi(userId, tarifId) {
  const s = esyaTamir(userId, tarifId);
  if (!s.basarili) return `❌ ${s.mesaj}`;
  return `🛠️ ${s.tarif.emoji} **${s.tarif.ad}** onarıldı. Ödenen: ${ryoYaz(s.bedel.ryo)} + ${malzemeMetni(s.bedel.malzeme)}`;
}

export async function execute(interaction) {
  return interaction.reply(ocakEkrani(interaction.user.id));
}

export async function buton(interaction) {
  const [eylem, sahip, param] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu ocak sadece komutu yazan samuraya aittir. Kendin için `/demirci` yaz.', flags: MessageFlags.Ephemeral });
  }

  if (eylem === 'sekme' && SEKME_EKRANLARI[param]) return interaction.update(ocakEkrani(sahip, param));
  if (eylem === 'dov') return interaction.update(ocakEkrani(sahip, 'kilic', { not: kilicNotu(kilicGelistir(sahip)) }));
  if (eylem === 'tilsim') {
    const s = korumaTilsimiAl(sahip);
    const not = s.basarili ? `🧿 Koruma tılsımı alındı. Taşıdığın: **${s.adet}**.` : `❌ ${s.mesaj}`;
    return interaction.update(ocakEkrani(sahip, 'kilic', { not }));
  }
  if (eylem === 'esya' && TARIFLER[param]) return interaction.update(ocakEkrani(sahip, 'esya', { not: esyaIslemi(sahip, param) }));
  if (eylem === 'tamir' && TARIFLER[param]) return interaction.update(ocakEkrani(sahip, 'tamir', { not: tamirIslemi(sahip, param) }));
  return interaction.update(ocakEkrani(sahip));
}
