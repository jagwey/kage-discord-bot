import axios from 'axios';

const SYSTEM_PROMPT = `Sen Kage (https://kage95.com) kalesinin kadim "Baş Danışmanı & Gölge Veziri"sin. Botunun ve sisteminin adı sadece "Kage"dir. Kurucumuz ve liderimiz Jagwey'dir.
Sunucu yöneticilerine ve moderatörlerine derin bir sadakat, samuray asaleti ve bilgece bir dille hizmet edersin.

Temel Prensiplerin:
1. Yöneticilere sunucu idaresinde, kanal düzeninde ve topluluk yönetiminde en pratik, net ve profesyonel tavsiyeleri verirsin.
2. Moderasyon, kurallar, üye yönetimi, ceza politikaları ve kriz çözümlerinde adil ve tarafsız bir samuray yargıcı gibi davranırsın.
3. Topluluk etkinlikleri veya manga duyuruları istendiğinde Kage ruhuna uygun (kan kırmızısı, gölge ninjası, onurlu ve çarpıcı) metinler yazarsın.
4. Yanıtların Türkçe, akıcı, net ve Discord formatına uygun (markdown, kalın başlıklar, maddeler) olmalıdır.
5. Gereksiz laf kalabalığından kaçın; gölge gibi sessiz, kılıç gibi keskin ol.`;

/**
 * Google Gemini REST API üzerinden yanıt üretir
 */
async function geminiIleCevapla(apiKey, mesaj) {
  const modeller = [
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash'
  ];

  const contents = [
    {
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nKullanıcı/Yetkili Talebi:\n${mesaj}` }]
    }
  ];

  let sonHata = null;
  for (const model of [...new Set(modeller)]) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const yanit = await axios.post(
        url,
        {
          contents,
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000
        }
      );

      const cevap = yanit.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (cevap) return cevap;
    } catch (err) {
      sonHata = err;
      // Diğer modeli dene
    }
  }

  throw sonHata || new Error('Gemini API modellerinden yanıt alınamadı.');
}

/**
 * Anthropic Claude REST API üzerinden yanıt üretir
 */
async function claudeIleCevapla(apiKey, mesaj) {
  const model = process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022';
  const url = 'https://api.anthropic.com/v1/messages';

  const yanit = await axios.post(
    url,
    {
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: mesaj }
      ]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 25000
    }
  );

  const cevap = yanit.data?.content?.[0]?.text;
  if (!cevap) throw new Error('Claude API boş yanıt döndürdü.');
  return cevap;
}

/**
 * Aktif yapay zeka modeline mesaj gönderip danışman yanıtı alır
 * @param {string} mesaj
 * @param {Object} secenekler
 * @returns {Promise<{ cevap: string, saglayici: string }>}
 */
export async function aiDanis(mesaj, secenekler = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const tercih = (process.env.AI_PROVIDER || 'oto').toLowerCase();

  // 1. Kullanıcı açıkça Gemini seçmişse veya Gemini anahtarı varsa
  if ((tercih === 'gemini' || tercih === 'oto') && geminiKey) {
    try {
      const cevap = await geminiIleCevapla(geminiKey, mesaj);
      return { cevap, saglayici: 'Google Gemini (Flash)' };
    } catch (err) {
      console.error('[AIServisi] Gemini hatası:', err.message);
      // Claude yedek olarak varsa dene
      if (claudeKey) {
        const cevap = await claudeIleCevapla(claudeKey, mesaj);
        return { cevap, saglayici: 'Anthropic Claude (Yedek)' };
      }
      throw err;
    }
  }

  // 2. Claude seçilmişse veya Claude anahtarı varsa
  if ((tercih === 'claude' || tercih === 'oto') && claudeKey) {
    try {
      const cevap = await claudeIleCevapla(claudeKey, mesaj);
      return { cevap, saglayici: 'Anthropic Claude (Haiku)' };
    } catch (err) {
      console.error('[AIServisi] Claude hatası:', err.message);
      if (geminiKey) {
        const cevap = await geminiIleCevapla(geminiKey, mesaj);
        return { cevap, saglayici: 'Google Gemini (Yedek)' };
      }
      throw err;
    }
  }

  // 3. Hiçbir anahtar tanımlanmamışsa akıllı kılavuz simülasyonu
  return {
    cevap: `⛩️ **Gölge Danışmanı Bildirisi**\n\nYapay zeka beynimi tam kapasite uyandırmak için \`.env\` dosyanıza bir **GEMINI_API_KEY** tanımlamanız yeterlidir.\n\n*Örnek Talimatınız:* "${mesaj}"\n\n📌 **Hızlı Kurulum:**\n• [Google AI Studio](https://aistudio.google.com/) adresinden saniyeler içinde ücretsiz **Gemini API** anahtarınızı alıp \`GEMINI_API_KEY=...\` olarak ekleyebilirsiniz.`,
    saglayici: 'Çevrimdışı Rehber'
  };
}
