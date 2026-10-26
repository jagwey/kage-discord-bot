/**
 * Oyun komutları için ortak görsel yardımcılar: ASCII kart çizimi, can çubukları,
 * kısa gecikme ve para biçimleme. Böylece blackjack, düello, yazı-tura ve slot
 * aynı görsel dili paylaşır.
 */

export const bekle = ms => new Promise(r => setTimeout(r, ms));

export const ryoYaz = n => `${Number(n).toLocaleString('tr-TR')} Ryo`;

/** Her zaman 2 karakter genişliğinde kart değeri (10 → "10", diğerleri "A "). */
function deger2(ad) {
  return ad.length === 2 ? ad : `${ad} `;
}

/**
 * Kartları yan yana çizer. Kapalı kart `░` desenli gösterilir.
 * @param {{ad:string, sembol:string}[]} kartlar
 * @param {boolean} [sonuKapat] true ise ikinci kart kapalı çizilir (krupiye)
 * @returns {string} Discord kod bloğu
 */
export function kartlariCiz(kartlar, sonuKapat = false) {
  const satirlar = ['', '', '', '', ''];
  kartlar.forEach((k, i) => {
    const kapali = sonuKapat && i === 1;
    const parca = kapali
      ? ['┌─────┐', '│░░░░░│', '│░░?░░│', '│░░░░░│', '└─────┘']
      : [
        '┌─────┐',
        `│${deger2(k.ad)}   │`,
        `│  ${k.sembol}  │`,
        `│   ${deger2(k.ad).trimEnd().padStart(2, ' ')}│`,
        '└─────┘'
      ];
    parca.forEach((p, s) => { satirlar[s] += (i ? ' ' : '') + p; });
  });
  return '```\n' + satirlar.join('\n') + '\n```';
}

/**
 * Emoji can çubuğu: tam kareler dolu, kalanlar boş. 12 karelik çubuk.
 */
export function canCubugu(hp, maks = 100, uzunluk = 12) {
  const oran = Math.max(0, Math.min(1, hp / maks));
  const dolu = Math.round(oran * uzunluk);
  const renk = oran > 0.6 ? '🟩' : oran > 0.3 ? '🟨' : '🟥';
  return `${renk.repeat(dolu)}${'⬛'.repeat(uzunluk - dolu)} **${Math.max(0, hp)}**/${maks}`;
}

/** Skoru görsel etiketle gösterir. */
export function skorEtiketi(skor) {
  if (skor > 21) return `💥 ${skor}`;
  if (skor === 21) return `✨ ${skor}`;
  return `${skor}`;
}
