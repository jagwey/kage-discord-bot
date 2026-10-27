import { jsonDepo } from './jsonDepo.js';
import { ryoDus, ryoEkle } from './ekonomiServisi.js';
import { MALZEMELER, malzemeEkle, malzemeHarca } from './zanaatServisi.js';

const depo = jsonDepo('kara_borsa.json', () => ({ saat: null, nadirAlanlar: [] }));

const SAAT_MS = 60 * 60 * 1000;
/** Malzemelerin ortalama fiyatı; her saat 0.6x-1.6x arasında dalgalanır. */
export const TABAN_FIYATLAR = { demir: 40, golge_ozu: 150, pul: 30, mercan: 220, ruh_tasi: 900 };
/** Tüccar malzemeyi alış fiyatının bu oranına geri alır. */
export const SATIS_ORANI = 0.6;
export const MAKS_ISLEM_ADEDI = 50;
/** Saatin nadir eşyasından o saat içinde satılabilecek toplam adet. */
export const NADIR_STOK = 5;

export const NADIR_ESYALAR = [
  { id: 'ruh_paketi', ad: 'Mühürlü Ruh Taşları', emoji: '💠', fiyat: 1500, icerik: { ruh_tasi: 2 } },
  { id: 'golge_sandik', ad: 'Gölge Sandığı', emoji: '🌑', fiyat: 1100, icerik: { golge_ozu: 6, demir: 10 } },
  { id: 'mercan_kesesi', ad: 'Derin Deniz Kesesi', emoji: '🪸', fiyat: 900, icerik: { mercan: 5, pul: 15 } },
  { id: 'demirci_seti', ad: 'Kayıp Demirci Seti', emoji: '⚒️', fiyat: 1400, icerik: { demir: 15, golge_ozu: 3, ruh_tasi: 1 } }
];

export function saatAnahtari(simdi = Date.now()) {
  return Math.floor(simdi / SAAT_MS);
}

/** Aynı saat için her çağrıda aynı sayıları veren tohumlu üreteç (mulberry32). */
function tohumluRng(tohum) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Saatlik piyasa: malzeme fiyatları, saatin nadir eşyası ve kalan stok. */
export function piyasa(simdi = Date.now()) {
  const saat = saatAnahtari(simdi);
  const rng = tohumluRng(saat);
  const fiyatlar = {};
  for (const [id, taban] of Object.entries(TABAN_FIYATLAR)) {
    const carpan = 0.6 + rng();
    const al = Math.max(1, Math.round(taban * carpan));
    fiyatlar[id] = { al, sat: Math.max(1, Math.round(al * SATIS_ORANI)), carpan };
  }
  const nadir = NADIR_ESYALAR[Math.floor(rng() * NADIR_ESYALAR.length)];
  const db = depo.oku();
  const alanlar = db.saat === saat ? db.nadirAlanlar : [];
  return { saat, fiyatlar, nadir, alanlar, nadirKalan: Math.max(0, NADIR_STOK - alanlar.length), bitis: (saat + 1) * SAAT_MS };
}

function adetGecerli(adet) {
  return Number.isInteger(adet) && adet >= 1 && adet <= MAKS_ISLEM_ADEDI;
}

export function malzemeAl(userId, malzemeId, adet, simdi = Date.now()) {
  if (!MALZEMELER[malzemeId]) return { basarili: false, mesaj: 'Tüccar bu malzemeyi tanımıyor.' };
  if (!adetGecerli(adet)) return { basarili: false, mesaj: `Tek seferde 1-${MAKS_ISLEM_ADEDI} adet.` };
  const fiyat = piyasa(simdi).fiyatlar[malzemeId].al * adet;
  if (!ryoDus(userId, fiyat, `Kara borsa alış: ${MALZEMELER[malzemeId].ad} x${adet}`)) {
    return { basarili: false, mesaj: `Cüzdanın yetmiyor. Gereken: **${fiyat} Ryo**.` };
  }
  malzemeEkle(userId, { [malzemeId]: adet });
  return { basarili: true, malzeme: MALZEMELER[malzemeId], adet, fiyat };
}

export function malzemeSat(userId, malzemeId, adet, simdi = Date.now()) {
  if (!MALZEMELER[malzemeId]) return { basarili: false, mesaj: 'Tüccar bu malzemeyi tanımıyor.' };
  if (!adetGecerli(adet)) return { basarili: false, mesaj: `Tek seferde 1-${MAKS_ISLEM_ADEDI} adet.` };
  if (!malzemeHarca(userId, { [malzemeId]: adet })) {
    return { basarili: false, mesaj: `Çantanda ${adet} adet ${MALZEMELER[malzemeId].emoji} ${MALZEMELER[malzemeId].ad} yok.` };
  }
  const kazanc = piyasa(simdi).fiyatlar[malzemeId].sat * adet;
  ryoEkle(userId, kazanc, `Kara borsa satış: ${MALZEMELER[malzemeId].ad} x${adet}`);
  return { basarili: true, malzeme: MALZEMELER[malzemeId], adet, kazanc };
}

/** Saatin nadir eşyasını alır. Herkes saatte bir kez alabilir, stok sınırlıdır. */
export function nadirAl(userId, simdi = Date.now()) {
  const p = piyasa(simdi);
  if (p.alanlar.includes(userId)) return { basarili: false, mesaj: 'Bu saatin nadir eşyasını zaten aldın. Tüccar bir sonraki saati bekliyor.' };
  if (p.nadirKalan < 1) return { basarili: false, mesaj: 'Stok tükendi. Gölgeler bir sonraki saatte yeni mal getirecek.' };
  if (!ryoDus(userId, p.nadir.fiyat, `Kara borsa nadir: ${p.nadir.ad}`)) {
    return { basarili: false, mesaj: `Cüzdanın yetmiyor. Gereken: **${p.nadir.fiyat} Ryo**.` };
  }
  const db = depo.oku();
  if (db.saat !== p.saat) {
    db.saat = p.saat;
    db.nadirAlanlar = [];
  }
  db.nadirAlanlar.push(userId);
  depo.yaz(db);
  malzemeEkle(userId, p.nadir.icerik);
  return { basarili: true, esya: p.nadir };
}
