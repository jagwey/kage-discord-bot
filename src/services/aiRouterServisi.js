import { geminiUret, anahtarVarMi as geminiVarMi } from './ai/geminiClient.js';
import { egitimBaglami, ciktiyiDenetle } from './egitimServisi.js';
import { ortakHafizaBaglamiGetir, ogrenilenleriAyiklaVeKaydet } from './kageHafizaServisi.js';

/**
 * AKILLI ÇOKLU YAPAY ZEKA YÖNLENDİRİCİSİ (AI ROUTER & MESH)
 * 
 * 1. Google Gemini 2.5 Flash (Birincil derin zeka, araç çağırma ve hafıza)
 * 2. Groq Cloud / Llama 3.3 70B (Ultra hızlı metin & sohbet - varsa GROQ_API_KEY)
 * 3. OpenRouter (DeepSeek / Llama :free modelleri - varsa OPENROUTER_API_KEY)
 * 4. Pollinations AI (%100 ÜCRETSİZ, SIFIR KEY - Metin ve Görsel Üretimi)
 *    Moderasyon, Gölge Göz ve özel bağlam görevlerinde yedek olarak kullanılmaz
 *    (sistem + hafıza + sohbet GET URL'ine gitmesin).
 */

/** Sağlayıcı HTTP zaman aşımı: 10 sn (AbortSignal.timeout, 8–12 sn aralığı). */
const SAGLAYICI_TIMEOUT_MS = 10_000;
/** akilliAiUret ve belirliModelUret için tüm denemelerin toplam bütçesi. */
export const AI_TOPLAM_BUTCE_MS = 20_000;

function istekSinyali(butceSinyali) {
  const hop = AbortSignal.timeout(SAGLAYICI_TIMEOUT_MS);
  return butceSinyali ? AbortSignal.any([hop, butceSinyali]) : hop;
}

function butceKontrolcusu() {
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), AI_TOPLAM_BUTCE_MS);
  return {
    signal: kontrol.signal,
    doldu: () => kontrol.signal.aborted,
    kapat: () => clearTimeout(zamanlayici)
  };
}

function butceAsildiLogla(baglam) {
  console.warn(`[AI Router] Toplam bütçe aşıldı (${AI_TOPLAM_BUTCE_MS}ms, ${baglam}). Deneme kesildi.`);
}

const istatistik = {};

function say(saglayici, basarili, hata = '') {
  const s = istatistik[saglayici] || (istatistik[saglayici] = { basari: 0, hata: 0, sonHata: '' });
  if (basarili) s.basari += 1;
  else { s.hata += 1; s.sonHata = hata; }
}

/** Bot açıldığından beri sağlayıcı başına başarı/hata sayıları (/ai-durum). */
export function aiIstatistik() {
  return istatistik;
}

export function saglayiciDurumu() {
  return {
    gemini: geminiVarMi(),
    groq: !!process.env.GROQ_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    pollinations: true // Her zaman ücretsiz ve aktif
  };
}

/**
 * Görsel Okuma & Analiz Motoru (Gemini Multimodal Vision)
 * Manga panelleri, ekran görüntüleri, çizimler ve fotoğrafları analiz eder.
 * 
 * @param {Object} secenekler
 * @param {string} secenekler.resimUrl
 * @param {string} [secenekler.mimeType]
 * @param {string} [secenekler.soru]
 * @param {string} [secenekler.userId]
 * @param {string} [secenekler.userName]
 * @returns {Promise<{ metin: string, saglayici: string }>}
 */
export async function gorselAnalizEt({ resimUrl, mimeType = 'image/jpeg', soru = 'Bu görseli analiz et ve samuray tarzında açıkla.', userId = 'anon', userName = 'Samuray' }) {
  if (!geminiVarMi()) {
    throw new Error('Görsel analizi için GEMINI_API_KEY gereklidir.');
  }

  // 1. Resmi Buffer olarak indir ve base64'e çevir
  const res = await fetch(resimUrl);
  if (!res.ok) throw new Error(`Görsel indirilemedi (HTTP ${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');
  const algilananMime = mimeType || res.headers.get('content-type') || 'image/jpeg';

  const ortakBaglam = ortakHafizaBaglamiGetir({ userId, userName, prompt: soru });
  const sistemTalimati = `${ortakBaglam}\n\nSen görseli inceleyen bilge bir gölge samurayısın. Resimdeki detayları, anime/manga karakterlerini, sahneleri, metinleri veya çizimleri dikkatle tanı ve samimi, net Türkçe açıkla.`;

  const contents = [
    {
      role: 'user',
      parts: [
        { text: `[${userName}]: ${soru}` },
        {
          inlineData: {
            mimeType: algilananMime.split(';')[0].trim(),
            data: base64Data
          }
        }
      ]
    }
  ];

  const { parts } = await geminiUret({
    systemInstruction: sistemTalimati,
    contents,
    userId,
    maxOutputTokens: 1200
  });

  const hamMetin = parts?.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
  if (!hamMetin) throw new Error('Görselden anlamlı bir yanıt üretilemedi.');

  const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, hamMetin);
  return {
    metin: ciktiyiDenetle(temizMetin),
    saglayici: 'Gemini Vision (Görsel Zeka)'
  };
}

/**
 * Pollinations AI metin üretimi (%100 Ücretsiz, key istemez)
 */
async function pollinationsMetinUret(prompt, systemInstruction = '', butceSinyali = null) {
  const url = 'https://text.pollinations.ai/';
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\nKullanıcı: ${prompt}` : prompt;
  
  const res = await fetch(url + encodeURIComponent(fullPrompt), {
    headers: { 'User-Agent': 'Kage-Bot/2.5 (JagTech)' },
    signal: istekSinyali(butceSinyali)
  });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const text = await res.text();
  return text.trim();
}

/**
 * Groq Cloud metin üretimi (GPT-OSS-120B / Llama 3.3 / Qwen - Dünyanın en hızlısı)
 */
async function groqMetinUret(prompt, systemInstruction = '', butceSinyali = null, secenekler = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY yok');

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const denenecekModeller = [
    process.env.GROQ_MODEL,
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b'
  ].filter(Boolean);

  const temperature = typeof secenekler.temperature === 'number' ? secenekler.temperature : 0.7;
  const formatlar = jsonFormatDenemeleri(secenekler.jsonSema);
  let sonHata = null;

  for (const model of denenecekModeller) {
    if (butceSinyali?.aborted) throw new Error('Toplam yapay zeka bütçesi aşıldı.');
    let modelHatasi = null;
    for (const responseFormat of formatlar) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            // gpt-oss düşünme token'larını da bu sınırdan harcar; düşükse content boş döner.
            max_tokens: 4096,
            ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
            ...(responseFormat ? { response_format: responseFormat } : {})
          }),
          signal: istekSinyali(butceSinyali)
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const err = new Error(errJson.error?.message || `Groq HTTP ${res.status}`);
          err.status = res.status;
          throw err;
        }

        const data = await res.json();
        const icerik = data.choices?.[0]?.message?.content?.trim();
        if (icerik) return icerik;
        modelHatasi = new Error('Groq boş içerik');
      } catch (err) {
        if (butceSinyali?.aborted) throw err;
        modelHatasi = err;
        if (err.status === 400 && responseFormat?.type === 'json_schema') continue;
        break;
      }
    }
    if (modelHatasi) sonHata = modelHatasi;
  }

  throw sonHata || new Error('Groq modelleri yanıt veremedi');
}

/**
 * OpenRouter metin üretimi (DeepSeek -> Llama -> Gemini -> OpenRouter Free sıralı fallback)
 */
async function openRouterMetinUret(prompt, systemInstruction = '', ozelModel = null, butceSinyali = null, secenekler = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY yok');

  const denenecekModeller = [
    ozelModel,
    process.env.OPENROUTER_MODEL,
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3.5-lightning:free',
    'deepseek/deepseek-chat:free',
    'deepseek/deepseek-r1:free',
    'meta-llama/llama-3.3-70b-instruct:free'
  ].filter(Boolean);

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const temperature = typeof secenekler.temperature === 'number' ? secenekler.temperature : 0.7;
  const formatlar = jsonFormatDenemeleri(secenekler.jsonSema);
  let sonHata = null;

  for (const model of denenecekModeller) {
    if (butceSinyali?.aborted) throw new Error('Toplam yapay zeka bütçesi aşıldı.');
    let modelHatasi = null;
    for (const responseFormat of formatlar) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://kage95.com',
            'X-Title': 'Kage Bot'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: 1500,
            ...(responseFormat ? { response_format: responseFormat } : {})
          }),
          signal: istekSinyali(butceSinyali)
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const err = new Error('HTTP ' + res.status + ': ' + errText.slice(0, 100));
          err.status = res.status;
          throw err;
        }

        const data = await res.json();
        const choice = data.choices?.[0];
        let yanit = (choice?.message?.content || choice?.message?.reasoning || '').trim();

        // DeepSeek R1 ve benzeri düşünce bloklarını (<think>...</think>) temizle
        yanit = yanit.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if (yanit) return yanit;
        modelHatasi = new Error('OpenRouter boş içerik');
      } catch (err) {
        if (butceSinyali?.aborted) throw err;
        modelHatasi = err;
        if (err.status === 400 && responseFormat?.type === 'json_schema') continue;
        console.warn(`[AI Router] OpenRouter modeli ${model} hata: ${err.message}`);
        break;
      }
    }
    if (modelHatasi) sonHata = modelHatasi;
  }

  throw sonHata || new Error('OpenRouter modelleri yanıt veremedi');
}

/** Moderasyon, Gölge Göz ve özel bağlam: Pollinations yedek zincirine girmez. */
const OZEL_BAGLAM_ANAHTARLARI = ['moderasyon', 'moderation', 'golge_goz', 'golgegoz', 'ozel_baglam', 'private'];

function gorevAnahtari(gorevTipi) {
  return String(gorevTipi || '')
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .trim()
    .replace(/[\s-]+/g, '_');
}

/** gorevTipi moderasyon, Gölge Göz veya özel bağlam mı? */
export function ozelBaglamGoreviMi(gorevTipi = '') {
  const t = gorevAnahtari(gorevTipi);
  return OZEL_BAGLAM_ANAHTARLARI.some(anahtar => t === anahtar || t.startsWith(`${anahtar}_`) || t.includes(anahtar));
}

/**
 * Görev tipine göre sağlayıcı sırası.
 * Özel bağlam: Groq → Gemini → OpenRouter. Diğer görevlerde mevcut sıra + Pollinations.
 * @param {string} gorevTipi
 * @param {{ groq?: boolean, gemini?: boolean, openrouter?: boolean }} durum
 * @returns {string[]}
 */
export function saglayiciZinciri(gorevTipi, durum) {
  const ozel = ozelBaglamGoreviMi(gorevTipi);
  const sira = [];
  if (ozel || gorevTipi === 'hizli_sohbet') {
    if (durum.groq) sira.push('groq');
    if (durum.gemini) sira.push('gemini');
    if (durum.openrouter) sira.push('openrouter');
  } else {
    if (durum.gemini) sira.push('gemini');
    if (durum.groq) sira.push('groq');
    if (durum.openrouter) sira.push('openrouter');
  }
  if (!ozel) sira.push('pollinations');
  return sira;
}

/** Sınıflandırıcı yolu: düşük sıcaklık, şema zorlaması. */
export const SINIFLANDIRMA_SICAKLIK = 0.1;

function jsonFormatDenemeleri(jsonSema) {
  if (!jsonSema?.schema) return [undefined];
  const ad = String(jsonSema.name || 'golge_sinif').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'golge_sinif';
  return [
    { type: 'json_schema', json_schema: { name: ad, strict: true, schema: jsonSema.schema } },
    { type: 'json_object' }
  ];
}

function geminiSemasi(jsonSema) {
  const kok = jsonSema?.schema;
  if (!kok) return null;
  const TIP = { object: 'OBJECT', array: 'ARRAY', string: 'STRING', integer: 'INTEGER', number: 'NUMBER', boolean: 'BOOLEAN' };
  const cevir = (node) => {
    if (!node || typeof node !== 'object') return { type: 'STRING' };
    const out = { type: TIP[node.type] || 'STRING' };
    if (node.type === 'object' && node.properties) {
      out.properties = {};
      for (const [anahtar, deger] of Object.entries(node.properties)) out.properties[anahtar] = cevir(deger);
      if (Array.isArray(node.required) && node.required.length) out.required = node.required;
    }
    if (node.type === 'array' && node.items) out.items = cevir(node.items);
    return out;
  };
  return cevir(kok);
}

/**
 * Sınıflandırma isteğinde persona ve ortak hafıza bağlanmaz.
 * @returns {{ sistem: string, temperature: number, ogrenme: boolean }}
 */
export function siniflandirmaBaglami({ system = '', jsonSema = null, siniflandir = false, userId = 'anon', userName = 'Samuray', prompt = '' } = {}) {
  if (siniflandir) {
    let sistem = String(system || '');
    if (jsonSema?.schema) {
      sistem += `\n\nYanıtın tek bir JSON nesnesi olsun ve şu şemaya uy:\n${JSON.stringify(jsonSema.schema)}`;
    }
    return { sistem, temperature: SINIFLANDIRMA_SICAKLIK, ogrenme: false };
  }
  const ortakBaglam = ortakHafizaBaglamiGetir({ userId, userName, prompt, ekBaglam: system });
  const sistem = system ? `${ortakBaglam}\n\n${system}` : ortakBaglam;
  return { sistem, temperature: 0.7, ogrenme: true };
}

/**
 * Sınıflandırıcı çıktısında [ÖĞRENİLDİ] taraması ve hafıza yazımı kapalıdır.
 * @returns {string}
 */
export function modelCiktisiniIsle(userId, userName, ham, siniflandir = false) {
  if (siniflandir) return String(ham ?? '');
  const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, ham);
  return ciktiyiDenetle(temizMetin);
}

/**
 * Göreve göre en uygun yapay zekayı akıllıca seçer, hata durumunda sıradakine otomatik geçer.
 * Sohbet yolu merkezi ortak hafızayı kullanır. siniflandir:true yolu persona, hafıza ve öğrenme yazımı kullanmaz.
 *
 * @param {Object} secenekler
 * @param {string} secenekler.prompt Kullanıcı girdisi
 * @param {string} [secenekler.system] Sistem talimatı
 * @param {'hizli_sohbet'|'derin_analiz'|'yaratici'|'varsayilan'|'golge_goz'|'moderasyon'|'ozel_baglam'} [secenekler.gorevTipi]
 * @param {string} [secenekler.userId]
 * @param {string} [secenekler.userName]
 * @param {boolean} [secenekler.siniflandir] Lean JSON sınıflandırıcı: hafıza/persona yok, düşük sıcaklık
 * @param {{ name?: string, schema?: object }} [secenekler.jsonSema]
 * @returns {Promise<{ metin: string, saglayici: string }>}
 */
export async function akilliAiUret({ prompt, system = '', gorevTipi = 'varsayilan', userId = 'anon', userName = 'Samuray', siniflandir = false, jsonSema = null }) {
  const butce = butceKontrolcusu();
  try {
    const durum = saglayiciDurumu();
    const etkinGorev = siniflandir && !ozelBaglamGoreviMi(gorevTipi) ? 'golge_goz' : gorevTipi;
    const ozel = ozelBaglamGoreviMi(etkinGorev);
    const saglayiciSirasi = saglayiciZinciri(etkinGorev, durum);
    const baglam = siniflandirmaBaglami({
      system,
      jsonSema: siniflandir ? jsonSema : null,
      siniflandir,
      userId,
      userName,
      prompt
    });
    const nihaiSistem = baglam.sistem;
    const uretSecenek = { temperature: baglam.temperature, jsonSema: siniflandir ? jsonSema : null };
    const geminiSema = siniflandir ? geminiSemasi(jsonSema) : null;

    const hatalar = [];

    for (const saglayici of saglayiciSirasi) {
      if (butce.doldu()) {
        butceAsildiLogla(`görev=${etkinGorev}`);
        return { metin: '', saglayici: '', hata: 'zaman_butcesi' };
      }
      try {
        if (saglayici === 'gemini') {
          const { parts } = await geminiUret({
            systemInstruction: siniflandir ? nihaiSistem : `${nihaiSistem}\n\n${egitimBaglami(null, userId, prompt)}`,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            userId,
            maxOutputTokens: siniflandir ? 1500 : 1000,
            temperature: baglam.temperature,
            signal: butce.signal,
            zamanAsimiMs: SAGLAYICI_TIMEOUT_MS,
            ...(geminiSema ? { responseMimeType: 'application/json', responseSchema: geminiSema } : {})
          });
          const ham = parts?.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
          if (ham) {
            say('gemini', true);
            if (ozel) console.info(`[AI Router] görev=${etkinGorev} sağlayıcı=Gemini`);
            return { metin: modelCiktisiniIsle(userId, userName, ham, siniflandir), saglayici: 'Gemini' };
          }
        } else if (saglayici === 'groq') {
          const metin = await groqMetinUret(prompt, nihaiSistem, butce.signal, uretSecenek);
          if (metin) {
            say('groq', true);
            if (ozel) console.info(`[AI Router] görev=${etkinGorev} sağlayıcı=Groq`);
            return { metin: modelCiktisiniIsle(userId, userName, metin, siniflandir), saglayici: 'Groq' };
          }
        } else if (saglayici === 'openrouter') {
          const metin = await openRouterMetinUret(prompt, nihaiSistem, null, butce.signal, uretSecenek);
          if (metin) {
            say('openrouter', true);
            if (ozel) console.info(`[AI Router] görev=${etkinGorev} sağlayıcı=OpenRouter`);
            return { metin: modelCiktisiniIsle(userId, userName, metin, siniflandir), saglayici: 'OpenRouter' };
          }
        } else if (saglayici === 'pollinations') {
          if (ozel) continue;
          const metin = await pollinationsMetinUret(prompt, nihaiSistem, butce.signal);
          if (metin) {
            say('pollinations', true);
            return { metin: modelCiktisiniIsle(userId, userName, metin, siniflandir), saglayici: 'Pollinations AI (Ücretsiz)' };
          }
        }
      } catch (err) {
        if (butce.doldu()) {
          butceAsildiLogla(`görev=${etkinGorev}`);
          return { metin: '', saglayici: '', hata: 'zaman_butcesi' };
        }
        say(saglayici, false, err.message);
        hatalar.push(`[${saglayici}]: ${err.message}`);
        // Sessizce sıradaki yedek yapay zekaya geç!
        continue;
      }
    }

    if (butce.doldu()) {
      butceAsildiLogla(`görev=${etkinGorev}`);
      return { metin: '', saglayici: '', hata: 'zaman_butcesi' };
    }

    if (ozel) {
      console.warn(`[AI Router] görev=${etkinGorev} güvenli zincir tükendi; Pollinations atlandı.`);
    }

    throw new Error(`Tüm yapay zeka servisleri başarısız oldu:\n${hatalar.join('\n')}`);
  } finally {
    butce.kapat();
  }
}

/**
 * Pollinations AI ile %100 Ücretsiz Görsel Üretimi
 * @param {Object} secenekler
 * @param {string} secenekler.prompt
 * @param {number} [secenekler.genislik]
 * @param {number} [secenekler.yukseklik]
 * @param {number} [secenekler.seed]
 * @returns {string} Görsel URL'i
 */
export function gorselUrlUret({ prompt, genislik = 1024, yukseklik = 1024, seed = null }) {
  const rnd = seed || Math.floor(Math.random() * 1000000);
  const cleanPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${genislik}&height=${yukseklik}&seed=${rnd}&nologo=true&enhance=true`;
}

/**
 * Belirli bir Groq modelini doğrudan çağırır
 */
async function groqTekModelUret(prompt, systemInstruction = '', model = 'openai/gpt-oss-120b', butceSinyali = null) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY yok');

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
    }),
    signal: istekSinyali(butceSinyali)
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Groq HTTP ${res.status}`);
  }

  const data = await res.json();
  const icerik = data.choices?.[0]?.message?.content?.trim();
  if (!icerik) throw new Error('Groq modelinden yanıt alınamadı');
  return icerik;
}

/**
 * Kullanıcı girdisinden veya doğal dilden model kodunu çözümler
 * @param {string} girdi 
 * @returns {string}
 */
export function modelKoduCozumle(girdi = '') {
  const t = String(girdi || '').toLowerCase().trim();
  if (!t || t === 'auto' || t === 'oto' || t === 'otomatik' || t === 'default') return 'auto';
  if (t.includes('gemini') || t.includes('google')) return 'gemini';
  if (t.includes('qwen')) return 'groq_qwen';
  if (t.includes('groq') || t.includes('120b') || t.includes('gpt-oss')) return 'groq_120b';
  if (t.includes('deepseek') || t.includes('openrouter') || t.includes('llama')) return 'openrouter_free';
  if (t.includes('pollinations') || t.includes('bedava') || t.includes('ücretsiz') || t.includes('ucretsiz')) return 'pollinations';
  return 'auto';
}

/**
 * Kullanılabilir tüm AI modellerinin listesi ve detayları
 */
export const DESTEKLENEN_MODELLER = [
  { id: 'auto', ad: 'Otomatik (Kage Akıllı Yönlendirme)', aciklama: 'Soru tipine göre en uygun motoru seçer.', saglayici: 'Hibrit Mesh', emoji: '🤖' },
  { id: 'gemini', ad: 'Google Gemini 3.5 Flash', aciklama: 'Derin analiz, samuray hafızası ve zeka.', saglayici: 'Google AI', emoji: '💎' },
  { id: 'groq_120b', ad: 'Groq GPT-OSS-120B', aciklama: 'Devasa parametre ve ışık hızında yanıt (~0.4s).', saglayici: 'Groq Cloud', emoji: '⚡' },
  { id: 'groq_qwen', ad: 'Groq Qwen 27B', aciklama: 'Akıcı, çok dilli hızlı sohbet modeli.', saglayici: 'Groq Cloud', emoji: '⚡' },
  { id: 'openrouter_free', ad: 'OpenRouter (DeepSeek / Llama)', aciklama: 'Açık kaynaklı en popüler modeller havuzu.', saglayici: 'OpenRouter', emoji: '🌀' },
  { id: 'pollinations', ad: 'Pollinations AI (%100 Ücretsiz)', aciklama: 'Limitsiz, anahtarsız açık yapay zeka.', saglayici: 'Pollinations', emoji: '🌸' }
];

/**
 * İstenen belirli bir yapay zeka modeliyle doğrudan konuşma sağlar.
 * Hangi model seçilirse seçilsin MERKEZİ ORTAK HAFIZA korunur ve kullanıcı asla unutulmaz!
 * 
 * @param {Object} secenekler
 * @param {string} secenekler.prompt
 * @param {string} [secenekler.system]
 * @param {string} [secenekler.modelKodu] 'auto' | 'gemini' | 'groq_120b' | 'groq_qwen' | 'openrouter_free' | 'pollinations'
 * @param {string} [secenekler.userId]
 * @param {string} [secenekler.userName]
 * @returns {Promise<{ metin: string, model: string, sureMs: number }>}
 */
export async function belirliModelUret({ prompt, system = '', modelKodu = 'auto', userId = 'anon', userName = 'Samuray' }) {
  const baslangic = Date.now();
  const cozulmusKod = modelKoduCozumle(modelKodu);

  // Merkezi ortak hafıza bağlamını hazırla
  const ortakBaglam = ortakHafizaBaglamiGetir({ userId, userName, prompt, ekBaglam: system });
  const nihaiSistem = system ? `${ortakBaglam}\n\n${system}` : ortakBaglam;

  let sonucMetin = '';
  let modelAdi = '';

  if (cozulmusKod === 'auto') {
    const res = await akilliAiUret({ prompt, system, userId, userName });
    return {
      metin: res.metin,
      model: res.hata ? 'zaman_butcesi' : `${res.saglayici} (Otomatik)`,
      sureMs: Date.now() - baslangic,
      ...(res.hata ? { hata: res.hata } : {})
    };
  }

  const butce = butceKontrolcusu();
  try {
    if (cozulmusKod === 'gemini') {
      const { parts, model } = await geminiUret({
        systemInstruction: `${nihaiSistem}\n\n${egitimBaglami(null, userId, prompt)}`,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        userId,
        maxOutputTokens: 1500,
        signal: butce.signal,
        zamanAsimiMs: SAGLAYICI_TIMEOUT_MS
      });
      sonucMetin = parts?.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
      modelAdi = `Gemini (${model})`;
      say('gemini', true);
    } else if (cozulmusKod === 'groq_120b') {
      sonucMetin = await groqTekModelUret(prompt, nihaiSistem, 'openai/gpt-oss-120b', butce.signal);
      modelAdi = 'Groq (GPT-OSS-120B)';
      say('groq', true);
    } else if (cozulmusKod === 'groq_qwen') {
      sonucMetin = await groqTekModelUret(prompt, nihaiSistem, 'qwen/qwen3.8-27b', butce.signal);
      modelAdi = 'Groq (Qwen 27B)';
      say('groq', true);
    } else if (cozulmusKod === 'openrouter_free') {
      sonucMetin = await openRouterMetinUret(prompt, nihaiSistem, 'openrouter/free', butce.signal);
      modelAdi = 'OpenRouter (DeepSeek / Llama Free)';
      say('openrouter', true);
    } else if (cozulmusKod === 'pollinations') {
      sonucMetin = await pollinationsMetinUret(prompt, nihaiSistem, butce.signal);
      modelAdi = 'Pollinations AI (%100 Ücretsiz)';
      say('pollinations', true);
    } else {
      const res = await akilliAiUret({ prompt, system, userId, userName });
      return {
        metin: res.metin,
        model: res.hata ? 'zaman_butcesi' : `${res.saglayici} (Otomatik)`,
        sureMs: Date.now() - baslangic,
        ...(res.hata ? { hata: res.hata } : {})
      };
    }

    if (butce.doldu()) {
      butceAsildiLogla(`model=${cozulmusKod}`);
      return { metin: '', model: cozulmusKod, sureMs: Date.now() - baslangic, hata: 'zaman_butcesi' };
    }

    // Model çıktısından öğrenilen bilgileri yakala ve ortak hafızaya kalıcı olarak işle
    const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, sonucMetin);

    return {
      metin: ciktiyiDenetle(temizMetin),
      model: modelAdi,
      sureMs: Date.now() - baslangic
    };
  } catch (err) {
    if (butce.doldu()) {
      butceAsildiLogla(`model=${cozulmusKod}`);
      return { metin: '', model: cozulmusKod, sureMs: Date.now() - baslangic, hata: 'zaman_butcesi' };
    }
    throw err;
  } finally {
    butce.kapat();
  }
}


/**
 * Sağlayıcı adını mesaj altındaki kısa motor etiketine çevirir (Kage-Gemini, Kage-Groq, KageAI ...).
 * @param {string} saglayici
 * @param {boolean} [isAi] Cevap kural tabanlı chatbottan geldiyse false.
 */
export function motorEtiketi(saglayici = '', isAi = true) {
  const s = String(saglayici).toLowerCase();
  if (!isAi || s.includes('kural')) return 'KageAI';
  if (s.includes('gemini') || s.includes('google')) return 'Kage-Gemini';
  if (s.includes('groq')) return 'Kage-Groq';
  if (s.includes('deepseek')) return 'Kage-DeepSeek';
  if (s.includes('openrouter') || s.includes('llama') || s.includes('gemma')) return 'Kage-OpenRouter';
  if (s.includes('pollinations')) return 'Kage-Pollinations';
  return 'KageAI';
}
