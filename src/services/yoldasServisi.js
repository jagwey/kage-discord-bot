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

  depo.yaz(hepsi);
  return { yoldas, seviyeAtladi };
}
