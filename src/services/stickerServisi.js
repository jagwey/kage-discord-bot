import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsonDepo } from './jsonDepo.js';
import { duyguTespit } from './duyguServisi.js';
import { stickerKurali, STICKER_DUYGULARI } from './egitimServisi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STICKERS_DIR = path.join(__dirname, '../../assets/stickers');

// guildId -> { "erkek_cay": { stickerId, emojiId } , ... }
const depo = jsonDepo('sunucu_sticker.json', () => ({}));

const TURLER = ['erkek', 'kunoichi'];
const ETIKET = { savas: 'Savaş', cay: 'Çay', ofke: 'Öfke', zafer: 'Zafer', para: 'Para', sevgi: 'Sevgi', dusunce: 'Düşünce' };
const TAG = { savas: '⚔️', cay: '🍵', ofke: '😤', zafer: '🏆', para: '💰', sevgi: '❤️', dusunce: '🤔' };

export function stickerDosyasi(tur, duygu) {
  const klasor = tur === 'kunoichi' ? path.join(STICKERS_DIR, 'kunoichi') : STICKERS_DIR;
  return path.join(klasor, `kage_${duygu}.png`);
}

/** Mesaj için gönderilecek sticker duygusu; öğretilen önce, sonra belirgin duygu. Yoksa null. */
export function stickerDuygusuSec(guildId, userId, mesaj, { rastgele = 0.25 } = {}) {
  const ogretilen = stickerKurali(guildId, userId, mesaj);
  if (ogretilen && STICKER_DUYGULARI.includes(ogretilen)) return ogretilen;
  const d = duyguTespit(mesaj);
  if (!d.sticker) return null;
  if (d.yogunluk >= 2) return d.sticker;
  return Math.random() < rastgele ? d.sticker : null;
}

/**
 * Kanala gidecek sticker mesaj seçeneği: sunucuya yüklenmiş gerçek sticker varsa o,
 * yoksa dosya eki. Hiçbiri yoksa null.
 */
export function stickerMesajSecenegi(guildId, tur, duygu) {
  if (!duygu) return null;
  const kayit = depo.oku()[guildId]?.[`${tur}_${duygu}`];
  if (kayit?.stickerId) return { stickers: [kayit.stickerId] };
  const dosya = stickerDosyasi(tur, duygu);
  if (fs.existsSync(dosya)) return { files: [{ attachment: dosya, name: `${tur === 'kunoichi' ? 'kunoichi' : 'kage'}_${duygu}.png` }] };
  return null;
}

/** Sunucuya yüklenmiş sticker/emoji özeti. */
export function yuklemeDurumu(guildId) {
  return depo.oku()[guildId] || {};
}

function hataMetni(err) {
  const m = String(err?.message || err);
  if (/Missing Permissions|50013/i.test(m)) return 'izin yok (Emoji ve Sticker Yönet gerekli)';
  if (/Maximum number of stickers|30039|maximum/i.test(m)) return 'sticker yuvası dolu';
  return m.slice(0, 120);
}

/**
 * Sticker dosyalarını sunucuya yükler. Sticker yuvası dolarsa kalanlar emoji olarak denenir.
 * @returns {Promise<{eklenen:string[], emoji:string[], atlanan:string[], hatalar:string[]}>}
 */
export async function stickerleriSunucuyaYukle(guild, { turler = TURLER, duygular = STICKER_DUYGULARI } = {}) {
  const db = depo.oku();
  const kayit = db[guild.id] || (db[guild.id] = {});
  const sonuc = { eklenen: [], emoji: [], atlanan: [], hatalar: [] };
  let stickerDolu = false;
  let emojiDolu = false;

  for (const tur of turler) {
    for (const duygu of duygular) {
      const anahtar = `${tur}_${duygu}`;
      const dosya = stickerDosyasi(tur, duygu);
      if (!fs.existsSync(dosya)) continue;
      const var_ = kayit[anahtar] || {};
      const ad = `${tur === 'kunoichi' ? 'Kunoichi' : 'Kage'} ${ETIKET[duygu]}`;

      // Kayıtlı sticker hâlâ sunucuda mı?
      if (var_.stickerId && guild.stickers.cache.has(var_.stickerId)) { sonuc.atlanan.push(ad); continue; }
      delete var_.stickerId;

      if (!stickerDolu) {
        try {
          const st = await guild.stickers.create({
            file: dosya,
            name: ad.slice(0, 30),
            tags: TAG[duygu],
            description: `Kage-95 ${ETIKET[duygu]} stickerı`,
            reason: 'Kage-95 sticker yükleme'
          });
          var_.stickerId = st.id;
          sonuc.eklenen.push(ad);
          kayit[anahtar] = var_;
          continue;
        } catch (err) {
          const neden = hataMetni(err);
          if (/yuvası|izin/.test(neden)) stickerDolu = true;
          if (!/yuvası/.test(neden)) sonuc.hatalar.push(`${ad}: ${neden}`);
        }
      }

      // Yedek: emoji (256 KB sınırı; büyük dosya atlanır)
      if (!var_.emojiId && !emojiDolu && fs.statSync(dosya).size <= 256 * 1024) {
        try {
          const em = await guild.emojis.create({
            attachment: dosya,
            name: `kage_${tur === 'kunoichi' ? 'k_' : ''}${duygu}`.slice(0, 32),
            reason: 'Kage-95 emoji yükleme'
          });
          var_.emojiId = em.id;
          sonuc.emoji.push(ad);
        } catch (err) {
          if (/Maximum|maximum|30008/.test(String(err?.message))) emojiDolu = true;
          sonuc.hatalar.push(`${ad} (emoji): ${hataMetni(err)}`);
        }
      }
      kayit[anahtar] = var_;
    }
  }
  depo.yaz(db);
  return sonuc;
}
