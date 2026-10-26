import { jsonDepo } from './jsonDepo.js';
import { ryoEkle, ryoDus } from './ekonomiServisi.js';

const depo = jsonDepo('dojo.json', () => ({ kullanicilar: {} }));

export const MAKS_SEVIYE = 25;
export const DEPO_SAAT = 12;

/** Saatlik Ryo üretimi: seviye başına 25 Ryo, 5. seviyeden sonra küçük çarpan bonusu. */
export function saatlikUretim(seviye) {
  return Math.round(seviye * 25 * (1 + Math.floor(seviye / 5) * 0.1));
}

export function yukseltmeBedeli(seviye) {
  return Math.round(400 * Math.pow(seviye, 1.6));
}

function kayitAl(db, userId, simdi) {
  if (!db.kullanicilar[userId]) db.kullanicilar[userId] = { seviye: 0, son: simdi, toplam: 0 };
  return db.kullanicilar[userId];
}

/** Toplanmayı bekleyen Ryo (en fazla DEPO_SAAT saatlik üretim birikir). */
export function bekleyenRyo(kayit, simdi = Date.now()) {
  if (!kayit || kayit.seviye < 1) return 0;
  const saat = Math.min(DEPO_SAAT, Math.max(0, (simdi - kayit.son) / 3600000));
  return Math.floor(saat * saatlikUretim(kayit.seviye));
}

export function dojoDurumu(userId, simdi = Date.now()) {
  const kayit = depo.oku().kullanicilar[userId] || { seviye: 0, son: simdi, toplam: 0 };
  return {
    ...kayit,
    bekleyen: bekleyenRyo(kayit, simdi),
    saatlik: saatlikUretim(kayit.seviye),
    sonrakiBedel: kayit.seviye >= MAKS_SEVIYE ? null : yukseltmeBedeli(kayit.seviye + 1)
  };
}

/** Birikmiş Ryo'yu cüzdana aktarır. */
export function dojoTopla(userId, simdi = Date.now()) {
  const db = depo.oku();
  const kayit = kayitAl(db, userId, simdi);
  const miktar = bekleyenRyo(kayit, simdi);
  if (kayit.seviye < 1) return { basarili: false, sebep: 'dojo_yok' };
  if (miktar < 1) return { basarili: false, sebep: 'bos' };
  kayit.son = simdi;
  kayit.toplam += miktar;
  depo.yaz(db);
  ryoEkle(userId, miktar, 'Dojo geliri');
  return { basarili: true, miktar };
}

/** Dojo'yu bir seviye yükseltir (ilk alım dahil). Bedel Ryo'dan düşülür. */
export function dojoGelistir(userId, simdi = Date.now()) {
  const db = depo.oku();
  const kayit = kayitAl(db, userId, simdi);
  if (kayit.seviye >= MAKS_SEVIYE) return { basarili: false, sebep: 'maks' };
  const bedel = yukseltmeBedeli(kayit.seviye + 1);
  // Yükseltmeden önce birikmiş geliri kaybetmemek için önce toplanır.
  const bekleyen = bekleyenRyo(kayit, simdi);
  if (!ryoDus(userId, bedel, `Dojo seviye ${kayit.seviye + 1}`)) return { basarili: false, sebep: 'yetersiz', bedel };
  if (bekleyen > 0) {
    ryoEkle(userId, bekleyen, 'Dojo geliri');
    kayit.toplam += bekleyen;
  }
  kayit.seviye += 1;
  kayit.son = simdi;
  depo.yaz(db);
  return { basarili: true, seviye: kayit.seviye, bedel, toplanan: bekleyen };
}
