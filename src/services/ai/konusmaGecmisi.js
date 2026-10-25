// Kanal başına kısa süreli konuşma belleği (RAM, halka tampon)
const MAKS_MESAJ = 24;
const OMUR_MS = 45 * 60 * 1000;
const kanallar = new Map();

function kanalGetir(kanalId) {
  const simdi = Date.now();
  let k = kanallar.get(kanalId);
  if (!k || simdi - k.son > OMUR_MS) {
    k = { mesajlar: [], son: simdi };
    kanallar.set(kanalId, k);
  }
  k.son = simdi;
  return k;
}

/** Kanalda geçen bir mesajı (kullanıcı ya da Kage) kaydeder. */
export function gecmiseEkle(kanalId, rol, yazar, metin) {
  if (!metin) return;
  const k = kanalGetir(kanalId);
  k.mesajlar.push({ rol, yazar, metin: String(metin).slice(0, 700) });
  if (k.mesajlar.length > MAKS_MESAJ) k.mesajlar.splice(0, k.mesajlar.length - MAKS_MESAJ);
}

/** Gemini `contents` biçimine çevirir (ardışık aynı rolleri birleştirir, user ile başlar). */
export function gecmisiIcerigeCevir(kanalId) {
  const k = kanallar.get(kanalId);
  if (!k) return [];
  const icerik = [];
  for (const m of k.mesajlar) {
    const rol = m.rol === 'model' ? 'model' : 'user';
    const metin = rol === 'user' ? `[${m.yazar}]: ${m.metin}` : m.metin;
    const son = icerik[icerik.length - 1];
    if (son && son.role === rol) son.parts[0].text += `\n${metin}`;
    else icerik.push({ role: rol, parts: [{ text: metin }] });
  }
  while (icerik.length && icerik[0].role !== 'user') icerik.shift();
  return icerik;
}

export function gecmisiTemizle(kanalId) {
  kanallar.delete(kanalId);
}
