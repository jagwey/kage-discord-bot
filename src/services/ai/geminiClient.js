import axios from 'axios';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Ücretsiz katman kotasını korumak için kayan pencere sınırlayıcı
const DAKIKA_LIMITI = Number(process.env.GEMINI_RPM) || 12;
const KULLANICI_BEKLEME_MS = Number(process.env.GEMINI_KULLANICI_BEKLEME_MS) || 2500;
const istekZamanlari = [];
const sonKullaniciIstegi = new Map();

export function anahtarVarMi() {
  return !!process.env.GEMINI_API_KEY;
}

function modelListesi() {
  const liste = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash'
  ].filter(Boolean);
  return [...new Set(liste)];
}

/**
 * Kota denetimi. Sınır aşılırsa neden mesajıyla birlikte false döner.
 */
export function kotaKontrol(userId = null) {
  const simdi = Date.now();
  while (istekZamanlari.length && simdi - istekZamanlari[0] > 60_000) istekZamanlari.shift();

  if (userId) {
    const son = sonKullaniciIstegi.get(userId) || 0;
    if (simdi - son < KULLANICI_BEKLEME_MS) {
      return { izin: false, neden: 'Yavaş ol savaşçı, biraz nefes al.' };
    }
  }
  if (istekZamanlari.length >= DAKIKA_LIMITI) {
    return { izin: false, neden: 'Gölge Veziri şu an çok meşgul, birkaç saniye sonra tekrar çağır.' };
  }
  return { izin: true };
}

function kotaIsle(userId) {
  const simdi = Date.now();
  istekZamanlari.push(simdi);
  if (userId) sonKullaniciIstegi.set(userId, simdi);
  if (sonKullaniciIstegi.size > 500) {
    for (const [k, t] of sonKullaniciIstegi) if (simdi - t > 60_000) sonKullaniciIstegi.delete(k);
  }
}

/**
 * Gemini generateContent çağrısı (model yedekli, anahtar header'da).
 * @returns {Promise<{parts: object[], model: string}>}
 */
export async function geminiUret({ systemInstruction, contents, functionDeclarations = [], userId = null, temperature = 0.7, maxOutputTokens = 1500 }) {
  if (!anahtarVarMi()) throw new Error('GEMINI_API_KEY tanımlı değil.');

  const govde = {
    contents,
    generationConfig: { temperature, maxOutputTokens }
  };
  if (systemInstruction) {
    govde.systemInstruction = { parts: [{ text: String(systemInstruction) }] };
  }
  if (functionDeclarations.length) {
    govde.tools = [{ functionDeclarations }];
    govde.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
  }

  kotaIsle(userId);

  let sonHata = null;
  for (const model of modelListesi()) {
    try {
      const res = await axios.post(`${BASE}/${model}:generateContent`, govde, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        timeout: 30_000
      });
      const aday = res.data?.candidates?.[0];
      const parts = aday?.content?.parts;
      if (!parts?.length) {
        const sebep = aday?.finishReason || res.data?.promptFeedback?.blockReason || 'boş yanıt';
        sonHata = new Error(`Gemini yanıt vermedi (${sebep}).`);
        continue;
      }
      return { parts, model };
    } catch (err) {
      const durum = err.response?.status;
      sonHata = new Error(err.response?.data?.error?.message || err.message);
      // 404 (model yok) ve 429/5xx için sıradaki modele geç; 400/401/403 kalıcı hata
      if (durum && ![404, 429, 500, 502, 503, 504].includes(durum)) break;
    }
  }
  throw sonHata || new Error('Gemini çağrısı başarısız.');
}
