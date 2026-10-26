import { geminiUret, anahtarVarMi as geminiVarMi } from './ai/geminiClient.js';
import { egitimBaglami, ciktiyiDenetle } from './egitimServisi.js';

/**
 * AKILLI ÇOKLU YAPAY ZEKA YÖNLENDİRİCİSİ (AI ROUTER & MESH)
 * 
 * 1. Google Gemini 2.5 Flash (Birincil derin zeka, araç çağırma ve hafıza)
 * 2. Groq Cloud / Llama 3.3 70B (Ultra hızlı metin & sohbet - varsa GROQ_API_KEY)
 * 3. OpenRouter (DeepSeek / Llama :free modelleri - varsa OPENROUTER_API_KEY)
 * 4. Pollinations AI (%100 ÜCRETSİZ, SIFIR KEY - Metin ve Görsel Üretimi)
 */

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
 * Pollinations AI metin üretimi (%100 Ücretsiz, key istemez)
 */
async function pollinationsMetinUret(prompt, systemInstruction = '') {
  const url = 'https://text.pollinations.ai/';
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\nKullanıcı: ${prompt}` : prompt;
  
  const res = await fetch(url + encodeURIComponent(fullPrompt), {
    headers: { 'User-Agent': 'Kage-Bot/2.5 (JagTech)' }
  });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const text = await res.text();
  return text.trim();
}

/**
 * Groq Cloud metin üretimi (GPT-OSS-120B / Llama 3.3 / Qwen - Dünyanın en hızlısı)
 */
async function groqMetinUret(prompt, systemInstruction = '') {
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
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq HTTP ${res.status}`);
      }

      const data = await res.json();
      const icerik = data.choices?.[0]?.message?.content?.trim();
      if (icerik) return icerik;
    } catch (err) {
      sonHata = err;
      continue;
    }
  }

  throw sonHata || new Error('Groq modelleri yanıt veremedi');
}

/**
 * OpenRouter metin üretimi (DeepSeek -> Llama -> Gemini -> OpenRouter Free sıralı fallback)
 */
async function openRouterMetinUret(prompt, systemInstruction = '', ozelModel = null) {
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
        })
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
      sonHata = err;
      console.warn(`[AI Router] OpenRouter modeli ${model} hata: ${err.message}`);
    }
  }

  throw sonHata || new Error('OpenRouter modelleri yanıt veremedi');
}

/**
 * Göreve göre en uygun yapay zekayı akıllıca seçer, hata durumunda sıradakine otomatik geçer.
 * 
 * @param {Object} secenekler
 * @param {string} secenekler.prompt Kullanıcı girdisi
 * @param {string} [secenekler.system] Sistem talimatı
 * @param {'hizli_sohbet'|'derin_analiz'|'yaratici'|'varsayilan'} [secenekler.gorevTipi]
 * @param {string} [secenekler.userId]
 * @returns {Promise<{ metin: string, saglayici: string }>}
 */
export async function akilliAiUret({ prompt, system = '', gorevTipi = 'varsayilan', userId = 'anon' }) {
  const durum = saglayiciDurumu();
  const saglayiciSirasi = [];

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
    try {
      if (saglayici === 'gemini') {
        const { parts } = await geminiUret({
          systemInstruction: system ? `${system}\n\n${egitimBaglami(null, userId, prompt)}` : undefined,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          userId,
          maxOutputTokens: 1000
        });
        const ham = parts?.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
        if (ham) { say('gemini', true); return { metin: ciktiyiDenetle(ham), saglayici: 'Gemini' }; }
      } else if (saglayici === 'groq') {
        const metin = await groqMetinUret(prompt, system);
        if (metin) { say('groq', true); return { metin: ciktiyiDenetle(metin), saglayici: 'Groq' }; }
      } else if (saglayici === 'openrouter') {
        const metin = await openRouterMetinUret(prompt, system);
        if (metin) { say('openrouter', true); return { metin: ciktiyiDenetle(metin), saglayici: 'OpenRouter' }; }
      } else if (saglayici === 'pollinations') {
        const metin = await pollinationsMetinUret(prompt, system);
        if (metin) { say('pollinations', true); return { metin: ciktiyiDenetle(metin), saglayici: 'Pollinations AI (Ücretsiz)' }; }
      }
    } catch (err) {
      say(saglayici, false, err.message);
      hatalar.push(`[${saglayici}]: ${err.message}`);
      // Sessizce sıradaki yedek yapay zekaya geç!
      continue;
    }
  }

  throw new Error(`Tüm yapay zeka servisleri başarısız oldu:\n${hatalar.join('\n')}`);
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
