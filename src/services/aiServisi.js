import { PermissionFlagsBits } from 'discord.js';
import { geminiUret, anahtarVarMi } from './ai/geminiClient.js';
import { kageyeSor } from './ai/kageBeyin.js';
import { egitimBaglami, ciktiyiDenetle } from './egitimServisi.js';

const BASIT_SISTEM = 'Sen Kage\'sin: kage95.com manga topluluğunun gölge ninjası. Türkçe, samimi ve öz yanıt ver.';

function yoneticiMi(member, client) {
  if (!member) return false;
  return (
    member.guild?.ownerId === member.id ||
    member.permissions?.has(PermissionFlagsBits.Administrator) ||
    client?.application?.owner?.id === member.id ||
    (!!process.env.OWNER_ID && member.id === process.env.OWNER_ID)
  );
}

/**
 * Kage'ye (Gemini) tek seferlik danışır. Bağlam (guild+channel) varsa birleşik beyin
 * (araçlar, hafıza, onay butonları) kullanılır; yoksa düz metin üretimi yapılır.
 * @param {string} mesaj
 * @param {Object} baglam { guild, channel, member, client, user }
 * @returns {Promise<{ cevap: string, saglayici: string, onaylar?: Array }>}
 */
export async function aiDanis(mesaj, baglam = {}) {
  if (!anahtarVarMi()) {
    return {
      cevap: '⛩️ Yapay zeka kapalı: `.env` dosyasına bir **GEMINI_API_KEY** eklenmeli ([Google AI Studio](https://aistudio.google.com/)).',
      saglayici: 'Kage-95'
    };
  }

  const { guild, channel, member, client } = baglam;
  const user = member?.user || baglam.user;
  const userId = member?.id || user?.id || 'anon';

  if (guild && channel) {
    const sonuc = await kageyeSor({
      metin: mesaj,
      yazarAdi: member?.displayName || user?.username || 'Kullanıcı',
      userId, guild, channel, member, client,
      yonetici: yoneticiMi(member, client)
    });
    if (sonuc.hata) throw new Error(sonuc.hata);
    let cevap = sonuc.cevap;
    if (sonuc.onaylar?.length) cevap += '\n\n' + sonuc.onaylar.map(o => o.metin).join('\n');
    return { cevap, saglayici: 'Kage-95', onaylar: sonuc.onaylar };
  }

  const { parts } = await geminiUret({
    systemInstruction: `${BASIT_SISTEM}\n\n${egitimBaglami(null, userId, mesaj)}`,
    contents: [{ role: 'user', parts: [{ text: mesaj }] }],
    userId,
    maxOutputTokens: 1500
  });
  const cevap = ciktiyiDenetle(parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim());
  return { cevap: cevap || '…', saglayici: 'Kage-95' };
}

export const aiYanitiUret = aiDanis;
