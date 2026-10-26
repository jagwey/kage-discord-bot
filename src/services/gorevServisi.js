import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';

const depo = jsonDepo('gorevler.json', () => ({ kullanicilar: {} }));

export const GOREV_HAVUZU = [
  { id: 'mesaj', ad: 'Sohbet et', aciklama: 'Sunucuda mesaj yaz', hedefler: [20, 40], ryo: [120, 200] },
  { id: 'balik', ad: 'Balıkçı', aciklama: 'Olta at (/balik)', hedefler: [8, 15], ryo: [150, 250] },
  { id: 'zindan', ad: 'Zindan avcısı', aciklama: 'Zindanda zafer kazan', hedefler: [1, 2], ryo: [200, 350] },
  { id: 'boss', ad: 'Boss avı', aciklama: 'Boss\'a saldır (/boss)', hedefler: [1, 1], ryo: [180, 180] }
];

export const GUNLUK_GOREV_SAYISI = 3;
export const TAMAMLAMA_BONUSU = 250;

export function gunAnahtari(simdi = Date.now()) {
  return new Date(simdi + 3 * 3600000).toISOString().slice(0, 10);
}

function karistir(liste, rng) {
  const k = [...liste];
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
}

function kayitAl(db, userId, simdi, rng = Math.random) {
  const gun = gunAnahtari(simdi);
  let k = db.kullanicilar[userId];
  if (!k || k.gun !== gun) {
    const secilen = karistir(GOREV_HAVUZU, rng).slice(0, GUNLUK_GOREV_SAYISI).map(g => {
      const i = Math.floor(rng() * g.hedefler.length);
      return { id: g.id, hedef: g.hedefler[i], ryo: g.ryo[i], ilerleme: 0, alindi: false };
    });
    k = { gun, gorevler: secilen, bonusAlindi: false, tamamlanan: k?.tamamlanan || 0 };
    db.kullanicilar[userId] = k;
  }
  return k;
}

/** Oyun olaylarından çağrılır; bugünkü ilgili görevin ilerlemesini artırır. */
export function gorevIlerlet(userId, tur, adet = 1, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId, simdi);
  let degisti = false;
  for (const g of k.gorevler) {
    if (g.id === tur && g.ilerleme < g.hedef) {
      g.ilerleme = Math.min(g.hedef, g.ilerleme + adet);
      degisti = true;
    }
  }
  if (degisti) depo.yaz(db);
}

export function gorevDurumu(userId, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const k = kayitAl(db, userId, simdi, rng);
  depo.yaz(db);
  const gorevler = k.gorevler.map(g => ({ ...GOREV_HAVUZU.find(x => x.id === g.id), ...g }));
  const hepsiBitti = gorevler.every(g => g.ilerleme >= g.hedef);
  const alinabilir = gorevler.reduce((t, g) => t + (g.ilerleme >= g.hedef && !g.alindi ? g.ryo : 0), 0)
    + (hepsiBitti && !k.bonusAlindi ? TAMAMLAMA_BONUSU : 0);
  return { gorevler, hepsiBitti, bonusAlindi: k.bonusAlindi, alinabilir, tamamlanan: k.tamamlanan };
}

/** Biten görevlerin ödülünü verir; hepsi bittiyse günlük bonus da eklenir. */
export function gorevOdulAl(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId, simdi);
  let toplam = 0;
  for (const g of k.gorevler) {
    if (g.ilerleme >= g.hedef && !g.alindi) { g.alindi = true; toplam += g.ryo; }
  }
  const hepsi = k.gorevler.every(g => g.ilerleme >= g.hedef);
  let bonus = 0;
  if (hepsi && !k.bonusAlindi) { k.bonusAlindi = true; bonus = TAMAMLAMA_BONUSU; k.tamamlanan += 1; }
  if (toplam + bonus < 1) return { basarili: false };
  depo.yaz(db);
  ryoEkle(userId, toplam + bonus, 'Günlük görev ödülü');
  return { basarili: true, toplam, bonus };
}
