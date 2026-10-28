import { oyunOlayi } from './oyunOlayServisi.js';
import { jsonDepo } from './jsonDepo.js';
import { ryoEkle, ryoDus } from './ekonomiServisi.js';

const depo = jsonDepo('bahce.json', () => ({ kullanicilar: {} }));

/**
 * Tohumlar. Uzun süren tohum saat başına biraz daha fazla kazandırır;
 * böylece sık uğrayan da gece ekip yatan da kârlı çıkar.
 */
export const TOHUMLAR = [
  { id: 'pirinc', ad: 'Pirinç', emoji: '🌾', bedel: 20, sureDk: 30, deger: 32 },
  { id: 'daikon', ad: 'Daikon', emoji: '🥕', bedel: 45, sureDk: 60, deger: 72 },
  { id: 'cay', ad: 'Yeşil Çay', emoji: '🍵', bedel: 90, sureDk: 120, deger: 150 },
  { id: 'kiraz', ad: 'Sakura Kirazı', emoji: '🍒', bedel: 180, sureDk: 240, deger: 310 },
  { id: 'lotus', ad: 'Kutsal Lotus', emoji: '🪷', bedel: 350, sureDk: 480, deger: 640 }
];

export const BASLANGIC_PARSEL = 3;
export const MAKS_PARSEL = 6;
/** 4., 5. ve 6. parselin bedeli. */
export const PARSEL_BEDELLERI = [1500, 3500, 7500];
/** Sulama kalan büyüme süresini bu oranda kısaltır. Her ekim bir kez sulanır. */
export const SULAMA_KISALTMA = 0.25;
export const ALTIN_SANS = 0.07;
export const SULU_ALTIN_SANS = 0.12;
export const ALTIN_CARPAN = 3;

/** Ambardaki mahsuller: her tohumun normal ve altın hali. Ticaret ve açık artırma da bunu kullanır. */
export const MAHSULLER = Object.fromEntries(TOHUMLAR.flatMap(t => [
  [t.id, { ad: t.ad, emoji: t.emoji, deger: t.deger }],
  [`${t.id}_altin`, { ad: `Altın ${t.ad}`, emoji: t.emoji, deger: t.deger * ALTIN_CARPAN, altin: true }]
]));

const tohumBul = id => TOHUMLAR.find(t => t.id === id);

function kayitAl(db, userId) {
  db.kullanicilar[userId] = {
    parsel: BASLANGIC_PARSEL, ekimler: [], ambar: {}, toplamHasat: 0, altinHasat: 0,
    ...db.kullanicilar[userId]
  };
  const k = db.kullanicilar[userId];
  while (k.ekimler.length < k.parsel) k.ekimler.push(null);
  return k;
}

export function ambarDegeri(ambar) {
  return Object.entries(ambar || {}).reduce((t, [id, n]) => t + (MAHSULLER[id]?.deger || 0) * n, 0);
}

function ekimDurumu(e, simdi) {
  if (!e) return null;
  const t = tohumBul(e.tohum);
  const toplam = Math.max(1, e.bitis - e.ekim);
  return {
    ...e,
    tohumBilgi: t,
    hazir: simdi >= e.bitis,
    oran: Math.min(1, Math.max(0, (simdi - e.ekim) / toplam)),
    kalanMs: Math.max(0, e.bitis - simdi)
  };
}

export function bahceDurumu(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const parseller = k.ekimler.map(e => ekimDurumu(e, simdi));
  return {
    parselSayisi: k.parsel,
    parseller,
    ambar: k.ambar,
    ambarDeger: ambarDegeri(k.ambar),
    toplamHasat: k.toplamHasat,
    altinHasat: k.altinHasat,
    hazirSayisi: parseller.filter(p => p?.hazir).length,
    bosSayisi: parseller.filter(p => !p).length,
    sulanabilir: parseller.filter(p => p && !p.hazir && !p.sulandi).length,
    sonrakiParselBedeli: k.parsel < MAKS_PARSEL ? PARSEL_BEDELLERI[k.parsel - BASLANGIC_PARSEL] : null
  };
}

/** İlk boş parsele tohum eker. */
export function tohumEk(userId, tohumId, simdi = Date.now()) {
  const t = tohumBul(tohumId);
  if (!t) return { basarili: false, sebep: 'tohum' };
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const parsel = k.ekimler.findIndex(e => !e);
  if (parsel < 0) return { basarili: false, sebep: 'dolu' };
  if (!ryoDus(userId, t.bedel, `Bahçe tohumu: ${t.ad}`)) return { basarili: false, sebep: 'yetersiz', bedel: t.bedel };
  k.ekimler[parsel] = { tohum: t.id, ekim: simdi, bitis: simdi + t.sureDk * 60000, sulandi: false };
  depo.yaz(db);
  return { basarili: true, parsel, tohum: t };
}

/** Büyüyen ve henüz sulanmamış bütün parselleri sular. */
export function bahceyiSula(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  let adet = 0;
  for (const e of k.ekimler) {
    if (!e || e.sulandi || simdi >= e.bitis) continue;
    e.bitis = Math.round(e.bitis - (e.bitis - simdi) * SULAMA_KISALTMA);
    e.sulandi = true;
    adet++;
  }
  if (!adet) return { basarili: false };
  depo.yaz(db);
  return { basarili: true, adet };
}

/** Olgunlaşmış bütün parselleri hasat edip ambara koyar. */
export function hasatEt(userId, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const hasat = [];
  k.ekimler = k.ekimler.map(e => {
    if (!e || simdi < e.bitis) return e;
    const altin = rng() < (e.sulandi ? SULU_ALTIN_SANS : ALTIN_SANS);
    const id = altin ? `${e.tohum}_altin` : e.tohum;
    k.ambar[id] = (k.ambar[id] || 0) + 1;
    hasat.push({ id, altin });
    return null;
  });
  if (!hasat.length) return { basarili: false };
  k.toplamHasat += hasat.length;
  k.altinHasat += hasat.filter(h => h.altin).length;
  depo.yaz(db);
  const { notlar } = oyunOlayi(userId, 'bahce', { adet: hasat.length });
  return { basarili: true, hasat, notlar };
}

/** Ambardaki bütün mahsulü satar. */
export function ambariSat(userId) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const miktar = ambarDegeri(k.ambar);
  const adet = Object.values(k.ambar).reduce((t, n) => t + n, 0);
  if (miktar < 1) return { basarili: false };
  k.ambar = {};
  depo.yaz(db);
  ryoEkle(userId, miktar, 'Bahçe mahsulü satışı');
  return { basarili: true, miktar, adet };
}

export function parselAl(userId) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (k.parsel >= MAKS_PARSEL) return { basarili: false, sebep: 'maks' };
  const bedel = PARSEL_BEDELLERI[k.parsel - BASLANGIC_PARSEL];
  if (!ryoDus(userId, bedel, 'Bahçe parseli')) return { basarili: false, sebep: 'yetersiz', bedel };
  k.parsel++;
  k.ekimler.push(null);
  depo.yaz(db);
  return { basarili: true, bedel, parsel: k.parsel };
}

export function ambarGetir(userId) {
  return { ...(depo.oku().kullanicilar[userId]?.ambar || {}) };
}

export function mahsulEkle(userId, ekler) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  for (const [id, n] of Object.entries(ekler)) {
    if (MAHSULLER[id] && n > 0) k.ambar[id] = (k.ambar[id] || 0) + n;
  }
  depo.yaz(db);
}

/** Ambardan mahsul düşer; yetmezse hiçbir şey düşmez ve false döner. */
export function mahsulHarca(userId, harcanacak) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (Object.entries(harcanacak).some(([id, n]) => !MAHSULLER[id] || (k.ambar[id] || 0) < n)) return false;
  for (const [id, n] of Object.entries(harcanacak)) {
    k.ambar[id] -= n;
    if (k.ambar[id] <= 0) delete k.ambar[id];
  }
  depo.yaz(db);
  return true;
}
