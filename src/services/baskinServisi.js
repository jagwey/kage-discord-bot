import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';
import { oyunOlayi } from './oyunOlayServisi.js';
import { TEMA, kageEmbed } from '../config/tema.js';

const depo = jsonDepo('baskin.json', () => ({ sunucular: {}, aktif: {} }));

export const BUTON_ONEK = 'kage_baskin:';
export const BASKIN_SURESI_MS = 5 * 60 * 1000;
/** Otomatik baskınlar arasında en az bu kadar süre geçer. */
export const OTOMATIK_ARALIK_MS = 2 * 60 * 60 * 1000;
/** Uygun her mesajda otomatik baskın çıkma olasılığı. */
export const OTOMATIK_SANS = 0.01;
export const MIN_PAY = 100;

/** `gerekli` savunucu toplanmazsa baskın kaybedilir; ganimet katılanlara bölünür. */
export const DUSMANLAR = [
  { id: 'ninja', ad: 'Gölge Ninja Çetesi', emoji: '🥷', gerekli: 1, ganimet: 1200 },
  { id: 'ronin', ad: 'Haydut Roninler', emoji: '⚔️', gerekli: 2, ganimet: 2000 },
  { id: 'oni', ad: 'Kızıl Oni Sürüsü', emoji: '👹', gerekli: 3, ganimet: 3200 },
  { id: 'tengu', ad: 'Fırtına Tengu Akını', emoji: '🌪️', gerekli: 4, ganimet: 4500 }
];

const zamanlayicilar = new Map();

export function baskinAyarGetir(guildId) {
  return { kanalId: null, otomatik: false, sonBaskin: 0, ...(depo.oku().sunucular[guildId] || {}) };
}

export function baskinAyarGuncelle(guildId, degisim) {
  const db = depo.oku();
  db.sunucular[guildId] = { ...baskinAyarGetir(guildId), ...degisim };
  depo.yaz(db);
  return db.sunucular[guildId];
}

export function aktifBaskin(guildId) {
  return depo.oku().aktif[guildId] || null;
}

/** Yeni baskın kaydı açar. Sunucuda süren bir baskın varsa null döner. */
export function baskinOlustur(guildId, kanalId, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  if (db.aktif[guildId]) return null;
  const dusman = DUSMANLAR[Math.floor(rng() * DUSMANLAR.length)];
  const baskin = {
    id: simdi.toString(36),
    kanalId,
    mesajId: null,
    dusman,
    bitis: simdi + BASKIN_SURESI_MS,
    katilanlar: []
  };
  db.aktif[guildId] = baskin;
  db.sunucular[guildId] = { ...baskinAyarGetir(guildId), sonBaskin: simdi };
  depo.yaz(db);
  return baskin;
}

export function baskinaKatil(guildId, userId, baskinId, simdi = Date.now()) {
  const db = depo.oku();
  const b = db.aktif[guildId];
  if (!b || b.id !== baskinId || simdi > b.bitis) return { basarili: false, sebep: 'bitti' };
  if (b.katilanlar.includes(userId)) return { basarili: false, sebep: 'zaten' };
  b.katilanlar.push(userId);
  depo.yaz(db);
  return { basarili: true, baskin: b };
}

/**
 * Baskını kapatır ve ödülü dağıtır. Yeterli savunucu varsa ganimet katılanlara eşit bölünür
 * (kişi başı en az MIN_PAY). Her katılan 'baskin' oyun olayı alır.
 */
export function baskinSonuclandir(guildId) {
  const db = depo.oku();
  const b = db.aktif[guildId];
  if (!b) return null;
  delete db.aktif[guildId];
  depo.yaz(db);

  const zafer = b.katilanlar.length >= b.dusman.gerekli;
  const pay = zafer ? Math.max(MIN_PAY, Math.round(b.dusman.ganimet / b.katilanlar.length)) : 0;
  const notlar = [];
  if (zafer) {
    for (const uid of b.katilanlar) {
      ryoEkle(uid, pay, `Gölge baskını: ${b.dusman.ad}`);
      for (const n of oyunOlayi(uid, 'baskin').notlar) {
        if (n.startsWith('🏅')) notlar.push(`<@${uid}> ${n}`);
      }
    }
  }
  return { baskin: b, zafer, pay, notlar };
}

export function baskinMesaji(b) {
  const katilan = b.katilanlar.length;
  const embed = kageEmbed({
    baslik: `GÖLGE BASKINI • ${b.dusman.emoji} ${b.dusman.ad.toUpperCase()}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama:
      `Kasabanın kapısına **${b.dusman.ad}** dayandı! Kılıcını çek ve surları savun.\n\n` +
      `Savunucu: **${katilan}/${b.dusman.gerekli}** gerekli\n` +
      `Ganimet: **${b.dusman.ganimet} Ryo** katılanlara bölünür\n` +
      `Bitiş: <t:${Math.floor(b.bitis / 1000)}:R>`,
    altMetin: 'Butona 5 dakika içinde bas. Yetmezse baskın kaybedilir.'
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${BUTON_ONEK}katil:${b.id}`).setLabel('Surları savun').setEmoji('🛡️').setStyle(ButtonStyle.Danger)
  );
  return { embeds: [embed], components: [row] };
}

function sonucMesaji(s) {
  const { baskin: b, zafer, pay, notlar } = s;
  const aciklama = zafer
    ? `${b.dusman.emoji} **${b.dusman.ad}** püskürtüldü! **${b.katilanlar.length}** savunucu kişi başı **${pay} Ryo** aldı.\n` +
      b.katilanlar.slice(0, 25).map(u => `<@${u}>`).join(' ') +
      (notlar.length ? `\n\n${notlar.join('\n')}` : '')
    : `${b.dusman.emoji} **${b.dusman.ad}** kasabayı yağmaladı. ${b.dusman.gerekli} savunucu gerekiyordu, **${b.katilanlar.length}** kişi geldi.`;
  return {
    embeds: [kageEmbed({
      baslik: zafer ? 'BASKIN PÜSKÜRTÜLDÜ' : 'BASKIN KAYBEDİLDİ',
      renk: zafer ? TEMA.RENKLER.BASARI : TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: aciklama.slice(0, 4000)
    })],
    components: []
  };
}

/** Baskını sonuçlandırıp ilan mesajını sonuçla günceller. */
export async function baskinKapat(client, guildId) {
  zamanlayicilar.delete(guildId);
  const s = baskinSonuclandir(guildId);
  if (!s) return null;
  try {
    const kanal = await client.channels.fetch(s.baskin.kanalId);
    const mesaj = s.baskin.mesajId ? await kanal.messages.fetch(s.baskin.mesajId).catch(() => null) : null;
    if (mesaj) await mesaj.edit(sonucMesaji(s));
    else await kanal.send(sonucMesaji(s));
  } catch (err) {
    console.error('[Baskın] sonuç mesajı gönderilemedi:', err.message);
  }
  return s;
}

function zamanlayiciKur(client, guildId, bitis) {
  clearTimeout(zamanlayicilar.get(guildId));
  zamanlayicilar.set(guildId, setTimeout(() => baskinKapat(client, guildId), Math.max(1000, bitis - Date.now())));
}

/** Kanala baskın ilan eder. Süren baskın varsa null döner. */
export async function baskinIlanEt(kanal) {
  const b = baskinOlustur(kanal.guild.id, kanal.id);
  if (!b) return null;
  const mesaj = await kanal.send(baskinMesaji(b));
  const db = depo.oku();
  if (db.aktif[kanal.guild.id]?.id === b.id) {
    db.aktif[kanal.guild.id].mesajId = mesaj.id;
    depo.yaz(db);
  }
  zamanlayiciKur(kanal.client, kanal.guild.id, b.bitis);
  return b;
}

/** Sohbet mesajlarında nadiren otomatik baskın çıkarır. Ucuz kontroller önce yapılır. */
export async function otomatikBaskinDene(message, rng = Math.random) {
  if (rng() >= OTOMATIK_SANS) return null;
  const ayar = baskinAyarGetir(message.guild.id);
  if (!ayar.otomatik || !ayar.kanalId) return null;
  if (Date.now() - (ayar.sonBaskin || 0) < OTOMATIK_ARALIK_MS) return null;
  const kanal = message.guild.channels.cache.get(ayar.kanalId);
  if (!kanal?.isTextBased()) return null;
  return baskinIlanEt(kanal);
}

/** Bot yeniden başladığında yarıda kalan baskınları sürdürür ya da kapatır. */
export function baskinlariSurdur(client) {
  for (const [guildId, b] of Object.entries(depo.oku().aktif)) {
    if (b.bitis <= Date.now()) baskinKapat(client, guildId);
    else zamanlayiciKur(client, guildId, b.bitis);
  }
}
