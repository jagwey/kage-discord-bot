import { jsonDepo } from './jsonDepo.js';

const depo = jsonDepo('yoldaslar.json', () => ({}));

export const YOLDAS_TURLERI = {
  kurt: {
    id: 'kurt',
    ad: '🐺 Gölge Kurdu (Kageokami)',
    aciklama: 'Karanlıkta düşmanın zayıf noktasını koklar. Zindanlarda kritik hasar şansını artırır.',
    bonusTip: 'kritik',
    bonusDeger: 15, // +%15
    fiyat: 0
  },
  tilki: {
    id: 'tilki',
    ad: '🦊 Alev Tilkisi (Kitsune)',
    aciklama: 'Ganimet ve altın kokusunu kilometrelerce öteden alır. Zindanlarda ve seferlerde ek Ryo kazandırır.',
    bonusTip: 'ryo',
    bonusDeger: 20,
    fiyat: 0
  },
  kuzgun: {
    id: 'kuzgun',
    ad: '🦅 Mistik Kuzgun (Yata)',
    aciklama: 'Gökyüzünden tehlikeyi haber verir. Zindanda ölümcül darbelerden %15 ihtimalle kaçınmanı sağlar.',
    bonusTip: 'kacinma',
    bonusDeger: 15,
    fiyat: 0
  },
  ejder: {
    id: 'ejder',
    ad: '🐉 Yeşim Ejderi (Ryu)',
    aciklama: 'Kadim pullarıyla savaşçıyı sarar. Zindanda canavarlardan alınan tüm hasarı %20 azaltır.',
    bonusTip: 'savunma',
    bonusDeger: 20,
    fiyat: 2500
  }
};

export const EVRIM_SEVIYESI = 10;
/** Evrimleşen yoldaşın bonusu bu çarpanla büyür. */
export const EVRIM_CARPANI = 1.5;

/** Seviye 10'da her türün dönüştüğü efsanevi biçim. */
export const EVRIM_ADLARI = {
  kurt: '🌑 Ay Yiyen Fenrir',
  tilki: '🔥 Dokuz Kuyruklu Kitsune',
  kuzgun: '☀️ Yatagarasu',
  ejder: '🌊 Ryujin'
};

const SAAT = 3_600_000;
/** Saatte düşen tokluk ve mutluluk puanı. */
const ACIKMA_HIZI = 3;
const SIKILMA_HIZI = 2;

export const BESLEME_UCRETI = 100;
export const EGITIM_UCRETI = 250;
export const OYUN_BEKLEME_MS = 30 * 60_000;
export const EGITIM_BEKLEME_MS = 2 * SAAT;
/** Sefer süreleri saat cinsinden. */
export const SEFER_SURELERI = [1, 4, 8];

/** Ruh haline göre savaş bonusu çarpanı. */
export const RUH_CARPANI = { ac: 0.5, kuskun: 0.5, normal: 1, mutlu: 1.1 };

const sinirla = n => Math.max(0, Math.min(100, Math.round(n)));

/** Yoldaş şu anki türünde evrimleşmiş mi. Tür değişirse evrim yeniden kazanılır. */
export function evrimlestiMi(yoldas) {
  return !!yoldas && yoldas.evrimTur === yoldas.turId;
}

/**
 * Zamanla düşen tokluk ve mutluluğu hesaplar; kaydı değiştirmez.
 * Mutluluk eski kayıtlarla uyum için `sadakat` alanında tutulur.
 */
export function yoldasDurumu(yoldas, simdi = Date.now()) {
  if (!yoldas) return null;
  const gecenSaat = Math.max(0, simdi - (yoldas.durumZamani || simdi)) / SAAT;
  const tokluk = sinirla((yoldas.tokluk ?? 80) - gecenSaat * ACIKMA_HIZI);
  const mutluluk = sinirla((yoldas.sadakat ?? 100) - gecenSaat * SIKILMA_HIZI);
  let ruh = 'normal';
  if (tokluk < 20) ruh = 'ac';
  else if (mutluluk < 20) ruh = 'kuskun';
  else if (tokluk >= 50 && mutluluk >= 80) ruh = 'mutlu';
  return { tokluk, mutluluk, ruh };
}

/** Yoldaşın yüzde cinsinden bonus gücü: seviye başına +3, evrimde x1.5, ruh haline göre çarpılır. */
export function yoldasGucu(yoldas, tur, simdi = Date.now()) {
  if (!yoldas || !tur) return 0;
  const taban = tur.bonusDeger + ((yoldas.seviye || 1) - 1) * 3;
  const ruh = yoldasDurumu(yoldas, simdi).ruh;
  return Math.round(taban * (evrimlestiMi(yoldas) ? EVRIM_CARPANI : 1) * RUH_CARPANI[ruh]);
}

export function yoldasAdi(yoldas) {
  if (!yoldas) return '';
  const tur = evrimlestiMi(yoldas) ? EVRIM_ADLARI[yoldas.turId] || yoldas.ad : yoldas.ad;
  return yoldas.isim ? `${yoldas.isim} • ${tur}` : tur;
}

export function kullaniciYoldasGetir(userId) {
  const hepsi = depo.oku();
  return hepsi[userId] || null;
}

export function yoldasSec(userId, yoldasId, simdi = Date.now()) {
  const tur = YOLDAS_TURLERI[yoldasId];
  if (!tur) throw new Error('Geçersiz yoldaş türü.');

  const hepsi = depo.oku();
  const mevcut = hepsi[userId];
  const durum = mevcut ? yoldasDurumu(mevcut, simdi) : null;

  hepsi[userId] = {
    turId: yoldasId,
    ad: tur.ad,
    seviye: mevcut?.seviye || 1,
    xp: mevcut?.xp || 0,
    sadakat: durum ? durum.mutluluk : 100,
    tokluk: durum ? durum.tokluk : 80,
    durumZamani: simdi,
    evrimTur: mevcut?.evrimTur || null,
    isim: mevcut?.isim,
    seferSayisi: mevcut?.seferSayisi || 0,
    sonOyun: mevcut?.sonOyun,
    sonEgitim: mevcut?.sonEgitim,
    sefer: mevcut?.sefer,
    secilmeTarihi: mevcut?.secilmeTarihi || new Date(simdi).toISOString()
  };

  depo.yaz(hepsi);
  return hepsi[userId];
}

/** Hesaplanan durumu kayda yazar; sonraki düşüş bu andan başlar. */
function durumuSabitle(yoldas, simdi) {
  const d = yoldasDurumu(yoldas, simdi);
  yoldas.tokluk = d.tokluk;
  yoldas.sadakat = d.mutluluk;
  yoldas.durumZamani = simdi;
  return d;
}

/** XP ekler, seviye ve evrimi işler. */
function xpEkle(yoldas, miktar) {
  yoldas.xp = (yoldas.xp || 0) + miktar;
  yoldas.seviye = yoldas.seviye || 1;
  let seviyeAtladi = false;
  while (yoldas.xp >= yoldas.seviye * 100) {
    yoldas.xp -= yoldas.seviye * 100;
    yoldas.seviye += 1;
    seviyeAtladi = true;
  }
  let evrimOldu = false;
  if (yoldas.seviye >= EVRIM_SEVIYESI && !evrimlestiMi(yoldas)) {
    yoldas.evrimTur = yoldas.turId;
    evrimOldu = true;
  }
  return { seviyeAtladi, evrimOldu };
}

/** Ortak eylem iskeleti: kaydı okur, durumu sabitler, eylemi uygular, başarılıysa yazar. */
function eylem(userId, simdi, fn) {
  const hepsi = depo.oku();
  const yoldas = hepsi[userId];
  if (!yoldas) return { basarili: false, sebep: 'yok' };
  const durum = durumuSabitle(yoldas, simdi);
  const sonuc = fn(yoldas, durum);
  if (sonuc.basarili) depo.yaz(hepsi);
  return { yoldas, ...sonuc };
}

/** `ode` ücret yalnızca koşullar sağlanınca çağrılır; false dönerse işlem iptal olur. */
export function yoldasBesle(userId, { simdi = Date.now(), ode = () => true } = {}) {
  return eylem(userId, simdi, (y, d) => {
    if (y.sefer) return { basarili: false, sebep: 'seferde' };
    if (d.tokluk >= 95) return { basarili: false, sebep: 'tok' };
    if (!ode()) return { basarili: false, sebep: 'ryo' };
    y.tokluk = sinirla(d.tokluk + 40);
    y.sadakat = sinirla(d.mutluluk + 10);
    return { basarili: true, xp: 35, ...xpEkle(y, 35) };
  });
}

export function yoldasOyna(userId, simdi = Date.now()) {
  return eylem(userId, simdi, (y, d) => {
    if (y.sefer) return { basarili: false, sebep: 'seferde' };
    const kalan = (y.sonOyun || 0) + OYUN_BEKLEME_MS - simdi;
    if (kalan > 0) return { basarili: false, sebep: 'bekle', kalanMs: kalan };
    if (d.tokluk < 10) return { basarili: false, sebep: 'ac' };
    y.sonOyun = simdi;
    y.sadakat = sinirla(d.mutluluk + 25);
    y.tokluk = sinirla(d.tokluk - 5);
    return { basarili: true, xp: 15, ...xpEkle(y, 15) };
  });
}

/** `ode` ücret yalnızca koşullar sağlanınca çağrılır; false dönerse işlem iptal olur. */
export function yoldasEgit(userId, { simdi = Date.now(), ode = () => true } = {}) {
  return eylem(userId, simdi, (y, d) => {
    if (y.sefer) return { basarili: false, sebep: 'seferde' };
    const kalan = (y.sonEgitim || 0) + EGITIM_BEKLEME_MS - simdi;
    if (kalan > 0) return { basarili: false, sebep: 'bekle', kalanMs: kalan };
    if (d.tokluk < 30 || d.mutluluk < 30) return { basarili: false, sebep: 'yorgun' };
    if (!ode()) return { basarili: false, sebep: 'ryo' };
    y.sonEgitim = simdi;
    y.tokluk = sinirla(d.tokluk - 15);
    y.sadakat = sinirla(d.mutluluk - 10);
    return { basarili: true, xp: 80, ...xpEkle(y, 80) };
  });
}

export function yoldasSeferBaslat(userId, saat, simdi = Date.now()) {
  if (!SEFER_SURELERI.includes(saat)) return { basarili: false, sebep: 'sure' };
  return eylem(userId, simdi, (y, d) => {
    if (y.sefer) return { basarili: false, sebep: 'seferde' };
    if (d.tokluk < 25) return { basarili: false, sebep: 'ac' };
    y.sefer = { baslangic: simdi, bitis: simdi + saat * SAAT, saat };
    y.tokluk = sinirla(d.tokluk - saat * 4);
    return { basarili: true };
  });
}

/** Biten seferin ganimetini hesaplar. Ryo çağıran tarafından eklenir. */
export function yoldasSeferTopla(userId, simdi = Date.now(), rng = Math.random) {
  return eylem(userId, simdi, y => {
    if (!y.sefer) return { basarili: false, sebep: 'seferYok' };
    if (y.sefer.bitis > simdi) return { basarili: false, sebep: 'bekle', kalanMs: y.sefer.bitis - simdi };
    const { saat } = y.sefer;
    const tur = YOLDAS_TURLERI[y.turId];
    const ryoBonusu = tur?.bonusTip === 'ryo' ? 1 + yoldasGucu(y, tur, simdi) / 100 : 1;
    const ryo = Math.round(saat * (60 + y.seviye * 10) * (0.8 + rng() * 0.4) * ryoBonusu);
    const xp = saat * 25;
    delete y.sefer;
    y.seferSayisi = (y.seferSayisi || 0) + 1;
    return { basarili: true, ryo, xp, saat, ...xpEkle(y, xp) };
  });
}

export function yoldasIsimVer(userId, isim) {
  const temiz = String(isim || '').replace(/[`*_~|<>@#\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (temiz.length < 2) return { basarili: false, sebep: 'kisa' };
  const hepsi = depo.oku();
  if (!hepsi[userId]) return { basarili: false, sebep: 'yok' };
  hepsi[userId].isim = temiz;
  depo.yaz(hepsi);
  return { basarili: true, isim: temiz };
}
