import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSYA = path.resolve(__dirname, '../../data/cekilisler.json');

export const MAKS_ODUL = 100;
export const MIN_DK = 1;
export const MAKS_DK = 60 * 24 * 14; // 14 gün
export const SUNUCU_BASI_AKTIF_LIMIT = 5;
const KONTROL_ARALIGI_MS = 15 * 1000;
const ESKI_KAYIT_MS = 7 * 24 * 3600 * 1000;

function oku() {
  try {
    const db = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
    return Array.isArray(db.cekilisler) ? db : { cekilisler: [] };
  } catch {
    return { cekilisler: [] };
  }
}

function yaz(db) {
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(db, null, 2), 'utf8');
}

/** Yeni çekiliş kaydı açar. mesajId sonradan `mesajBagla` ile eklenir. */
export function cekilisOlustur({ guildId, channelId, odul, dakika, kazananSayisi, olusturanId }) {
  const temizOdul = String(odul || '').trim().slice(0, MAKS_ODUL);
  const dk = Math.floor(Number(dakika));
  const kazanan = Math.floor(Number(kazananSayisi) || 1);
  if (!temizOdul) return { basarili: false, hata: 'Ödül boş olamaz.' };
  if (!Number.isFinite(dk) || dk < MIN_DK || dk > MAKS_DK) {
    return { basarili: false, hata: `Süre ${MIN_DK} ile ${MAKS_DK} dakika (14 gün) arasında olmalı.` };
  }
  if (kazanan < 1 || kazanan > 10) return { basarili: false, hata: 'Kazanan sayısı 1 ile 10 arasında olmalı.' };

  const db = oku();
  const aktif = db.cekilisler.filter(c => c.guildId === guildId && !c.bitti).length;
  if (aktif >= SUNUCU_BASI_AKTIF_LIMIT) {
    return { basarili: false, hata: `Sunucuda en fazla ${SUNUCU_BASI_AKTIF_LIMIT} aktif çekiliş olabilir.` };
  }

  const cekilis = {
    id: crypto.randomBytes(4).toString('hex'),
    guildId, channelId, mesajId: null,
    odul: temizOdul, kazananSayisi: kazanan, olusturanId,
    bitis: Date.now() + dk * 60 * 1000,
    katilimcilar: [], kazananlar: [], bitti: false
  };
  db.cekilisler.push(cekilis);
  yaz(db);
  return { basarili: true, cekilis };
}

export function mesajBagla(id, mesajId) {
  const db = oku();
  const c = db.cekilisler.find(x => x.id === id);
  if (!c) return;
  c.mesajId = mesajId;
  yaz(db);
}

export function cekilisGetir(id) {
  return oku().cekilisler.find(c => c.id === id) || null;
}

/** Katılımı açıp kapatır: aynı butona tekrar basan çekilişten ayrılır. */
export function katilimDegistir(id, userId) {
  const db = oku();
  const c = db.cekilisler.find(x => x.id === id);
  if (!c) return { durum: 'yok' };
  if (c.bitti || Date.now() >= c.bitis) return { durum: 'bitti' };
  const zatenVar = c.katilimcilar.includes(userId);
  c.katilimcilar = zatenVar ? c.katilimcilar.filter(u => u !== userId) : [...c.katilimcilar, userId];
  yaz(db);
  return { durum: zatenVar ? 'ayrildi' : 'katildi', sayi: c.katilimcilar.length };
}

/** Katılımcılardan tekrarsız rastgele kazanan seçer. */
export function kazananSec(katilimcilar, adet) {
  const havuz = [...katilimcilar];
  const secilen = [];
  while (secilen.length < adet && havuz.length) {
    secilen.push(havuz.splice(crypto.randomInt(havuz.length), 1)[0]);
  }
  return secilen;
}

/** Süresi dolanları bitirir ve kazananlarıyla birlikte döndürür. */
export function suresiDolanlariBitir(simdi = Date.now()) {
  const db = oku();
  const dolan = db.cekilisler.filter(c => !c.bitti && c.bitis <= simdi);
  if (!dolan.length) return [];
  for (const c of dolan) {
    c.kazananlar = kazananSec(c.katilimcilar, c.kazananSayisi);
    c.bitti = true;
  }
  // Bitmiş eski kayıtlar 7 gün sonra temizlenir.
  db.cekilisler = db.cekilisler.filter(c => !c.bitti || simdi - c.bitis < ESKI_KAYIT_MS);
  yaz(db);
  return dolan;
}

/** Yönetici çekilişi erken bitirir. */
export function erkenBitir(id, guildId) {
  const db = oku();
  const c = db.cekilisler.find(x => x.id === id && x.guildId === guildId);
  if (!c || c.bitti) return null;
  c.bitis = Date.now();
  yaz(db);
  return suresiDolanlariBitir().find(x => x.id === id) || null;
}

export function aktifCekilisler(guildId) {
  return oku().cekilisler.filter(c => c.guildId === guildId && !c.bitti);
}

export function cekilisSonucuMesaji(c) {
  return c.kazananlar.length
    ? `🎉 **${c.odul}** çekilişi bitti! Kazanan: ${c.kazananlar.map(u => `<@${u}>`).join(', ')}`
    : `😔 **${c.odul}** çekilişi bitti ama kimse katılmadı.`;
}

export async function sonucuDuyur(client, c) {
  try {
    const kanal = await client.channels.fetch(c.channelId);
    if (!kanal?.isTextBased?.()) return;
    await kanal.send({
      content: cekilisSonucuMesaji(c),
      allowedMentions: { users: c.kazananlar },
      ...(c.mesajId ? { reply: { messageReference: c.mesajId, failIfNotExists: false } } : {})
    });
    if (c.mesajId) {
      const mesaj = await kanal.messages.fetch(c.mesajId).catch(() => null);
      if (mesaj) await mesaj.edit({ components: [] }).catch(() => null);
    }
  } catch (err) {
    console.warn('[Çekiliş] Sonuç duyurulamadı:', err.message);
  }
}

let zamanlayici = null;

export function cekilisServisiniBaslat(client) {
  if (zamanlayici) clearInterval(zamanlayici);
  const tur = async () => {
    for (const c of suresiDolanlariBitir()) await sonucuDuyur(client, c);
  };
  zamanlayici = setInterval(() => tur().catch(err => console.error('[Çekiliş]', err.message)), KONTROL_ARALIGI_MS);
  zamanlayici.unref?.();
  tur().catch(() => {});
  console.log('[Çekiliş] Servis başlatıldı.');
}
