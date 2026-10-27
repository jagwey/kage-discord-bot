import { jsonDepo } from './jsonDepo.js';
import { ryoDus, ryoEkle } from './ekonomiServisi.js';
import { haftaAnahtari } from './gorevServisi.js';
import { sayacIlerlet } from './basarimServisi.js';

const depo = jsonDepo('piyango.json', () => ({ hafta: null, biletler: {}, gecmis: [] }));

export const BILET_FIYATI = 100;
export const MAKS_BILET = 50;
/** Kasanın her hafta havuza koyduğu başlangıç ikramiyesi. */
export const TABAN_HAVUZ = 1000;
/** Bilet gelirinin havuza giden payı; kalanı kasada kalır (enflasyon freni). */
export const HAVUZ_PAYI = 0.9;

function toplamBilet(biletler) {
  return Object.values(biletler).reduce((a, n) => a + n, 0);
}

export function havuzHesapla(biletSayisi) {
  return TABAN_HAVUZ + Math.round(biletSayisi * BILET_FIYATI * HAVUZ_PAYI);
}

/**
 * Hafta değiştiyse önceki haftanın çekilişini yapar. Kazanma şansı bilet sayısıyla orantılıdır.
 * Kimse bilet almadıysa ikramiye devretmez; havuz yeni haftada tabandan başlar.
 */
export function cekilisYap(simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const hafta = haftaAnahtari(simdi);
  if (db.hafta === hafta) return null;
  if (!db.hafta) {
    db.hafta = hafta;
    depo.yaz(db);
    return null;
  }

  const toplam = toplamBilet(db.biletler);
  let ozet = null;
  if (toplam > 0) {
    let hedef = rng() * toplam;
    let kazanan = null;
    for (const [uid, n] of Object.entries(db.biletler)) {
      hedef -= n;
      if (hedef < 0) { kazanan = uid; break; }
    }
    kazanan ??= Object.keys(db.biletler).at(-1);
    ozet = {
      hafta: db.hafta,
      kazanan,
      ikramiye: havuzHesapla(toplam),
      biletSayisi: toplam,
      kazananBilet: db.biletler[kazanan],
      katilimci: Object.keys(db.biletler).length
    };
    db.gecmis = [{ hafta: ozet.hafta, kazanan, ikramiye: ozet.ikramiye, biletSayisi: toplam }, ...(db.gecmis || [])].slice(0, 12);
  }
  db.hafta = hafta;
  db.biletler = {};
  depo.yaz(db);

  if (ozet) {
    ryoEkle(ozet.kazanan, ozet.ikramiye, `Piyango ikramiyesi (${ozet.hafta})`);
    sayacIlerlet(ozet.kazanan, 'piyangoKazan');
  }
  return ozet;
}

export function biletAl(userId, adet, simdi = Date.now()) {
  cekilisYap(simdi);
  if (!Number.isInteger(adet) || adet < 1) return { basarili: false, mesaj: 'En az 1 bilet alabilirsin.' };
  const db = depo.oku();
  const mevcut = db.biletler[userId] || 0;
  if (mevcut + adet > MAKS_BILET) {
    return { basarili: false, mesaj: `Haftalık sınır ${MAKS_BILET} bilet. Sende ${mevcut} var, en fazla ${MAKS_BILET - mevcut} daha alabilirsin.` };
  }
  const bedel = adet * BILET_FIYATI;
  if (!ryoDus(userId, bedel, `Piyango bileti x${adet}`)) {
    return { basarili: false, mesaj: `Cüzdanın yetmiyor. ${adet} bilet **${bedel} Ryo**.` };
  }
  db.biletler[userId] = mevcut + adet;
  depo.yaz(db);
  return { basarili: true, adet, bedel, toplamim: db.biletler[userId] };
}

export function piyangoDurumu(userId, simdi = Date.now()) {
  cekilisYap(simdi);
  const db = depo.oku();
  const toplam = toplamBilet(db.biletler);
  const benim = db.biletler[userId] || 0;
  const pazartesi = new Date(`${db.hafta}T00:00:00+03:00`).getTime();
  return {
    hafta: db.hafta,
    cekilis: pazartesi + 7 * 86400000,
    havuz: havuzHesapla(toplam),
    toplamBilet: toplam,
    katilimci: Object.keys(db.biletler).length,
    benim,
    sansim: toplam ? benim / toplam : 0,
    sonCekilis: db.gecmis?.[0] || null
  };
}
