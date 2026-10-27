import { oyunOlayi } from './oyunOlayServisi.js';
import { jsonDepo } from './jsonDepo.js';
import { ryoEkle, bakiyeGetir } from './ekonomiServisi.js';

const depo = jsonDepo('boss.json', () => ({ sunucular: {} }));

export const SALDIRI_BEKLEME_MS = 60 * 60 * 1000;
export const BOSS_SURE_MS = 48 * 60 * 60 * 1000;

const ISIMLER = [
  { ad: 'Kızıl Oni', emoji: '👹' },
  { ad: 'Gölge Ejderhası', emoji: '🐉' },
  { ad: 'Yüzlerce Gözlü Yokai', emoji: '👁️' },
  { ad: 'Kemik Kuklacı', emoji: '💀' },
  { ad: 'Kırk Kuyruklu Kitsune', emoji: '🦊' }
];

export function bossCani(seviye) {
  return Math.round(12000 * (1 + 0.6 * (seviye - 1)));
}

export function ganimetHavuzu(seviye) {
  return 2500 + 1500 * seviye;
}

function yeniBoss(seviye, simdi) {
  const k = ISIMLER[(seviye - 1) % ISIMLER.length];
  const can = bossCani(seviye);
  return { ad: k.ad, emoji: k.emoji, seviye, maksCan: can, can, baslangic: simdi, bitis: simdi + BOSS_SURE_MS, hasar: {}, bitti: false };
}

/** Sunucunun aktif boss'unu döndürür; yoksa veya süresi dolduysa yenisini çağırır. */
function bossAl(db, guildId, simdi) {
  const kayit = db.sunucular[guildId] || (db.sunucular[guildId] = { seviye: 1, boss: null, oldurulen: 0, kacan: 0 });
  const b = kayit.boss;
  if (!b) {
    kayit.boss = yeniBoss(kayit.seviye, simdi);
  } else if (b.bitti) {
    kayit.seviye += 1;
    kayit.boss = yeniBoss(kayit.seviye, simdi);
  } else if (simdi >= b.bitis) {
    kayit.kacan += 1;
    kayit.boss = yeniBoss(kayit.seviye, simdi);
  }
  return kayit;
}

export function bossDurumu(guildId, simdi = Date.now()) {
  const db = depo.oku();
  const kayit = bossAl(db, guildId, simdi);
  depo.yaz(db);
  const b = kayit.boss;
  const siralama = Object.entries(b.hasar)
    .map(([uid, v]) => ({ uid, toplam: v.toplam }))
    .sort((x, y) => y.toplam - x.toplam);
  return { ...b, siralama, oldurulen: kayit.oldurulen, kacan: kayit.kacan, kalanMs: Math.max(0, b.bitis - simdi) };
}

export function saldiriHasari(kilic, rng = Math.random) {
  const taban = 120 + rng() * 180 + Math.min(Number(kilic) || 0, 30) * 8;
  const kritik = rng() < 0.12;
  return { hasar: Math.round(taban * (kritik ? 2 : 1)), kritik };
}

export function saldir(guildId, userId, simdi = Date.now(), rng = Math.random) {
  const db = depo.oku();
  const kayit = bossAl(db, guildId, simdi);
  const b = kayit.boss;
  const onceki = b.hasar[userId];
  if (onceki && simdi - onceki.son < SALDIRI_BEKLEME_MS) {
    return { basarili: false, sebep: 'bekle', beklemeMs: onceki.son + SALDIRI_BEKLEME_MS - simdi };
  }
  // Kılıç seviyesi (1-4) hasarı artırır; bakiyeGetir kılıç nesnesini döndürür.
  const kilic = bakiyeGetir(userId).kilic?.seviye || 1;
  const { hasar, kritik } = saldiriHasari(kilic, rng);
  const vurulan = Math.min(hasar, b.can);
  b.can -= vurulan;
  const v = b.hasar[userId] || (b.hasar[userId] = { toplam: 0, son: 0 });
  v.toplam += vurulan;
  v.son = simdi;

  const sonuc = { basarili: true, hasar: vurulan, kritik, can: b.can, maksCan: b.maksCan, oldu: false, odul: [] };
  if (b.can <= 0) {
    b.bitti = true;
    kayit.oldurulen += 1;
    const havuz = ganimetHavuzu(b.seviye);
    const toplamHasar = Object.values(b.hasar).reduce((t, x) => t + x.toplam, 0);
    sonuc.oldu = true;
    sonuc.seviye = b.seviye;
    for (const [uid, x] of Object.entries(b.hasar)) {
      let miktar = Math.max(10, Math.round(havuz * (x.toplam / toplamHasar)));
      if (uid === userId) miktar += Math.round(havuz * 0.2);
      sonuc.odul.push({ uid, miktar });
    }
  }
  depo.yaz(db);
  for (const o of sonuc.odul) ryoEkle(o.uid, o.miktar, `Boss ganimeti (seviye ${sonuc.seviye})`);
  sonuc.notlar = oyunOlayi(userId, 'boss').notlar;
  if (sonuc.oldu) {
    for (const o of sonuc.odul) {
      const n = oyunOlayi(o.uid, 'bossOldur').notlar;
      if (o.uid === userId) sonuc.notlar.push(...n);
    }
  }
  return sonuc;
}
