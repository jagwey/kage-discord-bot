import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';

const depo = jsonDepo('zindan.json', () => ({ kullanicilar: {} }));

/** Zindan rütbe basamakları: bir basamağın açılması için gereken toplam zafer sayısı. */
export const RUTBE_ESIKLERI = { D: 0, C: 3, B: 8, A: 15, S: 25 };
/** Seri başına Ryo bonus oranı ve üst sınırı. */
export const SERI_BONUS_ORANI = 0.05;
export const SERI_BONUS_TAVAN = 0.5;
export const GUNLUK_ILK_ZAFER_BONUSU = 100;
export const MAKS_RELIK = 5;

export const RELIKLER = {
  kaplan: { ad: 'Kaplan Dişi', emoji: '🐯', aciklama: 'Saldırı hasarı +%10' },
  demir: { ad: 'Demir Muska', emoji: '🛡️', aciklama: 'Azami can +20' },
  altin: { ad: 'Altın Kurbağa', emoji: '🐸', aciklama: 'Zindan Ryo ödülü +%15' },
  golge: { ad: 'Gölge Pelerini', emoji: '🌑', aciklama: 'Gölge Tekniği başarı şansı +%10' },
  sifa: { ad: 'Şifa Tütsüsü', emoji: '🪔', aciklama: 'İksirler +15 HP daha fazla doldurur' }
};

/** Zindan rütbesi harfini rank metninden çıkarır ("🟠 B-Rank (Zor)" → "B"). */
export function rutbeHarfi(rankMetni) {
  const m = /([DCBAS])-Rank/.exec(rankMetni || '');
  return m ? m[1] : 'D';
}

export function rutbeAcikMi(harf, toplamZafer) {
  return toplamZafer >= (RUTBE_ESIKLERI[harf] ?? 0);
}

function bos() {
  return { zafer: 0, olum: 0, seri: 0, enIyiSeri: 0, relikler: [], gun: '', gunlukZafer: 0, temizlenen: {} };
}

function kayitAl(db, userId) {
  if (!db.kullanicilar[userId]) db.kullanicilar[userId] = bos();
  return db.kullanicilar[userId];
}

export function bugunAnahtari(simdi = Date.now()) {
  return new Date(simdi).toISOString().slice(0, 10);
}

export function zindanProfili(userId) {
  const db = depo.oku();
  return { ...bos(), ...(db.kullanicilar[userId] || {}) };
}

/** Sahip olunan kalıntıların toplam etkisi. */
export function relikEtkisi(relikler = []) {
  const var_ = id => relikler.includes(id);
  return {
    hasarCarpani: var_('kaplan') ? 1.1 : 1,
    ekCan: var_('demir') ? 20 : 0,
    ryoCarpani: var_('altin') ? 1.15 : 1,
    golgeSans: var_('golge') ? 0.1 : 0,
    iksirEk: var_('sifa') ? 15 : 0
  };
}

export function seriBonusOrani(seri) {
  return Math.min(SERI_BONUS_TAVAN, Math.max(0, seri) * SERI_BONUS_ORANI);
}

/** Canavarın bu turdaki niyeti: ağır hamle yapacaksa oyuncuya önceden gösterilir. */
export function canavarNiyeti(rng = Math.random) {
  return rng() < 0.3 ? 'agir' : 'normal';
}

/**
 * Canavarın verdiği hasar. Ağır hamle %60 fazla vurur; "İblis Öfkesi" zindanında can azaldıkça artar.
 * Blok ağır hamleyi tamamen engellemez ama azaltma oranı aynı kalır.
 */
export function canavarHasari(zindan, niyet, canavarHp, rng = Math.random) {
  let hasar = Math.floor(rng() * (zindan.maxAtk - zindan.minAtk + 1)) + zindan.minAtk;
  if (niyet === 'agir') hasar = Math.round(hasar * 1.6);
  if (zindan.id === 'sogun_kalesi' && canavarHp / zindan.canavarHp < 0.5) hasar = Math.round(hasar * 1.25);
  return hasar;
}

/** Zafer kaydı: seri, günlük ilk zafer, kalıntı düşüşü ve bonus Ryo hesaplar; bonusu öder. */
export function zaferIsle(userId, zindan, temelRyo, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const gun = bugunAnahtari(simdi);
  if (k.gun !== gun) {
    k.gun = gun;
    k.gunlukZafer = 0;
  }
  const ilkZafer = k.gunlukZafer === 0;
  k.gunlukZafer += 1;
  k.zafer += 1;
  k.seri += 1;
  if (k.seri > k.enIyiSeri) k.enIyiSeri = k.seri;
  k.temizlenen[zindan.id] = (k.temizlenen[zindan.id] || 0) + 1;

  const etki = relikEtkisi(k.relikler);
  const relikBonusu = Math.round(temelRyo * (etki.ryoCarpani - 1));
  const seriBonusu = Math.round(temelRyo * seriBonusOrani(k.seri - 1));
  const gunlukBonus = ilkZafer ? GUNLUK_ILK_ZAFER_BONUSU : 0;

  // Yüksek rütbede kalıntı şansı artar; sahip olunanlar tekrar düşmez.
  const harf = rutbeHarfi(zindan.rank);
  const sans = { D: 0.06, C: 0.1, B: 0.16, A: 0.24, S: 0.35 }[harf];
  let yeniRelik = null;
  if (k.relikler.length < MAKS_RELIK && rng() < sans) {
    const adaylar = Object.keys(RELIKLER).filter(id => !k.relikler.includes(id));
    if (adaylar.length) {
      yeniRelik = adaylar[Math.floor(rng() * adaylar.length)];
      k.relikler.push(yeniRelik);
    }
  }
  depo.yaz(db);

  const bonusToplam = relikBonusu + seriBonusu + gunlukBonus;
  if (bonusToplam > 0) ryoEkle(userId, bonusToplam, `Zindan bonusu (${zindan.id})`);
  return { relikBonusu, seriBonusu, gunlukBonus, bonusToplam, yeniRelik, seri: k.seri, toplamZafer: k.zafer };
}

export function olumIsle(userId) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  k.olum += 1;
  const kayipSeri = k.seri;
  k.seri = 0;
  depo.yaz(db);
  return { kayipSeri };
}

/** En çok zafer kazananlar; eşitlikte en iyi seri belirler. */
export function zindanSiralamasi(adet = 10) {
  const db = depo.oku();
  return Object.entries(db.kullanicilar)
    .filter(([, k]) => k.zafer > 0)
    .map(([uid, k]) => ({ uid, zafer: k.zafer, enIyiSeri: k.enIyiSeri }))
    .sort((a, b) => b.zafer - a.zafer || b.enIyiSeri - a.enIyiSeri)
    .slice(0, adet);
}
