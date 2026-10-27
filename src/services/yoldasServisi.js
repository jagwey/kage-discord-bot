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
    aciklama: 'Ganimet ve altın kokusunu kilometrelerce öteden alır. Zindanlarda +%20 ek Ryo kazandırır.',
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

/** Yoldaş şu anki türünde evrimleşmiş mi. Tür değişirse evrim yeniden kazanılır. */
export function evrimlestiMi(yoldas) {
  return !!yoldas && yoldas.evrimTur === yoldas.turId;
}

/** Yoldaşın yüzde cinsinden bonus gücü: seviye başına +3, evrimde x1.5. */
export function yoldasGucu(yoldas, tur) {
  if (!yoldas || !tur) return 0;
  const taban = tur.bonusDeger + ((yoldas.seviye || 1) - 1) * 3;
  return Math.round(taban * (evrimlestiMi(yoldas) ? EVRIM_CARPANI : 1));
}

export function yoldasAdi(yoldas) {
  if (!yoldas) return '';
  return evrimlestiMi(yoldas) ? EVRIM_ADLARI[yoldas.turId] || yoldas.ad : yoldas.ad;
}

export function kullaniciYoldasGetir(userId) {
  const hepsi = depo.oku();
  return hepsi[userId] || null;
}

export function yoldasSec(userId, yoldasId) {
  const tur = YOLDAS_TURLERI[yoldasId];
  if (!tur) throw new Error('Geçersiz yoldaş türü.');

  const hepsi = depo.oku();
  const mevcut = hepsi[userId];

  hepsi[userId] = {
    turId: yoldasId,
    ad: tur.ad,
    seviye: mevcut?.seviye || 1,
    xp: mevcut?.xp || 0,
    sadakat: mevcut?.sadakat || 100,
    evrimTur: mevcut?.evrimTur || null,
    secilmeTarihi: mevcut?.secilmeTarihi || new Date().toISOString()
  };

  depo.yaz(hepsi);
  return hepsi[userId];
}

export function yoldasBesle(userId) {
  const hepsi = depo.oku();
  const yoldas = hepsi[userId];
  if (!yoldas) throw new Error('Henüz bir yoldaşın yok! `/yoldas sec` ile bir yoldaş edin.');

  yoldas.xp = (yoldas.xp || 0) + 35;
  yoldas.sadakat = Math.min(100, (yoldas.sadakat || 100) + 10);

  const gerekenXp = yoldas.seviye * 100;
  let seviyeAtladi = false;

  if (yoldas.xp >= gerekenXp) {
    yoldas.seviye += 1;
    yoldas.xp -= gerekenXp;
    seviyeAtladi = true;
  }

  let evrimOldu = false;
  if (yoldas.seviye >= EVRIM_SEVIYESI && !evrimlestiMi(yoldas)) {
    yoldas.evrimTur = yoldas.turId;
    evrimOldu = true;
  }

  depo.yaz(hepsi);
  return { yoldas, seviyeAtladi, evrimOldu };
}
