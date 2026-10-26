import { gorevIlerlet } from './gorevServisi.js';
import { jsonDepo } from './jsonDepo.js';
import { ryoEkle, ryoDus } from './ekonomiServisi.js';

const depo = jsonDepo('balik.json', () => ({ kullanicilar: {} }));

export const ATIS_BEKLEME_MS = 15_000;
export const GUNLUK_ATIS = 80;
export const MAKS_OLTA = 10;

/** Av tablosu: ağırlık (w) göreli şans, değer Ryo cinsinden satış fiyatıdır. */
export const BALIKLAR = [
  { id: 'carik', ad: 'Eski Çarık', emoji: '👟', w: 14, deger: 1, cop: true },
  { id: 'yosun', ad: 'Yosun Yumağı', emoji: '🌿', w: 10, deger: 2, cop: true },
  { id: 'sazan', ad: 'Sazan', emoji: '🐟', w: 30, deger: 12, kg: [0.5, 4] },
  { id: 'alabalik', ad: 'Alabalık', emoji: '🐠', w: 20, deger: 22, kg: [0.3, 2] },
  { id: 'yilan', ad: 'Yılan Balığı', emoji: '🐍', w: 10, deger: 45, kg: [0.5, 3] },
  { id: 'ahtapot', ad: 'Mürekkep Ahtapotu', emoji: '🐙', w: 6, deger: 90, kg: [1, 6] },
  { id: 'koi', ad: 'Koi', emoji: '🎏', w: 4, deger: 160, kg: [2, 9] },
  { id: 'altinkoi', ad: 'Altın Koi', emoji: '✨', w: 1.2, deger: 600, kg: [3, 12] },
  { id: 'golge', ad: 'Gölge Balığı', emoji: '🌑', w: 0.4, deger: 2000, kg: [5, 20] }
];

export const TUR_SAYISI = BALIKLAR.filter(b => !b.cop).length;

export function yukseltmeBedeli(olta) {
  return Math.round(500 * Math.pow(olta, 1.8));
}

/** Olta seviyesi çöp şansını azaltır, nadir balık şansını artırır. */
export function agirliklar(olta) {
  return BALIKLAR.map(b => {
    if (b.cop) return Math.max(0.3, 1 - 0.07 * (olta - 1)) * b.w;
    if (b.deger >= 45) return b.w * (1 + 0.2 * (olta - 1));
    return b.w;
  });
}

export function balikSec(olta, rng = Math.random) {
  const w = agirliklar(olta);
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < BALIKLAR.length; i++) {
    r -= w[i];
    if (r < 0) return BALIKLAR[i];
  }
  return BALIKLAR[BALIKLAR.length - 1];
}

function gunAnahtari(simdi) {
  return new Date(simdi).toISOString().slice(0, 10);
}

function kayitAl(db, userId) {
  if (!db.kullanicilar[userId]) {
    db.kullanicilar[userId] = { olta: 1, son: 0, gun: '', bugun: 0, canta: {}, kesfedilen: [], rekor: null, toplamAv: 0 };
  }
  return db.kullanicilar[userId];
}

export function cantaDegeri(canta) {
  return Object.entries(canta).reduce((t, [id, adet]) => {
    const b = BALIKLAR.find(x => x.id === id);
    return t + (b ? b.deger * adet : 0);
  }, 0);
}

export function balikDurumu(userId, simdi = Date.now()) {
  const k = depo.oku().kullanicilar[userId] || { olta: 1, son: 0, gun: '', bugun: 0, canta: {}, kesfedilen: [], rekor: null, toplamAv: 0 };
  const bugun = k.gun === gunAnahtari(simdi) ? k.bugun : 0;
  return {
    ...k,
    bugun,
    kalanAtis: GUNLUK_ATIS - bugun,
    beklemeMs: Math.max(0, k.son + ATIS_BEKLEME_MS - simdi),
    cantaDeger: cantaDegeri(k.canta),
    sonrakiBedel: k.olta >= MAKS_OLTA ? null : yukseltmeBedeli(k.olta)
  };
}

export function oltaAt(userId, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const gun = gunAnahtari(simdi);
  if (k.gun !== gun) { k.gun = gun; k.bugun = 0; }
  if (k.bugun >= GUNLUK_ATIS) return { basarili: false, sebep: 'limit' };
  if (simdi - k.son < ATIS_BEKLEME_MS) return { basarili: false, sebep: 'bekle', beklemeMs: k.son + ATIS_BEKLEME_MS - simdi };

  const balik = balikSec(k.olta, rng);
  const kg = balik.kg ? Math.round((balik.kg[0] + rng() * (balik.kg[1] - balik.kg[0])) * 100) / 100 : 0;
  k.son = simdi;
  k.bugun += 1;
  k.toplamAv += 1;
  k.canta[balik.id] = (k.canta[balik.id] || 0) + 1;

  let yeniTur = false;
  let bonus = 0;
  if (!balik.cop && !k.kesfedilen.includes(balik.id)) {
    k.kesfedilen.push(balik.id);
    yeniTur = true;
    bonus = balik.deger;
  }
  const yeniRekor = !!balik.kg && (!k.rekor || kg > k.rekor.kg);
  if (yeniRekor) k.rekor = { id: balik.id, kg };
  depo.yaz(db);
  if (bonus > 0) ryoEkle(userId, bonus, 'Balık keşif bonusu');
  gorevIlerlet(userId, 'balik');
  return { basarili: true, balik, kg, yeniTur, bonus, yeniRekor };
}

/** Çantadaki tüm avı Ryo'ya çevirir. */
export function cantayiSat(userId) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const miktar = cantaDegeri(k.canta);
  if (miktar < 1) return { basarili: false, sebep: 'bos' };
  const adet = Object.values(k.canta).reduce((a, b) => a + b, 0);
  k.canta = {};
  depo.yaz(db);
  ryoEkle(userId, miktar, 'Balık satışı');
  return { basarili: true, miktar, adet };
}

export function oltaYukselt(userId) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (k.olta >= MAKS_OLTA) return { basarili: false, sebep: 'maks' };
  const bedel = yukseltmeBedeli(k.olta);
  if (!ryoDus(userId, bedel, `Olta seviye ${k.olta + 1}`)) return { basarili: false, sebep: 'yetersiz', bedel };
  k.olta += 1;
  depo.yaz(db);
  return { basarili: true, olta: k.olta, bedel };
}
