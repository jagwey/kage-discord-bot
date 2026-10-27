import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';
import { yoldasGucu, evrimlestiMi } from './yoldasServisi.js';

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
  return { zafer: 0, olum: 0, seri: 0, enIyiSeri: 0, relikler: [], gun: '', gunlukZafer: 0, temizlenen: {}, enDerinKat: 1 };
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

/** Canavar niyetleri; her biri bir tur önceden oyuncuya gösterilir. */
export const NIYET_METINLERI = {
  normal: '👾 Sıradan bir saldırıya hazırlanıyor.',
  agir: '⚠️ **Ağır hamle hazırlıyor!** Tam zamanında blok karşı vuruş kazandırır.',
  kalkan: '🛡️ **Siper alıyor!** Bu tur saldırmaz; normal darbeler yarıya iner, Gölge Tekniği kalkanı parçalar.',
  sifa: '💚 **Yaralarını sarmaya hazırlanıyor!** Bu tur 30+ hasar vurursan iyileşemez.'
};

/** Odak puanı üst sınırı: her saldırı 1 odak verir, Gölge Tekniği hepsini harcar. */
export const MAKS_ODAK = 3;
/** Zaferden sonra derine inilebilecek en fazla kat. */
export const MAKS_KAT = 3;

/**
 * Canavarın bu turdaki niyeti. Şifa yalnızca canı %60'ın altına inince seçilebilir.
 * Eski çağrılar yalnızca rng ile gelir; can oranı verilmezse tam can sayılır.
 */
export function canavarNiyeti(rng = Math.random, canOrani = 1) {
  const r = rng();
  if (r < 0.28) return 'agir';
  if (r < 0.43) return 'kalkan';
  if (r < 0.55 && canOrani < 0.6) return 'sifa';
  return 'normal';
}

/**
 * Canavarın verdiği hasar. Ağır hamle %60 fazla vurur; "İblis Öfkesi" zindanında can azaldıkça artar.
 * Hiçlik Boyutu'nun ikinci fazında (can %50 ve altı) bütün darbeler %30 sertleşir.
 */
export function canavarHasari(zindan, niyet, canavarHp, rng = Math.random) {
  let hasar = Math.floor(rng() * (zindan.maxAtk - zindan.minAtk + 1)) + zindan.minAtk;
  if (niyet === 'agir') hasar = Math.round(hasar * 1.6);
  const oran = canavarHp / zindan.canavarHp;
  if (zindan.id === 'sogun_kalesi' && oran < 0.5) hasar = Math.round(hasar * 1.25);
  if (zindan.id === 'hiclik_boyutu' && oran <= 0.5) hasar = Math.round(hasar * 1.3);
  return hasar;
}

/** Derin katlarda canavar her kat için %25 güçlenir. */
export function katZindani(zindan, kat) {
  const c = 1 + (kat - 1) * 0.25;
  return {
    ...zindan,
    canavarHp: Math.round(zindan.canavarHp * c),
    minAtk: Math.round(zindan.minAtk * c),
    maxAtk: Math.round(zindan.maxAtk * c)
  };
}

/** Katlar boyunca biriken Ryo çarpanı; ölünce hepsi kaybedilir. */
export function katOdulCarpani(kat) {
  return [1, 1.6, 2.4][kat - 1] ?? 2.4;
}

/**
 * Yoldaşın savaş etkisi. Bonus seviye başına 3 puan artar, evrimde x1.5 olur; üst sınırlar oyunu kırmamak içindir.
 * kritik: Gölge Tekniği şansı, kacinma: darbeden sıyrılma, savunma: hasar azaltma.
 */
export function yoldasSavasEtkisi(yoldas, tur) {
  const etki = { kritik: 0, kacinma: 0, savunma: 0 };
  if (!yoldas || !tur || !(tur.bonusTip in etki)) return etki;
  const deger = yoldasGucu(yoldas, tur) / 100;
  // Evrimleşen yoldaş tavanı biraz aşabilir.
  const tavan = { kritik: 0.4, kacinma: 0.35, savunma: 0.4 }[tur.bonusTip] + (evrimlestiMi(yoldas) ? 0.1 : 0);
  etki[tur.bonusTip] = Math.min(tavan, deger);
  return etki;
}

/** Zafer kaydı: seri, günlük ilk zafer, kalıntı düşüşü ve bonus Ryo hesaplar; bonusu öder. */
export function zaferIsle(userId, zindan, temelRyo, simdi = Date.now(), rng = Math.random, kat = 1) {
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
  k.enDerinKat = Math.max(k.enDerinKat || 1, kat);

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
