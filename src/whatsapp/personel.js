import { baglar as varsayilanBag } from './bag.js';
import { whatsappGonder } from './graph.js';

export function kopruMesajiMi(kanalId, hedef = process.env.WHATSAPP_BRIDGE_CHANNEL_ID) {
  return Boolean(hedef) && String(kanalId || '') === String(hedef);
}

/**
 * Köprü kanalındaki personel yanıtını Cloud API ile ilgili hatta iletir.
 * Bot mesajına yanıt veya `!wa <discordId> metin`.
 */
export async function personelKopruYaniti(message, bagim = {}) {
  const bag = bagim.bag || varsayilanBag;
  const gonder = bagim.gonder || (opts => whatsappGonder({
    alici: opts.alici,
    metin: opts.metin,
    env: bagim.env || process.env,
    istek: bagim.istek,
    pencereAcik: bagim.pencereAcik,
    bag
  }));
  const bildir = bagim.bildir || (async (mesaj, metin) => {
    await mesaj.reply?.({ content: metin, allowedMentions: { parse: [] } });
  });
  const metin = String(message.content || '').trim();
  if (!metin || message.author?.bot) return { gonderildi: false, neden: 'bos' };

  let waId = null;
  let gidecek = metin;
  let hedefArandi = false;
  const onek = metin.match(/^!wa\s+(?:<@!?(\d{17,20})>|(\d{17,20}))\s+([\s\S]+)$/i);
  if (onek) {
    hedefArandi = true;
    waId = bag.discordIdenWa(onek[1] || onek[2]);
    gidecek = onek[3].trim();
  } else if (message.reference?.messageId) {
    hedefArandi = true;
    waId = bag.kopruMesajindanWa(message.reference.messageId);
  }
  if (!hedefArandi) return { gonderildi: false, neden: 'hedef_yok' };
  if (!waId || !gidecek) {
    await bildir(message, 'Bu yazı bir WhatsApp hattına bağlanamadı. Köprü mesajını yanıtla veya `!wa <discordId> metin` yaz.');
    return { gonderildi: false, neden: 'hedef_yok' };
  }
  const sonuc = await gonder({ alici: { kimlik: waId }, metin: gidecek });
  if (!sonuc?.gonderildi) {
    await bildir(message, 'WhatsApp\'a iletilemedi. 24 saat dolduysa onaylı şablon gerekir.');
    return sonuc || { gonderildi: false, neden: 'gonderilemedi' };
  }
  try { await message.react?.('✅'); } catch { /* tepki şart değil */ }
  return sonuc;
}
