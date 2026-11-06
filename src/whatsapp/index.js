import 'dotenv/config';
import { sunucuOlustur } from './sunucu.js';

const KAPALI = 76;
const EKSIK = 77;

function bayrak(deger) {
  return ['1', 'true', 'evet', 'on'].includes(String(deger || '').trim().toLowerCase());
}

if (!bayrak(process.env.WHATSAPP_ENABLED)) {
  console.log('[WhatsApp] WHATSAPP_ENABLED kapalı. Süreç durdu.');
  process.exit(KAPALI);
}

const zorunlu = ['WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
const eksik = zorunlu.filter(anahtar => !String(process.env[anahtar] || '').trim());
if (eksik.length) {
  console.error(`[WhatsApp] Eksik ortam değişkeni: ${eksik.join(', ')}`);
  process.exit(EKSIK);
}

const port = Number(process.env.WHATSAPP_PORT || 3100);
if (!Number.isFinite(port) || port <= 0) {
  console.error('[WhatsApp] WHATSAPP_PORT geçersiz.');
  process.exit(EKSIK);
}

// Yalnızca HTTP webhook. Discord Gateway bu süreçte açılmaz; köprü REST kullanır.
const sunucu = sunucuOlustur();
sunucu.listen(port, '0.0.0.0', () => {
  console.log(`[WhatsApp] Webhook dinleniyor: 0.0.0.0:${port}/webhook`);
});
