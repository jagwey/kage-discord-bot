import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSYA = path.resolve(__dirname, '../../data/hatirlaticilar.json');

export const KULLANICI_BASI_LIMIT = 10;
export const MAKS_METIN = 300;
const MIN_DK = 1;
const MAKS_DK = 60 * 24 * 30; // 30 gün
const KONTROL_ARALIGI_MS = 15 * 1000;

function oku() {
  try {
    const db = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
    return Array.isArray(db.hatirlaticilar) ? db : { hatirlaticilar: [] };
  } catch {
    return { hatirlaticilar: [] };
  }
}

function yaz(db) {
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(db, null, 2), 'utf8');
}

/**
 * Yeni hatırlatıcı kurar.
 * @returns {{basarili:boolean, hata?:string, hatirlatici?:object}}
 */
export function hatirlaticiEkle({ userId, channelId, guildId, metin, dakika }) {
  const temiz = String(metin || '').trim().slice(0, MAKS_METIN);
  const dk = Math.floor(Number(dakika));
  if (!userId || !channelId) return { basarili: false, hata: 'Kullanıcı veya kanal bilinmiyor.' };
  if (!temiz) return { basarili: false, hata: 'Hatırlatma metni boş olamaz.' };
  if (!Number.isFinite(dk) || dk < MIN_DK || dk > MAKS_DK) {
    return { basarili: false, hata: `Süre ${MIN_DK} dakika ile ${MAKS_DK} dakika (30 gün) arasında olmalı.` };
  }

  const db = oku();
  const bekleyen = db.hatirlaticilar.filter(h => h.userId === userId).length;
  if (bekleyen >= KULLANICI_BASI_LIMIT) {
    return { basarili: false, hata: `En fazla ${KULLANICI_BASI_LIMIT} bekleyen hatırlatıcın olabilir.` };
  }

  const hatirlatici = {
    id: crypto.randomBytes(4).toString('hex'),
    userId,
    channelId,
    guildId: guildId || null,
    metin: temiz,
    zaman: Date.now() + dk * 60 * 1000
  };
  db.hatirlaticilar.push(hatirlatici);
  yaz(db);
  return { basarili: true, hatirlatici };
}

export function hatirlaticiListele(userId) {
  return oku().hatirlaticilar.filter(h => h.userId === userId);
}

/** Kullanıcının kendi hatırlatıcısını siler. Başkasınınkine dokunmaz. */
export function hatirlaticiSil(userId, id) {
  const db = oku();
  const once = db.hatirlaticilar.length;
  db.hatirlaticilar = db.hatirlaticilar.filter(h => !(h.userId === userId && h.id === id));
  if (db.hatirlaticilar.length === once) return false;
  yaz(db);
  return true;
}

/** Vakti gelenleri listeden çıkarıp döndürür. */
export function vadesiGelenleriAl(simdi = Date.now()) {
  const db = oku();
  const gelen = db.hatirlaticilar.filter(h => h.zaman <= simdi);
  if (!gelen.length) return [];
  db.hatirlaticilar = db.hatirlaticilar.filter(h => h.zaman > simdi);
  yaz(db);
  return gelen;
}

async function gonder(client, h) {
  const icerik = `⏰ <@${h.userId}> hatırlatma: ${h.metin}`;
  const allowedMentions = { users: [h.userId] };
  try {
    const kanal = await client.channels.fetch(h.channelId);
    if (kanal?.isTextBased?.()) {
      await kanal.send({ content: icerik, allowedMentions });
      return;
    }
  } catch { /* kanal silinmiş olabilir, DM'e düş */ }
  try {
    const user = await client.users.fetch(h.userId);
    await user.send(icerik);
  } catch (err) {
    console.warn('[Hatırlatıcı] Gönderilemedi:', err.message);
  }
}

let zamanlayici = null;

export function hatirlaticiServisiniBaslat(client) {
  if (zamanlayici) clearInterval(zamanlayici);
  const tur = async () => {
    for (const h of vadesiGelenleriAl()) await gonder(client, h);
  };
  zamanlayici = setInterval(() => tur().catch(err => console.error('[Hatırlatıcı]', err.message)), KONTROL_ARALIGI_MS);
  zamanlayici.unref?.();
  tur().catch(() => {});
  console.log('[Hatırlatıcı] Servis başlatıldı.');
}
