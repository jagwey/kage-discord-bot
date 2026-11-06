const GUN_MS = 24 * 60 * 60 * 1000;
const DAKIKA_MS = 60 * 1000;
const DAKIKA_LIMIT = 6;

/** Süreç içi mükerrer wamid ve hız sınırı. Meta yeniden dener; bellek restart’ta sıfırlanır. */
export function depoOlustur() {
  const gorulen = new Map();
  const son = new Map();
  const dakikalik = new Map();

  function budama(simdi) {
    if (gorulen.size <= 5000) return;
    for (const [kimlik, zaman] of gorulen) {
      if (simdi - zaman > GUN_MS) gorulen.delete(kimlik);
    }
  }

  return {
    ilkKezMi(wamid, simdi = Date.now()) {
      if (!wamid) return false;
      budama(simdi);
      if (gorulen.has(wamid)) return false;
      gorulen.set(wamid, simdi);
      return true;
    },
    hizAsildiMi(anahtar, simdi = Date.now(), beklemeMs = 8000) {
      if (!anahtar || beklemeMs <= 0) return false;
      const once = son.get(anahtar) || 0;
      if (simdi - once < beklemeMs) return true;
      const liste = (dakikalik.get(anahtar) || []).filter(zaman => simdi - zaman < DAKIKA_MS);
      if (liste.length >= DAKIKA_LIMIT) {
        dakikalik.set(anahtar, liste);
        return true;
      }
      liste.push(simdi);
      dakikalik.set(anahtar, liste);
      son.set(anahtar, simdi);
      return false;
    }
  };
}
