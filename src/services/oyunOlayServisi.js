import { gorevIlerlet } from './gorevServisi.js';
import { sayacIlerlet, rozetSatiri } from './basarimServisi.js';
import { malzemeDusur, malzemeEkle, MALZEMELER } from './zanaatServisi.js';
import { savasPuaniEkle } from './klanSavasServisi.js';

const GOREV_TURLERI = new Set(['mesaj', 'balik', 'zindan', 'boss']);
/** Sayacı olay adedi yerine `deger` ile güncellenen olaylar. */
const DEGERLI_SAYACLAR = new Set(['kat', 'seri']);

/**
 * Bütün oyun olaylarının tek giriş noktası: günlük görev, başarım, klan savaşı puanı
 * ve malzeme düşürme burada işlenir. Komutlar dönen notları çıktılarının altına ekler.
 * 'mesaj' olayı sık geldiği için yalnızca görevi ilerletir.
 */
export function oyunOlayi(userId, tur, { adet = 1, deger, kat = 1 } = {}) {
  const notlar = [];
  if (GOREV_TURLERI.has(tur)) gorevIlerlet(userId, tur, adet);
  if (tur === 'mesaj') return { notlar };

  const rozetler = DEGERLI_SAYACLAR.has(tur)
    ? sayacIlerlet(userId, tur, deger ?? 0)
    : sayacIlerlet(userId, tur, adet);

  const carpan = tur === 'zindan' ? kat : 1;
  const puan = savasPuaniEkle(userId, tur, carpan);
  if (puan) notlar.push(`⚔️ Klanına **+${puan}** savaş puanı.`);

  const dusen = malzemeDusur(tur, { kat });
  if (Object.keys(dusen).length) {
    malzemeEkle(userId, dusen);
    notlar.push(`🧰 Malzeme: ${Object.entries(dusen).map(([id, n]) => `${MALZEMELER[id].emoji} ${MALZEMELER[id].ad} x${n}`).join(', ')}`);
  }

  for (const r of rozetler) notlar.push(rozetSatiri(r));
  return { notlar };
}
