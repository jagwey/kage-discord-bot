import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';

const depo = jsonDepo('basarimlar.json', () => ({ kullanicilar: {} }));

/**
 * Rozet tanımları. `sayac` hangi sayaca bakılacağını, `hedef` gereken değeri söyler.
 * Sayaçlar oyunOlayServisi üzerinden artar; `maks` türündeki sayaçlar en yüksek değeri tutar.
 */
export const BASARIMLAR = [
  { id: 'ilk_balik', ad: 'İlk Av', emoji: '🎣', sayac: 'balik', hedef: 1, odul: 50 },
  { id: 'balik_100', ad: 'Usta Balıkçı', emoji: '🐟', sayac: 'balik', hedef: 100, odul: 500 },
  { id: 'balik_1000', ad: 'Deniz Efendisi', emoji: '🌊', sayac: 'balik', hedef: 1000, odul: 2500 },
  { id: 'ilk_zindan', ad: 'İlk Zafer', emoji: '⚔️', sayac: 'zindan', hedef: 1, odul: 100 },
  { id: 'zindan_50', ad: 'Zindan Kurdu', emoji: '🏯', sayac: 'zindan', hedef: 50, odul: 1000 },
  { id: 'kat_3', ad: 'Dipsiz Kuyu', emoji: '🕳️', sayac: 'kat', hedef: 3, odul: 750 },
  { id: 'ilk_boss', ad: 'İlk Kan', emoji: '🩸', sayac: 'boss', hedef: 1, odul: 100 },
  { id: 'boss_oldur', ad: 'Oni Avcısı', emoji: '👹', sayac: 'bossOldur', hedef: 1, odul: 500 },
  { id: 'seri_7', ad: 'Sadık Ruh', emoji: '🔥', sayac: 'seri', hedef: 7, odul: 300 },
  { id: 'seri_30', ad: 'Demir İrade', emoji: '🗿', sayac: 'seri', hedef: 30, odul: 2000 },
  { id: 'zanaat_1', ad: 'Demirci Çırağı', emoji: '🔨', sayac: 'zanaat', hedef: 1, odul: 150 },
  { id: 'zanaat_10', ad: 'Usta Zanaatkâr', emoji: '⚒️', sayac: 'zanaat', hedef: 10, odul: 1000 },
  { id: 'evrim', ad: 'Bağ Ustası', emoji: '🌟', sayac: 'evrim', hedef: 1, odul: 500 },
  { id: 'baskin_5', ad: 'Baskın Muhafızı', emoji: '🛡️', sayac: 'baskin', hedef: 5, odul: 400 },
  { id: 'piyango', ad: 'Talihli', emoji: '🎟️', sayac: 'piyangoKazan', hedef: 1, odul: 500 },
  { id: 'kara_borsa', ad: 'Karanlık Tüccar', emoji: '🕯️', sayac: 'karaBorsa', hedef: 10, odul: 300 },
  { id: 'klan_sampiyon', ad: 'Haftanın Klanı', emoji: '🏆', sayac: 'klanSampiyon', hedef: 1, odul: 1000 }
];

/** Bu sayaçlar toplanmaz; en yüksek görülen değer saklanır. */
const MAKS_SAYACLAR = new Set(['kat', 'seri']);

function kayitAl(db, userId) {
  if (!db.kullanicilar[userId]) db.kullanicilar[userId] = { sayac: {}, rozetler: {} };
  return db.kullanicilar[userId];
}

/**
 * Sayacı ilerletir, yeni kazanılan rozetleri işler ve ödüllerini öder.
 * @returns {Array<{id, ad, emoji, odul}>} yeni kazanılan rozetler
 */
export function sayacIlerlet(userId, sayac, deger = 1, simdi = Date.now()) {
  if (!BASARIMLAR.some(b => b.sayac === sayac)) return [];
  const db = depo.oku();
  const k = kayitAl(db, userId);
  const once = k.sayac[sayac] || 0;
  k.sayac[sayac] = MAKS_SAYACLAR.has(sayac) ? Math.max(once, deger) : once + deger;

  const yeni = BASARIMLAR.filter(b => b.sayac === sayac && !k.rozetler[b.id] && k.sayac[sayac] >= b.hedef);
  for (const b of yeni) k.rozetler[b.id] = simdi;
  depo.yaz(db);
  for (const b of yeni) ryoEkle(userId, b.odul, `Başarım: ${b.ad}`);
  return yeni;
}

/** Kazanılan rozetleri kazanılma sırasıyla döndürür. */
export function kazanilanRozetler(userId) {
  const k = depo.oku().kullanicilar[userId];
  if (!k) return [];
  return BASARIMLAR.filter(b => k.rozetler[b.id]).sort((a, b) => k.rozetler[a.id] - k.rozetler[b.id]);
}

/** Her rozet için ilerleme bilgisi. */
export function basarimDurumu(userId) {
  const k = depo.oku().kullanicilar[userId] || { sayac: {}, rozetler: {} };
  return BASARIMLAR.map(b => ({
    ...b,
    ilerleme: Math.min(b.hedef, k.sayac[b.sayac] || 0),
    kazanildi: !!k.rozetler[b.id]
  }));
}

export function rozetSatiri(rozet) {
  return `🏅 Yeni başarım: ${rozet.emoji} **${rozet.ad}** (+${rozet.odul} Ryo)`;
}
