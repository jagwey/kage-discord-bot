import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';
import { haftaAnahtari } from './gorevServisi.js';
import { kullaniciKlaniniBul, klanSampiyonIsle } from './klanServisi.js';
import { sayacIlerlet } from './basarimServisi.js';

const depo = jsonDepo('klan_savasi.json', () => ({ hafta: null, puanlar: {}, gecmis: [] }));

/** Oyun olayı başına klana yazılan savaş puanı. */
export const SAVAS_PUANLARI = { balik: 1, bahce: 2, sefer: 3, zindan: 10, boss: 5, bossOldur: 25 };
export const TABAN_HAVUZ = 5000;
export const KLAN_BASINA_HAVUZ = 1000;
export const MAKS_HAVUZ = 15000;
/** Havuzun klan kasasına giden payı; kalanı üyelere puanlarıyla orantılı dağılır. */
export const KASA_PAYI = 0.4;

export function havuzHesapla(katilanKlanSayisi) {
  return Math.min(MAKS_HAVUZ, TABAN_HAVUZ + Math.max(0, katilanKlanSayisi - 1) * KLAN_BASINA_HAVUZ);
}

/** Hafta değiştiyse önceki haftanın kazananını ödüllendirir. Kapanan haftanın özetini döndürür. */
export function haftayiKapat(simdi = Date.now()) {
  const db = depo.oku();
  const hafta = haftaAnahtari(simdi);
  if (db.hafta === hafta) return null;
  if (!db.hafta) {
    db.hafta = hafta;
    depo.yaz(db);
    return null;
  }

  const siralama = Object.entries(db.puanlar)
    .filter(([, p]) => p.toplam > 0)
    .sort((a, b) => b[1].toplam - a[1].toplam);
  let ozet = null;
  if (siralama.length) {
    const [klanId, kazanan] = siralama[0];
    const havuz = havuzHesapla(siralama.length);
    const kasaPayi = Math.round(havuz * KASA_PAYI);
    const uyeHavuzu = havuz - kasaPayi;
    const klan = klanSampiyonIsle(klanId, kasaPayi, db.hafta);
    const odemeler = Object.entries(kazanan.uyeler).map(([uid, puan]) => ({
      uid, miktar: Math.max(50, Math.round(uyeHavuzu * puan / kazanan.toplam))
    }));
    ozet = { hafta: db.hafta, klanId, ad: klan?.ad || kazanan.ad, puan: kazanan.toplam, havuz, kasaPayi, odemeler };
    db.gecmis = [{ hafta: ozet.hafta, klanId, ad: ozet.ad, puan: ozet.puan, havuz }, ...(db.gecmis || [])].slice(0, 12);
  }
  db.hafta = hafta;
  db.puanlar = {};
  depo.yaz(db);

  if (ozet) {
    for (const o of ozet.odemeler) {
      ryoEkle(o.uid, o.miktar, `Klan savaşı şampiyonluğu (${ozet.hafta})`);
      sayacIlerlet(o.uid, 'klanSampiyon');
    }
  }
  return ozet;
}

/** Üyenin oyun olayını klanına puan olarak yazar. Klansızsa 0 döner. */
export function savasPuaniEkle(userId, tur, carpan = 1, simdi = Date.now()) {
  const taban = SAVAS_PUANLARI[tur];
  if (!taban) return 0;
  const klan = kullaniciKlaniniBul(userId);
  if (!klan) return 0;
  haftayiKapat(simdi);
  const puan = Math.round(taban * carpan);
  const db = depo.oku();
  const k = db.puanlar[klan.id] || (db.puanlar[klan.id] = { ad: klan.ad, toplam: 0, uyeler: {} });
  k.ad = klan.ad;
  k.toplam += puan;
  k.uyeler[userId] = (k.uyeler[userId] || 0) + puan;
  depo.yaz(db);
  return puan;
}

export function savasDurumu(simdi = Date.now()) {
  haftayiKapat(simdi);
  const db = depo.oku();
  const siralama = Object.entries(db.puanlar)
    .map(([id, p]) => ({ id, ad: p.ad, toplam: p.toplam, uyeler: p.uyeler }))
    .sort((a, b) => b.toplam - a.toplam);
  const pazartesi = new Date(`${db.hafta}T00:00:00+03:00`).getTime();
  return {
    hafta: db.hafta,
    bitis: pazartesi + 7 * 86400000,
    siralama,
    havuz: havuzHesapla(Math.max(1, siralama.length)),
    sonKazanan: db.gecmis?.[0] || null
  };
}
