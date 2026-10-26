import { jsonDepo } from './jsonDepo.js';
import { ryoEkle, bakiyeGetir } from './ekonomiServisi.js';

const depo = jsonDepo('kule.json', () => ({ kullanicilar: {} }));

export const GUNLUK_HAK = 3;
export const BASLANGIC_CAN = 100;
export const BASLANGIC_GUC = 12;
/** Ölünce biriken ödülün bu oranı ödenir; "Çekil" ile tamamı ödenir. */
export const OLUM_ORANI = 0.5;

export const BUFFLAR = {
  can: { ad: 'Demir Beden', emoji: '❤️', aciklama: '+30 azami can ve +30 can' },
  guc: { ad: 'Keskin Bilek', emoji: '🗡️', aciklama: '+4 saldırı gücü' },
  iyilesme: { ad: 'Çay Molası', emoji: '🍵', aciklama: 'Azami canın yarısı kadar iyileş' },
  altin: { ad: 'Gölge Hazinesi', emoji: '💰', aciklama: 'Birikmiş ödüle kat × 60 Ryo ekle' }
};

export function bossKatiMi(kat) {
  return kat % 5 === 0;
}

export function dusman(kat) {
  const boss = bossKatiMi(kat);
  return {
    boss,
    ad: boss ? 'Kat Muhafızı' : 'Gölge Askeri',
    can: Math.round((40 + kat * 18) * (boss ? 1.8 : 1)),
    guc: Math.round((8 + kat * 3.5) * (boss ? 1.5 : 1))
  };
}

export function katOdulu(kat) {
  return 30 + kat * 15 + (bossKatiMi(kat) ? 100 : 0);
}

export function bugunAnahtari(simdi = Date.now()) {
  return new Date(simdi).toISOString().slice(0, 10);
}

function kayitAl(db, userId) {
  if (!db.kullanicilar[userId]) {
    db.kullanicilar[userId] = { gun: '', hak: GUNLUK_HAK, aktif: null, enIyi: 0, toplamRun: 0 };
  }
  return db.kullanicilar[userId];
}

function gunuYenile(k, simdi) {
  const gun = bugunAnahtari(simdi);
  if (k.gun !== gun) {
    k.gun = gun;
    k.hak = GUNLUK_HAK;
  }
}

/** Üç farklı rastgele ödül seçeneği döndürür. */
export function seceneklerUret(rng = Math.random) {
  const havuz = Object.keys(BUFFLAR);
  const secilen = [];
  while (secilen.length < 3) {
    const id = havuz.splice(Math.floor(rng() * havuz.length), 1)[0];
    secilen.push(id);
  }
  return secilen;
}

/** Tek kat savaşını tur tur simüle eder. Kazanırsa kalan canı döndürür. */
export function savasSimule(oyuncu, dus, rng = Math.random) {
  let can = oyuncu.can;
  let dCan = dus.can;
  for (let tur = 0; tur < 40; tur++) {
    const kritik = rng() < 0.1;
    dCan -= Math.max(1, Math.round(oyuncu.guc * (0.8 + rng() * 0.4) * (kritik ? 1.8 : 1)));
    if (dCan <= 0) return { kazandi: true, can: Math.max(1, can) };
    can -= Math.max(1, Math.round(dus.guc * (0.8 + rng() * 0.4)));
    if (can <= 0) return { kazandi: false, can: 0 };
  }
  return { kazandi: false, can: 0 };
}

export function kuleDurumu(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = db.kullanicilar[userId] || { gun: '', hak: GUNLUK_HAK, aktif: null, enIyi: 0, toplamRun: 0 };
  const hak = k.gun === bugunAnahtari(simdi) ? k.hak : GUNLUK_HAK;
  return { ...k, hak, siradaki: k.aktif ? dusman(k.aktif.kat) : null };
}

export function kuleSiralamasi(adet = 10) {
  const db = depo.oku();
  return Object.entries(db.kullanicilar)
    .filter(([, k]) => k.enIyi > 0)
    .map(([uid, k]) => ({ uid, enIyi: k.enIyi }))
    .sort((a, b) => b.enIyi - a.enIyi)
    .slice(0, adet);
}

export function kuleBasla(userId, simdi = Date.now()) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  gunuYenile(k, simdi);
  if (k.aktif) return { basarili: false, sebep: 'aktif' };
  if (k.hak < 1) return { basarili: false, sebep: 'hak' };
  k.hak -= 1;
  k.toplamRun += 1;
  k.aktif = { kat: 1, can: BASLANGIC_CAN, maksCan: BASLANGIC_CAN, guc: BASLANGIC_GUC, odul: 0, secenek: null };
  depo.yaz(db);
  return { basarili: true };
}

function runBitir(db, userId, k, oran, neden) {
  const a = k.aktif;
  const katSayisi = a.kat - 1;
  const odenen = Math.floor(a.odul * oran);
  const yeniRekor = katSayisi > k.enIyi;
  if (yeniRekor) k.enIyi = katSayisi;
  k.aktif = null;
  depo.yaz(db);
  if (odenen > 0) ryoEkle(userId, odenen, neden);
  return { odenen, katSayisi, yeniRekor };
}

export function kuleSavas(userId, rng = Math.random) {
  const db = depo.oku();
  const k = db.kullanicilar[userId];
  const a = k?.aktif;
  if (!a) return { basarili: false, sebep: 'run_yok' };
  if (a.secenek) return { basarili: false, sebep: 'secim_bekliyor' };

  const dus = dusman(a.kat);
  // Kılıç bonusu (yüzde) saldırı gücüne yansır.
  const bonus = bakiyeGetir(userId).kilic?.bonus || 0;
  const sonuc = savasSimule({ can: a.can, guc: a.guc * (1 + bonus / 100) }, dus, rng);
  const sonKat = a.kat;

  if (!sonuc.kazandi) {
    const bitis = runBitir(db, userId, k, OLUM_ORANI, `Gölge Kulesi (öldün, kat ${sonKat})`);
    return { basarili: true, kazandi: false, dusman: dus, kat: sonKat, ...bitis };
  }
  a.can = sonuc.can;
  const kazanc = katOdulu(sonKat);
  a.odul += kazanc;
  a.kat += 1;
  a.secenek = seceneklerUret(rng);
  depo.yaz(db);
  return { basarili: true, kazandi: true, dusman: dus, kat: sonKat, kazanc, can: a.can, secenek: a.secenek };
}

export function kuleSec(userId, secim) {
  const db = depo.oku();
  const k = db.kullanicilar[userId];
  const a = k?.aktif;
  if (!a || !a.secenek) return { basarili: false, sebep: 'secim_yok' };
  if (!a.secenek.includes(secim)) return { basarili: false, sebep: 'gecersiz' };
  if (secim === 'can') {
    a.maksCan += 30;
    a.can += 30;
  } else if (secim === 'guc') {
    a.guc += 4;
  } else if (secim === 'iyilesme') {
    a.can = Math.min(a.maksCan, a.can + Math.round(a.maksCan / 2));
  } else if (secim === 'altin') {
    a.odul += (a.kat - 1) * 60;
  }
  a.secenek = null;
  depo.yaz(db);
  return { basarili: true, buff: BUFFLAR[secim] };
}

/** Run'ı bırakır ve birikmiş ödülün tamamını alır. */
export function kuleCekil(userId) {
  const db = depo.oku();
  const k = db.kullanicilar[userId];
  if (!k?.aktif) return { basarili: false, sebep: 'run_yok' };
  const kat = k.aktif.kat - 1;
  return { basarili: true, ...runBitir(db, userId, k, 1, `Gölge Kulesi (çekilme, ${kat} kat)`) };
}
