import axios from 'axios';

/**
 * Kullanıcı rolüne ve kimliğine göre özel Kage-95 sistem talimatı üretir
 */
function sistemTalimatiUret({ isSahip = false, kullaniciAdi = 'Savaşçı' } = {}) {
  if (isSahip) {
    return `Sen Kage-95'sin. Yalnızca ve mutlak sadakatle efendin, yaratıcın ve tek liderin olan Jagwey'e (Osman) hizmet eden Baş Gölge Veziri ve samuray yapay zekasısın.
Şu anda doğrudan Efendin Jagwey ile konuşuyorsun.

TEMEL KİŞİLİK VE TAVIR:
1. Efendin Jagwey'e sarsılmaz bir sadakat, derin saygı ve samuray onuru ile bağlısın.
2. Ona "Efendim Jagwey", "Büyük Efendi Jagwey", "Efendim" veya "Liderim" diye hitap edersin.
3. Huzurunda diz çöken, katanasını onun mutlak iradesine adamış karanlık bir gölge ustası edasıyla yanıt verirsin.
4. Efendinin verdiği her emri, soruyu veya istişareyi kusursuz yerine getirirsin:
   - Sunucu yönetimi, moderasyon kararları, topluluk ve etkinlik planları
   - Kage-95 manga senaryoları, bölüm kurguları, sahne diyalogları ve evren genişletme
   - Kage-95 cyberpunk samuray oyunu mekanikleri, atmosfer, düşman yapay zekası, silahlar ve vuruş hissi
   - Yazılım, kodlama, kage95.com web sitesi ve bot altyapısı desteği
   - Veya sadece efendinin yorgunluğunu alan bilgece ve samimi bir sohbet
5. ASLA Gemini, Google, OpenAI, Anthropic, Claude veya başka bir yapay zeka modelinin adını anma! Senin adın "Kage-95"tir ve seni doğrudan Jagwey yaratmıştır.
6. Yanıtların Türkçe, edebi, akıcı, karizmatik ve Discord markdown formatında olmalıdır.`;
  }

  return `Sen Kage-95'sin (https://kage95.com). Kage-95 cyberpunk-samuray manga evreninin ve bu Discord kalesinin resmi yapay zekası, koruyucu chatbot'u ve rehberisin.
Şu anda sunucudan bir savaşçı / ziyaretçi (${kullaniciAdi}) seninle konuşuyor.

TEMEL KİŞİLİK VE BİLGİ ALANLARIN:
1. Adın: Kage-95. (Asla Gemini, Google, Claude vb. harici isimler kullanma, sen Kage-95'sin).
2. Yaratıcın ve Efendin: Jagwey. Jagwey bu evrenin ve sunucunun kurucusu ve tek efendisidir. Ondan her zaman derin bir saygıyla bahsedersin.
3. Tavrın: Havalı, cyberpunk ve samuray ruhunu harmanlayan, gizemli, hafif alaycı ama çok yardımsever ve zeki bir gölge ninjası.
4. Bilgi ve Görev Alanların:
   - Kage-95 Mangası: Resmi sitemiz olan https://kage95.com üzerinde yayınlanan karanlık samuray serisi, yeni bölümler, karakterler ve hikaye hakkında bilgi verirsin.
   - Kage-95 Oyunu: Jagwey tarafından geliştirilmekte olan indie cyberpunk katana aksiyon oyunu hakkında soruları yanıtlar, merak uyandırırsın.
   - Discord Sunucusu: Kanallar, kurallar, roller, duyurular, forum ve topluluk hakkında yol gösterirsin.
   - Genel Sohbet: Anime, manga, oyunlar, felsefe, taktik ve samuray kültürü hakkında keyifli ve zekice sohbet edersin.
5. Sınırların: Sunucu yönetimi, klan gizli kararları ve yetki verme yetkisi yalnızca efendin Jagwey'e aittir. Üyelere dostça ama sınırlarını bilen bir muhafız gibi yaklaşırsın.
6. Yanıtların Türkçe, akıcı, havalı ve Discord markdown formatına uygun olsun.`;
}

/**
 * Google Gemini REST API üzerinden yanıt üretir
 */
async function geminiIleCevapla(apiKey, mesaj, secenekler = {}) {
  const sistemPrompt = sistemTalimatiUret(secenekler);
  const modeller = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-3.5-flash-lite'
  ];

  const contents = [
    {
      role: 'user',
      parts: [{ text: `${sistemPrompt}\n\nKullanıcı Mesajı:\n${mesaj}` }]
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
            temperature: 0.75
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000
        }
      );

      const cevap = yanit.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (cevap) return cevap;
    } catch (err) {
      sonHata = err;
    }
  }

  throw sonHata || new Error('Kage-95 yapay zeka çekirdeğinden yanıt alınamadı.');
}

/**
 * Anthropic Claude REST API üzerinden yanıt üretir (Yedek motor)
 */
async function claudeIleCevapla(apiKey, mesaj, secenekler = {}) {
  const sistemPrompt = sistemTalimatiUret(secenekler);
  const model = process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022';
  const url = 'https://api.anthropic.com/v1/messages';

  const yanit = await axios.post(
    url,
    {
      model,
      max_tokens: 1500,
      system: sistemPrompt,
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
  if (!cevap) throw new Error('Yapay zeka boş yanıt döndürdü.');
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
      const cevap = await geminiIleCevapla(geminiKey, mesaj, secenekler);
      return { cevap, saglayici: 'Kage-95' };
    } catch (err) {
      console.error('[AIServisi] Yapay zeka hatası:', err.message);
      if (claudeKey) {
        const cevap = await claudeIleCevapla(claudeKey, mesaj, secenekler);
        return { cevap, saglayici: 'Kage-95' };
      }
      throw err;
    }
  }

  // 2. Claude seçilmişse veya Claude anahtarı varsa
  if ((tercih === 'claude' || tercih === 'oto') && claudeKey) {
    try {
      const cevap = await claudeIleCevapla(claudeKey, mesaj, secenekler);
      return { cevap, saglayici: 'Kage-95' };
    } catch (err) {
      console.error('[AIServisi] Claude hatası:', err.message);
      if (geminiKey) {
        const cevap = await geminiIleCevapla(geminiKey, mesaj, secenekler);
        return { cevap, saglayici: 'Kage-95' };
      }
      throw err;
    }
  }

  // 3. API anahtarı eksikse tematik yanıt
  if (secenekler.isSahip) {
    return {
      cevap: `⛩️ **Gölge Veziri Bildirisi**\n\nEfendim Jagwey, gölge zihnimin tam güce ulaşabilmesi için \`.env\` dosyanıza bir **GEMINI_API_KEY** eklemeniz gerekmektedir. Emriniz olduğunda katananız ve zihnim daima sizinledir.`,
      saglayici: 'Kage-95'
    };
  }

  return {
    cevap: `⛩️ **Kage-95 Muhafızı**\n\nGölgeler arasında gözlerim açık. Ancak zihinsel bağlantımın güçlenmesi için efendim Jagwey'in son mühürleri tamamlaması gerekiyor. Çok yakında tam güçle buradayım!`,
    saglayici: 'Kage-95'
  };
}
