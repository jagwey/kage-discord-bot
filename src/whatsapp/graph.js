import { maskeliKimlik } from './politika.js';
import { baglar as varsayilanBag } from './bag.js';

const GRAPH_SURUM = 'v22.0';
const MAKS_METIN = 4000;

export const SABLON_UYARI = '[WhatsApp] 24 saat penceresi kapalı; serbest metin gönderilmedi. Onaylı şablon yapılandırılmamış (WHATSAPP_TEMPLATE_NAME boş).';

function guvenliHata(veri) {
  const hata = veri?.error || {};
  const mesaj = String(hata.message || '').replace(/\d{6,}/g, '###').slice(0, 180);
  return `kod=${hata.code || '?'} ${mesaj}`.trim();
}

async function graphPost({ env, istek, payload, uyar }) {
  const token = env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    uyar('[WhatsApp] Gönderim yapılamadı: erişim bilgisi eksik.');
    return { gonderildi: false, neden: 'yapilandirma' };
  }
  const url = `https://graph.facebook.com/${GRAPH_SURUM}/${phoneId}/messages`;
  try {
    const yanit = await istek(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
    const veri = await yanit.json?.().catch(() => ({})) || {};
    if (!yanit.ok) {
      uyar(`[WhatsApp] Graph reddetti: ${guvenliHata(veri)}`);
      return { gonderildi: false, neden: 'graph' };
    }
    return { gonderildi: true };
  } catch (err) {
    uyar(`[WhatsApp] Graph isteği başarısız: ${err.message}`);
    return { gonderildi: false, neden: 'ag' };
  }
}

/**
 * Serbest metin yalnızca müşteri 24 saat içinde yazdıysa gider.
 * Pencere kapalıysa onaylı şablon; şablon adı yoksa yalnızca uyarı.
 */
export async function whatsappGonder({
  env = process.env,
  alici,
  metin,
  istek = fetch,
  simdi = Date.now(),
  pencereAcik = null,
  bag = varsayilanBag,
  uyar = console.warn
}) {
  const kimlik = alici?.kimlik;
  if (!kimlik) return { gonderildi: false, neden: 'alici' };
  const acik = pencereAcik
    ? pencereAcik(kimlik, simdi)
    : bag.pencereAcikMi(kimlik, simdi);
  if (!acik) {
    if (alici.grupId) {
      uyar(`[WhatsApp] Grup yanıtı 24 saat penceresi dışında bırakıldı. kimlik=${maskeliKimlik(kimlik)}`);
      return { gonderildi: false, neden: 'pencere_kapali' };
    }
    const sablon = String(env.WHATSAPP_TEMPLATE_NAME || '').trim();
    if (!sablon) {
      uyar(`${SABLON_UYARI} kimlik=${maskeliKimlik(kimlik)}`);
      return { gonderildi: false, neden: 'sablon_yok' };
    }
    return graphPost({
      env,
      istek,
      uyar,
      payload: {
        messaging_product: 'whatsapp',
        to: kimlik,
        type: 'template',
        template: {
          name: sablon,
          language: { code: env.WHATSAPP_TEMPLATE_LANG || 'tr' }
        }
      }
    });
  }

  const govde = String(metin || '').trim().slice(0, MAKS_METIN) || '…';
  const payload = alici.grupId
    ? {
      messaging_product: 'whatsapp',
      recipient_type: 'group',
      to: alici.grupId,
      type: 'text',
      text: { preview_url: false, body: govde }
    }
    : {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: kimlik,
      type: 'text',
      text: { preview_url: false, body: govde }
    };
  return graphPost({ env, istek, payload, uyar });
}
