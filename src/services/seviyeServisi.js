import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { ryoEkle } from './ekonomiServisi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSYA = path.resolve(__dirname, '../../data/seviyeler.json');

export const XP_BEKLEME_MS = 60 * 1000;
const MIN_MESAJ_UZUNLUK = 4;
const SEVIYE_ODUL_CARPANI = 50;
const MAKS_SEVIYE = 200;

function oku() {
  try {
    const db = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
    return db && typeof db.kullanicilar === 'object' ? db : { kullanicilar: {} };
  } catch {
    return { kullanicilar: {} };
  }
}

function yaz(db) {
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(db, null, 2), 'utf8');
}

const anahtar = (guildId, userId) => `${guildId}:${userId}`;

/** Bir seviyeden sonrakine geçmek için gereken XP (MEE6 benzeri eğri). */
export function seviyeIcinXp(seviye) {
  return 5 * seviye * seviye + 50 * seviye + 100;
}

/** Toplam XP'den seviye, o seviyedeki ilerleme ve eşik değerini çıkarır. */
export function seviyeHesapla(toplamXp) {
  let seviye = 0;
  let kalan = Math.max(0, Math.floor(toplamXp));
  while (seviye < MAKS_SEVIYE && kalan >= seviyeIcinXp(seviye)) {
    kalan -= seviyeIcinXp(seviye);
    seviye++;
  }
  return { seviye, ilerleme: kalan, esik: seviyeIcinXp(seviye) };
}

/**
 * Mesaj başına XP verir. Bekleme süresi dolmadıysa veya mesaj çok kısaysa hiçbir şey yapmaz.
 * Seviye atlanırsa Ryo ödülü hesaba yatırılır.
 * @returns {{xp:number, seviye:number, seviyeAtladi:boolean, odul:number}|null}
 */
export function mesajXpEkle(guildId, userId, icerik = '', simdi = Date.now()) {
  if (String(icerik).trim().length < MIN_MESAJ_UZUNLUK) return null;
  const db = oku();
  const k = anahtar(guildId, userId);
  const kayit = db.kullanicilar[k] || { xp: 0, mesaj: 0, son: 0 };
  if (simdi - kayit.son < XP_BEKLEME_MS) return null;

  const eskiSeviye = seviyeHesapla(kayit.xp).seviye;
  kayit.xp += crypto.randomInt(15, 26);
  kayit.mesaj += 1;
  kayit.son = simdi;
  db.kullanicilar[k] = kayit;
  yaz(db);

  const yeniSeviye = seviyeHesapla(kayit.xp).seviye;
  const seviyeAtladi = yeniSeviye > eskiSeviye;
  const odul = seviyeAtladi ? yeniSeviye * SEVIYE_ODUL_CARPANI : 0;
  if (odul > 0) ryoEkle(userId, odul, `Seviye ${yeniSeviye} ödülü`);
  return { xp: kayit.xp, seviye: yeniSeviye, seviyeAtladi, odul };
}

export function seviyeDurumu(guildId, userId) {
  const kayit = oku().kullanicilar[anahtar(guildId, userId)] || { xp: 0, mesaj: 0 };
  return { ...kayit, ...seviyeHesapla(kayit.xp) };
}

/** Sunucudaki en yüksek XP'li kullanıcılar. */
export function seviyeSiralamasi(guildId, limit = 10) {
  const onek = `${guildId}:`;
  return Object.entries(oku().kullanicilar)
    .filter(([k]) => k.startsWith(onek))
    .map(([k, v]) => ({ userId: k.slice(onek.length), xp: v.xp, ...seviyeHesapla(v.xp) }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

export function sunucuSirasi(guildId, userId) {
  const sira = seviyeSiralamasi(guildId, Number.MAX_SAFE_INTEGER).findIndex(x => x.userId === userId);
  return sira === -1 ? null : sira + 1;
}
