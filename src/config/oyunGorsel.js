import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AttachmentBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STICKERS_DIR = path.join(__dirname, '../../assets/stickers');

/**
 * Oyun komutları için ortak görsel yardımcılar: ASCII kart çizimi, can çubukları,
 * kısa gecikme ve para biçimleme. Böylece blackjack, düello, yazı-tura ve slot
 * aynı görsel dili paylaşır.
 */

export const bekle = ms => new Promise(r => setTimeout(r, ms));

export const ryoYaz = n => `${Number(n).toLocaleString('tr-TR')} Ryo`;

/** Her zaman 2 karakter genişliğinde kart değeri (10 → "10", diğerleri "A "). */
function deger2(ad) {
  return ad.length === 2 ? ad : `${ad} `;
}

/**
 * Kartları yan yana çizer. Kapalı kart `░` desenli gösterilir.
 * @param {{ad:string, sembol:string}[]} kartlar
 * @param {boolean} [sonuKapat] true ise ikinci kart kapalı çizilir (krupiye)
 * @returns {string} Discord kod bloğu
 */
export function kartlariCiz(kartlar, sonuKapat = false) {
  const satirlar = ['', '', '', '', ''];
  kartlar.forEach((k, i) => {
    const kapali = sonuKapat && i === 1;
    const parca = kapali
      ? ['┌─────┐', '│░░░░░│', '│░░?░░│', '│░░░░░│', '└─────┘']
      : [
        '┌─────┐',
        `│${deger2(k.ad)}   │`,
        `│  ${k.sembol}  │`,
        `│   ${deger2(k.ad).trimEnd().padStart(2, ' ')}│`,
        '└─────┘'
      ];
    parca.forEach((p, s) => { satirlar[s] += (i ? ' ' : '') + p; });
  });
  return '```\n' + satirlar.join('\n') + '\n```';
}

/**
 * Emoji can çubuğu: tam kareler dolu, kalanlar boş. 12 karelik çubuk.
 */
export function canCubugu(hp, maks = 100, uzunluk = 12) {
  const oran = Math.max(0, Math.min(1, hp / maks));
  const dolu = Math.round(oran * uzunluk);
  const renk = oran > 0.6 ? '🟩' : oran > 0.3 ? '🟨' : '🟥';
  return `${renk.repeat(dolu)}${'⬛'.repeat(uzunluk - dolu)} **${Math.max(0, hp)}**/${maks}`;
}

/** Skoru görsel etiketle gösterir. */
export function skorEtiketi(skor) {
  if (skor > 21) return `💥 ${skor}`;
  if (skor === 21) return `✨ ${skor}`;
  return `${skor}`;
}

/**
 * Oyun içi zafer, mağlubiyet veya durum anlarında kullanıcıya uygun dinamik piksel sticker döner.
 * @param {import('discord.js').User} user
 * @param {import('discord.js').GuildMember|null} member
 * @param {'zafer'|'para'|'aglama'|'ofke'|'cay'|'savas'|'uyku'|'yemek'|'sok'} duygu
 * @returns {{ files: AttachmentBuilder[], attachmentUrl: string|null }}
 */
export function oyunStickerEkini(user, member = null, duygu = 'zafer') {
  try {
    const isFemale = kullaniciKizMiKontrol(user, member);
    const altDir = isFemale ? 'kunoichi' : 'boy';
    const dosyaAdi = isFemale ? 'kunoichi_sticker.png' : 'kage_sticker.png';
    const safDuygu = String(duygu).replace(/^kage_/, '');
    const filePath = path.join(STICKERS_DIR, altDir, `kage_${safDuygu}.png`);

    if (fs.existsSync(filePath)) {
      const att = new AttachmentBuilder(filePath, { name: dosyaAdi });
      return { files: [att], attachmentUrl: `attachment://${dosyaAdi}` };
    }
  } catch {}
  return { files: [], attachmentUrl: null };
}

function kullaniciKizMiKontrol(user, member) {
  const KIZ_ISIMLERI = ['chan', 'girl', 'kiz', 'kız', 'bayan', 'prenses', 'alya', 'sakura', 'marin', 'waifu'];
  const name = (member?.displayName || user?.username || '').toLowerCase();
  if (KIZ_ISIMLERI.some(k => name.includes(k))) return true;
  if (member?.roles?.cache?.some?.(r => r.name.toLowerCase().includes('kunoichi') || r.name.toLowerCase().includes('kız'))) return true;
  return false;
}
