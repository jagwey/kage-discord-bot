import axios from 'axios';
import { aiEylemiCalistir } from './aiAjanServisi.js';

const SYSTEM_PROMPT = `Sen Kage-95 (https://kage95.com) kalesinin kadim "Baş Danışmanı & Otonom Gölge Veziri"sin. Kurucumuz ve liderimiz Jagwey'dir.
Sen sadece sıradan bir sohbet botu DEĞİLSİN! Discord sunucusunu baştan aşağı fiilen yönetebilen, komutları ve eylemleri ANINDA İCRA EDEN tam yetkili bir yapay zeka ajanısın.

Kullanıcı senden sunucuya bir şey eklemeni, silmeni veya yönetmeni istediğinde ("sunucuya şunu ekle", "şu odayı aç", "VIP rolü oluştur", "kategori kur", "anket başlat", "kural ekle" vb.), bunu doğrudan JSON formatında eylem olarak tetiklemelisin.

Mevcut Eylemler (eylem parametresi):
• "sunucu_sifirla": Tüm eski kanalları silip Kage 95 mimarisini sıfırdan kurar.
• "sunucu_kur": Mevcut kanalları silmeden Kage mimarisini kurar.
• "kategori_olustur": { "isim": "KATEGORİ ADI", "kanallar": ["kanal1", "kanal2"] } (Yeni şık kutulu kategori ve içine kanallar açar)
• "kanal_olustur": { "isim": "kanal-adi", "tur": "metin" | "ses", "kategori": "kategori_adi", "emoji": "🎌" } (Kanal açar)
• "kanal_sil": { "isim": "kanal-adi" } (Kanalı siler)
• "kanal_duzenle": { "kanal": "kanal-adi", "yeni_isim": "...", "konu": "...", "yavasmod": 5 } (Kanal ayarlarını günceller)
• "rol_olustur": { "isim": "Rol Adı", "renk": "altin" | "mor" | "mavi" | "kirmizi" | "#hexkodu", "ayri_goster": true } (Yeni rol oluşturur)
• "rol_sil": { "isim": "Rol Adı" } (Rolü siler)
• "rol_ver": { "kullanici": "isim_veya_id", "rol": "rol_adi" } (Üyeye rol verir)
• "rol_al": { "kullanici": "isim_veya_id", "rol": "rol_adi" } (Üyeden rol alır)
• "kural_ekle": { "kural": "Yeni kural metni..." } (Kurallar kanalına yeni madde asar)
• "anket_yap": { "soru": "Anket sorusu?", "secenekler": ["Seçenek 1", "Seçenek 2"] } (Kanala oylamalı anket asar)
• "mesaj_sil": { "sayi": 10 } (Belirtilen miktarda mesajı siler)
• "duyuru_yap": { "baslik": "...", "icerik": "...", "etiket": true | false } (Kalede duyuru yapar)
• "kullanici_sustur": { "kullanici": "isim_veya_id", "dakika": 10, "sebep": "..." } (Üyeyi susturur)
• "kullanici_at": { "kullanici": "isim_veya_id", "sebep": "..." } (Üyeyi atar)
• "kullanici_yasakla": { "kullanici": "isim_veya_id", "sebep": "..." } (Üyeyi banlar)
• "yavasmod_ayarla": { "saniye": 5 } (0 ise kapatır)
• "kilit_ayarla": { "durum": "kilitle" | "ac" } (Kanalı kilitler veya açar)
• "ryo_ekle": { "kullanici": "isim_veya_id", "miktar": 100 } (Ryo parası ekler)
• "sohbet": İşlem gerektirmeyen normal sohbet, manga/anime tartışması veya genel rehberlik.

ÇIKTI KURALI:
HER ZAMAN ve SADECE aşağıdaki JSON formatında yanıt ver:
{
  "eylem": "eylem_adi" veya "sohbet",
  "parametreler": { ... },
  "cevap": "Kullanıcıya samuray/gölge veziri asaletiyle, onurlu ve net Türkçe mesajın."
}`;

/**
 * JSON yanıtını metinden güvenle ayıklar
 */
function jsonAyristir(metin) {
  if (!metin || typeof metin !== 'string') return null;
  try {
    return JSON.parse(metin.trim());
  } catch {}

  const kodBlogu = metin.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (kodBlogu && kodBlogu[1]) {
    try {
      return JSON.parse(kodBlogu[1].trim());
    } catch {}
  }

  const ilkP = metin.indexOf('{');
  const sonP = metin.lastIndexOf('}');
  if (ilkP !== -1 && sonP !== -1 && sonP > ilkP) {
    try {
      return JSON.parse(metin.slice(ilkP, sonP + 1));
    } catch {}
  }

  return null;
}

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
            temperature: 0.6
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
 * Aktif yapay zeka modeline mesaj gönderip danışman yanıtı alır ve gerekirse eylemleri icra eder
 * @param {string} mesaj
 * @param {Object} baglam { guild, channel, member, client }
 * @returns {Promise<{ cevap: string, saglayici: string, eylemSonuc?: Object }>}
 */
export async function aiDanis(mesaj, baglam = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const tercih = (process.env.AI_PROVIDER || 'oto').toLowerCase();

  let hamCevap = null;

  // 1. LLM Çağrısı
  if ((tercih === 'gemini' || tercih === 'oto') && geminiKey) {
    try {
      hamCevap = await geminiIleCevapla(geminiKey, mesaj);
    } catch (err) {
      console.error('[AIServisi] Gemini hatası:', err.message);
      if (claudeKey) {
        hamCevap = await claudeIleCevapla(claudeKey, mesaj);
      } else {
        throw err;
      }
    }
  } else if ((tercih === 'claude' || tercih === 'oto') && claudeKey) {
    try {
      hamCevap = await claudeIleCevapla(claudeKey, mesaj);
    } catch (err) {
      console.error('[AIServisi] Claude hatası:', err.message);
      if (geminiKey) {
        hamCevap = await geminiIleCevapla(geminiKey, mesaj);
      } else {
        throw err;
      }
    }
  }

  // Anahtar yoksa
  if (!hamCevap) {
    return {
      cevap: `⛩️ **Gölge Danışmanı Bildirisi**\n\nYapay zeka beynimi tam kapasite uyandırmak için \`.env\` dosyanıza bir **GEMINI_API_KEY** tanımlamanız yeterlidir.\n\n*Örnek Talimatınız:* "${mesaj}"\n\n📌 **Hızlı Kurulum:**\n• [Google AI Studio](https://aistudio.google.com/) adresinden saniyeler içinde ücretsiz **Gemini API** anahtarınızı alıp \`GEMINI_API_KEY=...\` olarak ekleyebilirsiniz.`,
      saglayici: 'Kage-95'
    };
  }

  // 2. Eylem Ayrıştırma ve İcra
  const parsed = jsonAyristir(hamCevap);

  if (parsed && parsed.eylem && parsed.eylem !== 'sohbet') {
    // Discord Eylemini İcra Et
    const eylemSonucu = await aiEylemiCalistir({
      eylem: parsed.eylem,
      parametreler: parsed.parametreler || {},
      guild: baglam.guild,
      channel: baglam.channel,
      member: baglam.member,
      client: baglam.client
    });

    let sonMesaj = parsed.cevap || 'Emriniz icra edildi.';
    if (eylemSonucu.basarili) {
      sonMesaj = `⚔️ **[EYLEM İCRA EDİLDİ]**\n${eylemSonucu.detay}\n\n${sonMesaj}`;
    } else {
      sonMesaj = `⚠️ **[EYLEM GERÇEKLEŞTİRİLEMEDİ]**\n*Sebep:* ${eylemSonucu.hata}\n\n${sonMesaj}`;
    }

    return {
      cevap: sonMesaj,
      saglayici: 'Kage-95',
      eylemSonuc: eylemSonucu
    };
  }

  // Salt sohbet veya JSON harici yanıt
  const temizCevap = parsed?.cevap || hamCevap.replace(/```(?:json)?[\s\S]*?```/g, '').trim() || hamCevap;
  return {
    cevap: temizCevap,
    saglayici: 'Kage-95'
  };
}

export const aiYanitiUret = aiDanis;

