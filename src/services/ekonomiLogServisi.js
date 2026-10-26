import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSYA = path.resolve(__dirname, '../../data/ekonomi_log.json');

export const MAKS_KAYIT = 500;
// Sohbet ödülü gibi 1-4 Ryo'luk küçük hareketler günlüğü şişirmesin diye kaydedilmez.
export const MIN_KAYIT_MIKTARI = 5;

let kayitlar = null;

function yukle() {
  if (kayitlar) return kayitlar;
  try {
    const veri = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
    kayitlar = Array.isArray(veri) ? veri : [];
  } catch {
    kayitlar = [];
  }
  return kayitlar;
}

function kaydet() {
  try {
    fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
    fs.writeFileSync(DOSYA, JSON.stringify(kayitlar), 'utf8');
  } catch (err) {
    console.error('[EkonomiLog] Yazılamadı:', err.message);
  }
}

/**
 * Bir Ryo hareketini günlüğe ekler. Günlük en fazla MAKS_KAYIT kayıt tutar, eskiler silinir.
 * @param {'ekle'|'dus'} tur
 */
export function hareketKaydet(userId, tur, miktar, neden = '', bakiye = null) {
  if (miktar < MIN_KAYIT_MIKTARI) return;
  const liste = yukle();
  liste.push({ t: Date.now(), u: userId, tur, m: miktar, n: String(neden).slice(0, 60), b: bakiye });
  if (liste.length > MAKS_KAYIT) liste.splice(0, liste.length - MAKS_KAYIT);
  kaydet();
}

/** En yeni hareketler önce gelir. userId verilirse yalnız o kullanıcının hareketleri döner. */
export function sonHareketler(limit = 15, userId = null) {
  return yukle()
    .filter(k => !userId || k.u === userId)
    .slice(-limit)
    .reverse();
}

/** Testler için: bellekteki önbelleği sıfırlar. */
export function onbellegiSifirla() {
  kayitlar = null;
}
