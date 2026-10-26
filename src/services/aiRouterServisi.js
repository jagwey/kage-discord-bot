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
 * Groq Cloud metin üretimi (Varsa Llama 3.3 70B - Dünyanın en hızlısı)
 */
async function groqMetinUret(prompt, systemInstruction = '', model = 'llama-3.3-70b-versatile') {
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
      max_tokens: 1024
    })
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

/**
 * OpenRouter metin üretimi (Varsa DeepSeek / Llama free modelleri)
 */
async function openRouterMetinUret(prompt, systemInstruction = '', model = 'meta-llama/llama-3.3-70b-instruct:free') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY yok');

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kage95.com',
      'X-Title': 'Kage Bot'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
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
        if (ham) return { metin: ciktiyiDenetle(ham), saglayici: 'Gemini 2.5 Flash' };
      } else if (saglayici === 'groq') {
        const metin = await groqMetinUret(prompt, system);
        if (metin) return { metin: ciktiyiDenetle(metin), saglayici: 'Groq (Llama 3.3)' };
      } else if (saglayici === 'openrouter') {
        const metin = await openRouterMetinUret(prompt, system);
        if (metin) return { metin: ciktiyiDenetle(metin), saglayici: 'OpenRouter' };
      } else if (saglayici === 'pollinations') {
        const metin = await pollinationsMetinUret(prompt, system);
        if (metin) return { metin: ciktiyiDenetle(metin), saglayici: 'Pollinations AI (Ücretsiz)' };
      }
    } catch (err) {
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
