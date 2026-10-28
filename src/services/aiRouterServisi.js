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
async function groqMetinUret(prompt, systemInstruction = '', butceSinyali = null) {
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

  let sonHata = null;

  for (const model of denenecekModeller) {
    if (butceSinyali?.aborted) throw new Error('Toplam yapay zeka bütçesi aşıldı.');
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
          temperature: 0.7,
          // gpt-oss düşünme token'larını da bu sınırdan harcar; düşükse content boş döner.
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
      if (icerik) return icerik;
    } catch (err) {
      if (butceSinyali?.aborted) throw err;
      sonHata = err;
      continue;
    }
  }

  throw sonHata || new Error('Groq modelleri yanıt veremedi');
}

/**
 * OpenRouter metin üretimi (DeepSeek -> Llama -> Gemini -> OpenRouter Free sıralı fallback)
 */
async function openRouterMetinUret(prompt, systemInstruction = '', ozelModel = null, butceSinyali = null) {
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

  let sonHata = null;

  for (const model of denenecekModeller) {
    if (butceSinyali?.aborted) throw new Error('Toplam yapay zeka bütçesi aşıldı.');
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
          temperature: 0.7,
          max_tokens: 1500
        }),
        signal: istekSinyali(butceSinyali)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error('HTTP ' + res.status + ': ' + errText.slice(0, 100));
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      let yanit = (choice?.message?.content || choice?.message?.reasoning || '').trim();

      // DeepSeek R1 ve benzeri düşünce bloklarını (<think>...</think>) temizle
      yanit = yanit.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      if (yanit) {
        return yanit;
      }
    } catch (err) {
      if (butceSinyali?.aborted) throw err;
      sonHata = err;
      console.warn(`[AI Router] OpenRouter modeli ${model} hata: ${err.message}`);
    }
  }

  throw sonHata || new Error('OpenRouter modelleri yanıt veremedi');
}

/**
 * Göreve göre en uygun yapay zekayı akıllıca seçer, hata durumunda sıradakine otomatik geçer.
 * Tüm modeller merkezi ortak hafızayı (kage_hafiza.json) kullanır ve kullanıcıyı hatırlar.
 * 
 * @param {Object} secenekler
 * @param {string} secenekler.prompt Kullanıcı girdisi
 * @param {string} [secenekler.system] Sistem talimatı
 * @param {'hizli_sohbet'|'derin_analiz'|'yaratici'|'varsayilan'} [secenekler.gorevTipi]
 * @param {string} [secenekler.userId]
 * @param {string} [secenekler.userName]
 * @returns {Promise<{ metin: string, saglayici: string }>}
 */
export async function akilliAiUret({ prompt, system = '', gorevTipi = 'varsayilan', userId = 'anon', userName = 'Samuray' }) {
  const butce = butceKontrolcusu();
  try {
    const durum = saglayiciDurumu();
    const saglayiciSirasi = [];

    // Merkezi ortak hafıza bağlamını hazırla
    const ortakBaglam = ortakHafizaBaglamiGetir({ userId, userName, prompt, ekBaglam: system });
    const nihaiSistem = system ? `${ortakBaglam}\n\n${system}` : ortakBaglam;

    // Göreve göre öncelik sıralaması belirle
    if (gorevTipi === 'hizli_sohbet') {
      if (durum.groq) saglayiciSirasi.push('groq');
      if (durum.gemini) saglayiciSirasi.push('gemini');
      if (durum.openrouter) saglayiciSirasi.push('openrouter');
      saglayiciSirasi.push('pollinations');
    } else {
      // derin analiz / varsayılan
      if (durum.gemini) saglayiciSirasi.push('gemini');
      if (durum.groq) saglayiciSirasi.push('groq');
      if (durum.openrouter) saglayiciSirasi.push('openrouter');
      saglayiciSirasi.push('pollinations');
    }

    const hatalar = [];

    for (const saglayici of saglayiciSirasi) {
      if (butce.doldu()) {
        butceAsildiLogla(`görev=${gorevTipi}`);
        return { metin: '', saglayici: '', hata: 'zaman_butcesi' };
      }
      try {
        if (saglayici === 'gemini') {
          const { parts } = await geminiUret({
            systemInstruction: `${nihaiSistem}\n\n${egitimBaglami(null, userId, prompt)}`,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            userId,
            maxOutputTokens: 1000,
            signal: butce.signal,
            zamanAsimiMs: SAGLAYICI_TIMEOUT_MS
          });
          const ham = parts?.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
          if (ham) {
            say('gemini', true);
            const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, ham);
            return { metin: ciktiyiDenetle(temizMetin), saglayici: 'Gemini' };
          }
        } else if (saglayici === 'groq') {
          const metin = await groqMetinUret(prompt, nihaiSistem, butce.signal);
          if (metin) {
            say('groq', true);
            const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, metin);
            return { metin: ciktiyiDenetle(temizMetin), saglayici: 'Groq' };
          }
        } else if (saglayici === 'openrouter') {
          const metin = await openRouterMetinUret(prompt, nihaiSistem, null, butce.signal);
          if (metin) {
            say('openrouter', true);
            const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, metin);
            return { metin: ciktiyiDenetle(temizMetin), saglayici: 'OpenRouter' };
          }
        } else if (saglayici === 'pollinations') {
          const metin = await pollinationsMetinUret(prompt, nihaiSistem, butce.signal);
          if (metin) {
            say('pollinations', true);
            const { temizMetin } = ogrenilenleriAyiklaVeKaydet(userId, userName, metin);
            return { metin: ciktiyiDenetle(temizMetin), saglayici: 'Pollinations AI (Ücretsiz)' };
          }
        }
      } catch (err) {
        if (butce.doldu()) {
          butceAsildiLogla(`görev=${gorevTipi}`);
          return { metin: '', saglayici: '', hata: 'zaman_butcesi' };
        }
        say(saglayici, false, err.message);
        hatalar.push(`[${saglayici}]: ${err.message}`);
        // Sessizce sıradaki yedek yapay zekaya geç!
        continue;
      }
    }

    if (butce.doldu()) {
      butceAsildiLogla(`görev=${gorevTipi}`);
      return { metin: '', saglayici: '', hata: 'zaman_butcesi' };
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
