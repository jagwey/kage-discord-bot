import { oyunOlayi } from './oyunOlayServisi.js';
import { jsonDepo } from './jsonDepo.js';
import { ryoEkle, ryoDus } from './ekonomiServisi.js';
import { gunAnahtari, haftaAnahtari } from './gorevServisi.js';

const depo = jsonDepo('balik.json', () => ({ kullanicilar: {} }));

export const ATIS_BEKLEME_MS = 10_000;
export const GUNLUK_ATIS = 80;
export const MAKS_OLTA = 10;

/** Atıştan sonra şamandıranın batması 2-6 sn sürer; ardından çekmek için pencere açılır. */
export const ISIRMA_MIN_MS = 2_000;
export const ISIRMA_ARALIK_MS = 4_000;
export const CEKME_PENCERESI_MS = 3_500;
/** Pencerenin ilk kısmında çekmek kusursuz sayılır: nadir balık şansı ve ağırlık artar. */
export const KUSURSUZ_MS = 1_500;
export const KUSURSUZ_OLTA_BONUSU = 3;
export const KUSURSUZ_KG_CARPANI = 1.2;

export const AKVARYUM_YUVA = 5;
/** Akvaryumdaki balık saatte satış değerinin bu oranı kadar Ryo üretir. */
export const AKVARYUM_ORAN = 0.03;
export const AKVARYUM_BIRIKIM_SAAT = 24;

export const TURNUVA_ODULLERI = [3000, 1500, 750];

export const MEVSIMLER = {
  kis: { ad: 'Kış', emoji: '❄️' },
  ilkbahar: { ad: 'İlkbahar', emoji: '🌸' },
  yaz: { ad: 'Yaz', emoji: '☀️' },
  sonbahar: { ad: 'Sonbahar', emoji: '🍁' }
};

/**
 * Av tablosu: ağırlık (w) göreli şans, değer Ryo cinsinden satış fiyatıdır.
 * `gece` balıkları sadece 20:00-06:00 (UTC+3), `mevsim` balıkları sadece o mevsimde çıkar.
 */
export const BALIKLAR = [
  { id: 'carik', ad: 'Eski Çarık', emoji: '👟', w: 14, deger: 1, cop: true },
  { id: 'yosun', ad: 'Yosun Yumağı', emoji: '🌿', w: 10, deger: 2, cop: true },
  { id: 'sazan', ad: 'Sazan', emoji: '🐟', w: 30, deger: 12, kg: [0.5, 4] },
  { id: 'alabalik', ad: 'Alabalık', emoji: '🐠', w: 20, deger: 22, kg: [0.3, 2] },
  { id: 'yilan', ad: 'Yılan Balığı', emoji: '🐍', w: 10, deger: 45, kg: [0.5, 3] },
  { id: 'ahtapot', ad: 'Mürekkep Ahtapotu', emoji: '🐙', w: 6, deger: 90, kg: [1, 6] },
  { id: 'koi', ad: 'Koi', emoji: '🎏', w: 4, deger: 160, kg: [2, 9] },
  { id: 'altinkoi', ad: 'Altın Koi', emoji: '✨', w: 1.2, deger: 600, kg: [3, 12] },
  { id: 'golge', ad: 'Gölge Balığı', emoji: '🌑', w: 0.4, deger: 2000, kg: [5, 20] },
  { id: 'aybaligi', ad: 'Ay Balığı', emoji: '🌙', w: 5, deger: 120, kg: [1, 7], gece: true },
  { id: 'fener', ad: 'Fener Balığı', emoji: '🏮', w: 1.5, deger: 450, kg: [2, 10], gece: true },
  { id: 'buzturna', ad: 'Buz Turnası', emoji: '🧊', w: 2.5, deger: 280, kg: [2, 11], mevsim: 'kis' },
  { id: 'sakura', ad: 'Sakura Alabalığı', emoji: '🌸', w: 2.5, deger: 280, kg: [1, 6], mevsim: 'ilkbahar' },
  { id: 'gunes', ad: 'Güneş Levreği', emoji: '🌞', w: 2.5, deger: 280, kg: [1.5, 8], mevsim: 'yaz' },
  { id: 'akcaagac', ad: 'Akçaağaç Sazanı', emoji: '🍁', w: 2.5, deger: 280, kg: [2, 12], mevsim: 'sonbahar' }
];

export const TUR_SAYISI = BALIKLAR.filter(b => !b.cop).length;

/** UTC+3 saatine göre gece mi (20:00-06:00). */
export function geceMi(simdi = Date.now()) {
  const saat = new Date(simdi + 3 * 3600000).getUTCHours();
  return saat >= 20 || saat < 6;
}

export function mevsim(simdi = Date.now()) {
  const ay = new Date(simdi + 3 * 3600000).getUTCMonth();
  if (ay === 11 || ay <= 1) return 'kis';
  if (ay <= 4) return 'ilkbahar';
  if (ay <= 7) return 'yaz';
  return 'sonbahar';
}

export function balikUygunMu(b, simdi = Date.now()) {
  if (b.gece && !geceMi(simdi)) return false;
  if (b.mevsim && b.mevsim !== mevsim(simdi)) return false;
  return true;
}

export function yukseltmeBedeli(olta) {
  return Math.round(500 * Math.pow(olta, 1.8));
}

/** Olta seviyesi çöp şansını azaltır, nadir balık şansını artırır. Şu an çıkmayan balıkların ağırlığı 0'dır. */
export function agirliklar(olta, simdi = Date.now()) {
  return BALIKLAR.map(b => {
    if (!balikUygunMu(b, simdi)) return 0;
    if (b.cop) return Math.max(0.3, 1 - 0.07 * (olta - 1)) * b.w;
    if (b.deger >= 45) return b.w * (1 + 0.2 * (olta - 1));
    return b.w;
  });
}

export function balikSec(olta, rng = Math.random, simdi = Date.now()) {
  const w = agirliklar(olta, simdi);
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < BALIKLAR.length; i++) {
    r -= w[i];
    if (r < 0 && w[i] > 0) return BALIKLAR[i];
  }
  return BALIKLAR[w.findLastIndex(x => x > 0)];
}

function yeniKayit() {
  return { olta: 1, son: 0, gun: '', bugun: 0, canta: {}, kesfedilen: [], rekor: null, toplamAv: 0, bekleyen: null, sonAv: null, akvaryum: [], akvaryumKasa: 0, akvaryumSon: 0 };
}

function kayitAl(db, userId) {
  db.kullanicilar[userId] = { ...yeniKayit(), ...db.kullanicilar[userId] };
  return db.kullanicilar[userId];
}

export function cantaDegeri(canta) {
  return Object.entries(canta).reduce((t, [id, adet]) => {
    const b = BALIKLAR.find(x => x.id === id);
    return t + (b ? b.deger * adet : 0);
  }, 0);
}

/** Akvaryumdaki tek balığın saatlik geliri; ağır balık biraz daha fazla kazandırır. */
export function akvaryumGeliri(av) {
  const b = BALIKLAR.find(x => x.id === av.id);
  return b ? Math.max(1, Math.round(b.deger * AKVARYUM_ORAN * (1 + av.kg / 50))) : 0;
}

export function saatlikGelir(akvaryum) {
  return akvaryum.reduce((t, av) => t + akvaryumGeliri(av), 0);
}

/** Son hesaptan bu yana biriken akvaryum gelirini kasaya ekler; kasa 24 saatlik gelirle sınırlıdır. */
function akvaryumHesapla(k, simdi) {
  const saatlik = saatlikGelir(k.akvaryum);
  if (saatlik > 0 && k.akvaryumSon) {
    const kazanc = saatlik * Math.max(0, simdi - k.akvaryumSon) / 3600000;
    k.akvaryumKasa = Math.min(saatlik * AKVARYUM_BIRIKIM_SAAT, k.akvaryumKasa + kazanc);
  }
  k.akvaryumSon = simdi;
}

function bekleyenAktif(k, simdi) {
  return !!k.bekleyen && simdi <= k.bekleyen.isirma + CEKME_PENCERESI_MS;
}

export function balikDurumu(userId, simdi = Date.now()) {
  const k = { ...yeniKayit(), ...depo.oku().kullanicilar[userId] };
  const bugun = k.gun === gunAnahtari(simdi) ? k.bugun : 0;
  const saatlik = saatlikGelir(k.akvaryum);
  const birikmis = saatlik > 0 && k.akvaryumSon
    ? Math.min(saatlik * AKVARYUM_BIRIKIM_SAAT, k.akvaryumKasa + saatlik * (simdi - k.akvaryumSon) / 3600000)
    : k.akvaryumKasa;
  return {
    ...k,
    bugun,
    kalanAtis: GUNLUK_ATIS - bugun,
    beklemeMs: Math.max(0, k.son + ATIS_BEKLEME_MS - simdi),
    bekleyen: bekleyenAktif(k, simdi) ? k.bekleyen : null,
    cantaDeger: cantaDegeri(k.canta),
    sonrakiBedel: k.olta >= MAKS_OLTA ? null : yukseltmeBedeli(k.olta),
    saatlikGelir: saatlik,
    akvaryumBirikim: Math.floor(birikmis),
    geceMi: geceMi(simdi),
    mevsim: mevsim(simdi)
  };
}

/** Oltayı suya atar ve atış hakkı harcar. Balık `oltaCek` ile çekilince belli olur. */
export function oltaAt(userId, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const gun = gunAnahtari(simdi);
  if (k.gun !== gun) { k.gun = gun; k.bugun = 0; }
  if (bekleyenAktif(k, simdi)) return { basarili: false, sebep: 'suda' };
  if (k.bugun >= GUNLUK_ATIS) return { basarili: false, sebep: 'limit' };
  if (simdi - k.son < ATIS_BEKLEME_MS) return { basarili: false, sebep: 'bekle', beklemeMs: k.son + ATIS_BEKLEME_MS - simdi };

  const isirma = simdi + ISIRMA_MIN_MS + Math.round(rng() * ISIRMA_ARALIK_MS);
  k.son = simdi;
  k.bugun += 1;
  k.bekleyen = { atis: simdi, isirma };
  depo.yaz(db);
  return { basarili: true, atis: simdi, isirmaMs: isirma - simdi };
}

/**
 * Suda bekleyen oltayı çeker. Şamandıra batmadan çekmek ya da pencereyi kaçırmak avı kaçırır.
 * @returns {{basarili:boolean, sebep?:'yok'|'erken'|'gec', kusursuz?:boolean, balik?, kg?, yeniTur?, bonus?, yeniRekor?, turnuvaRekoru?, notlar?}}
 */
export function oltaCek(userId, simdi = Date.now(), rng = Math.random) {
  turnuvaKapat(simdi);
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (!k.bekleyen) return { basarili: false, sebep: 'yok' };
  const { isirma } = k.bekleyen;
  k.bekleyen = null;

  let sebep = null;
  if (simdi < isirma) sebep = 'erken';
  else if (simdi > isirma + CEKME_PENCERESI_MS) sebep = 'gec';
  if (sebep) {
    depo.yaz(db);
    const { notlar } = oyunOlayi(userId, 'balik');
    return { basarili: false, sebep, notlar };
  }

  const kusursuz = simdi - isirma <= KUSURSUZ_MS;
  const balik = balikSec(k.olta + (kusursuz ? KUSURSUZ_OLTA_BONUSU : 0), rng, simdi);
  const hamKg = balik.kg ? balik.kg[0] + rng() * (balik.kg[1] - balik.kg[0]) : 0;
  const kg = Math.round(hamKg * (kusursuz ? KUSURSUZ_KG_CARPANI : 1) * 100) / 100;
  k.toplamAv += 1;
  k.canta[balik.id] = (k.canta[balik.id] || 0) + 1;
  k.sonAv = balik.cop ? null : { id: balik.id, kg };

  let yeniTur = false;
  let bonus = 0;
  if (!balik.cop && !k.kesfedilen.includes(balik.id)) {
    k.kesfedilen.push(balik.id);
    yeniTur = true;
    bonus = balik.deger;
  }
  const yeniRekor = !!balik.kg && (!k.rekor || kg > k.rekor.kg);
  if (yeniRekor) k.rekor = { id: balik.id, kg };

  let turnuvaRekoru = false;
  if (balik.kg) {
    const eski = db.turnuva.kayitlar[userId];
    if (!eski || kg > eski.kg) {
      db.turnuva.kayitlar[userId] = { id: balik.id, kg };
      turnuvaRekoru = true;
    }
  }
  depo.yaz(db);
  if (bonus > 0) ryoEkle(userId, bonus, 'Balık keşif bonusu');
  const { notlar } = oyunOlayi(userId, 'balik');
  return { basarili: true, kusursuz, balik, kg, yeniTur, bonus, yeniRekor, turnuvaRekoru, notlar };
}

/** Çantadaki tüm avı Ryo'ya çevirir. */
export function cantayiSat(userId) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const miktar = cantaDegeri(k.canta);
  if (miktar < 1) return { basarili: false, sebep: 'bos' };
  const adet = Object.values(k.canta).reduce((a, b) => a + b, 0);
  k.canta = {};
  k.sonAv = null;
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

/** Son yakalanan balığı çantadan alıp akvaryuma koyar. */
export function akvaryumaKoy(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const av = k.sonAv;
  if (!av || !k.canta[av.id]) return { basarili: false, mesaj: 'Akvaryuma koyacak taze bir avın yok. Önce bir balık yakala.' };
  if (k.akvaryum.length >= AKVARYUM_YUVA) return { basarili: false, mesaj: `Akvaryum dolu (${AKVARYUM_YUVA} yuva). Önce bir balığı göle sal.` };
  akvaryumHesapla(k, simdi);
  k.canta[av.id] -= 1;
  if (k.canta[av.id] < 1) delete k.canta[av.id];
  k.akvaryum.push(av);
  k.sonAv = null;
  depo.yaz(db);
  return { basarili: true, av, gelir: akvaryumGeliri(av) };
}

/** Akvaryumdaki balığı çantaya geri alır. */
export function akvaryumdanCikar(userId, sira, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const av = k.akvaryum[sira];
  if (!av) return { basarili: false, mesaj: 'Bu yuvada balık yok.' };
  akvaryumHesapla(k, simdi);
  k.akvaryum.splice(sira, 1);
  k.canta[av.id] = (k.canta[av.id] || 0) + 1;
  depo.yaz(db);
  return { basarili: true, av };
}

export function akvaryumTopla(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  akvaryumHesapla(k, simdi);
  const miktar = Math.floor(k.akvaryumKasa);
  if (miktar < 1) {
    depo.yaz(db);
    return { basarili: false, mesaj: k.akvaryum.length ? 'Henüz toplanacak Ryo birikmedi.' : 'Akvaryum boş. Yakaladığın balığı akvaryuma koy, saat başı Ryo üretsin.' };
  }
  k.akvaryumKasa -= miktar;
  depo.yaz(db);
  ryoEkle(userId, miktar, 'Akvaryum geliri');
  return { basarili: true, miktar };
}

function turnuvaSiralamasi(kayitlar) {
  return Object.entries(kayitlar || {})
    .filter(([, av]) => av)
    .sort((a, b) => b[1].kg - a[1].kg)
    .map(([uid, av]) => ({ uid, ...av }));
}

/** Hafta değiştiyse en ağır balık turnuvasını kapatır, ilk üçü ödüllendirir ve özeti döndürür. */
export function turnuvaKapat(simdi = Date.now()) {
  const db = depo.oku();
  const hafta = haftaAnahtari(simdi);
  if (db.turnuva?.hafta === hafta) return null;
  if (!db.turnuva) {
    db.turnuva = { hafta, kayitlar: {} };
    db.turnuvaGecmis = [];
    depo.yaz(db);
    return null;
  }
  const kazananlar = turnuvaSiralamasi(db.turnuva.kayitlar).slice(0, TURNUVA_ODULLERI.length)
    .map((k, i) => ({ ...k, odul: TURNUVA_ODULLERI[i] }));
  const ozet = kazananlar.length ? { hafta: db.turnuva.hafta, kazananlar } : null;
  if (ozet) db.turnuvaGecmis = [ozet, ...(db.turnuvaGecmis || [])].slice(0, 12);
  db.turnuva = { hafta, kayitlar: {} };
  depo.yaz(db);
  kazananlar.forEach((k, i) => ryoEkle(k.uid, k.odul, `Balık turnuvası ${i + 1}. sıra (${ozet.hafta})`));
  return ozet;
}

export function turnuvaDurumu(userId, simdi = Date.now()) {
  turnuvaKapat(simdi);
  const db = depo.oku();
  const siralama = turnuvaSiralamasi(db.turnuva.kayitlar);
  const pazartesi = new Date(`${db.turnuva.hafta}T00:00:00+03:00`).getTime();
  const sira = siralama.findIndex(k => k.uid === userId);
  return {
    hafta: db.turnuva.hafta,
    kalanMs: pazartesi + 7 * 86400000 - simdi,
    ilk: siralama.slice(0, 10),
    benim: sira >= 0 ? { sira: sira + 1, ...siralama[sira] } : null,
    katilimci: siralama.length,
    gecen: db.turnuvaGecmis?.[0] || null
  };
}
