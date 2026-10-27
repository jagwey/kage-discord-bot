import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { bakiyeGetir, KILIC_SEVIYELERI } from './ekonomiServisi.js';
import { seviyeDurumu } from './seviyeServisi.js';
import { kullaniciKlaniniBul } from './klanServisi.js';
import { zindanProfili } from './zindanServisi.js';
import { kazanilanRozetler, basarimDurumu } from './basarimServisi.js';
import { kullaniciYoldasGetir, yoldasAdi } from './yoldasServisi.js';
import { balikDurumu, BALIKLAR, TUR_SAYISI } from './balikServisi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, '../../assets/fonts');

// Sunucuda sistem fontu olmayabilir; Türkçe harfler için Noto Sans pakette gelir.
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSans-Regular.ttf'), 'KageSans');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSans-Bold.ttf'), 'KageSansBold');

const GEN = 960;
const YUK = 420;
const RENK = {
  zemin: '#0e0c0c',
  panel: '#1a1616',
  kirmizi: '#e53935',
  koyuKirmizi: '#8e0e15',
  altin: '#d4af37',
  yazi: '#f2ecec',
  soluk: '#9a8f8f',
  bar: '#2b2424'
};

/** Kart fontunda renkli emoji yok; metinden emojileri ayıklar. */
const emojisiz = metin => String(metin ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

const sayi = n => Number(n || 0).toLocaleString('tr-TR');

/**
 * Kartta gösterilecek bütün oyun verilerini toplar.
 * @param {string} userId
 * @param {string|null} guildId
 */
export function samurayOzeti(userId, guildId = null) {
  const b = bakiyeGetir(userId);
  const sv = guildId ? seviyeDurumu(guildId, userId) : { seviye: 0, ilerleme: 0, esik: 1 };
  const klan = kullaniciKlaniniBul(userId);
  const z = zindanProfili(userId);
  const yoldas = kullaniciYoldasGetir(userId);
  const balik = balikDurumu(userId);
  const rozetler = kazanilanRozetler(userId);
  return {
    unvan: b.unvan,
    ryo: b.toplam,
    seri: b.streak,
    kilic: `${b.kilic.ad} +${b.kilic.seviye}/${KILIC_SEVIYELERI.length}`,
    seviye: sv.seviye,
    xpOran: sv.esik ? Math.min(1, sv.ilerleme / sv.esik) : 0,
    klan: klan?.ad || null,
    zindanZafer: z.zafer,
    enDerinKat: z.enDerinKat || 1,
    duello: `${b.duelloZafer}/${b.duelloMaglubiyet}`,
    yoldas: yoldas ? `${yoldasAdi(yoldas)} Sv. ${yoldas.seviye || 1}` : null,
    balikTur: balik.kesfedilen.filter(id => BALIKLAR.some(t => t.id === id && !t.cop)).length,
    rozet: rozetler.length,
    rozetToplam: basarimDurumu(userId).length
  };
}

function yuvarlakDikdortgen(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Metni verilen genişliğe sığana kadar kısaltır. */
function sigdir(ctx, metin, genislik) {
  let m = metin;
  if (ctx.measureText(m).width <= genislik) return m;
  while (m.length > 1 && ctx.measureText(`${m}…`).width > genislik) m = m.slice(0, -1);
  return `${m}…`;
}

/** Avatarı en fazla 3 sn bekleyerek indirir; olmazsa kart baş harfle çizilir. */
async function avatarYukle(url) {
  if (!url) return null;
  try {
    const yanit = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!yanit.ok) return null;
    return await loadImage(Buffer.from(await yanit.arrayBuffer()));
  } catch {
    return null;
  }
}

/**
 * Samuray kartını PNG olarak çizer.
 * @param {{ad:string, avatarUrl?:string}} kisi
 * @param {ReturnType<typeof samurayOzeti>} o
 * @returns {Promise<Buffer>}
 */
export async function profilKartiCiz(kisi, o) {
  const canvas = createCanvas(GEN, YUK);
  const ctx = canvas.getContext('2d');

  // Zemin ve kızıl çapraz şerit
  ctx.fillStyle = RENK.zemin;
  ctx.fillRect(0, 0, GEN, YUK);
  const serit = ctx.createLinearGradient(0, 0, GEN, YUK);
  serit.addColorStop(0, 'rgba(142,14,21,0.55)');
  serit.addColorStop(0.45, 'rgba(14,12,12,0)');
  ctx.fillStyle = serit;
  ctx.fillRect(0, 0, GEN, YUK);
  ctx.fillStyle = RENK.kirmizi;
  ctx.fillRect(0, 0, GEN, 6);

  // Avatar halkası
  const ax = 140, ay = 150, ar = 90;
  ctx.beginPath();
  ctx.arc(ax, ay, ar + 6, 0, Math.PI * 2);
  ctx.fillStyle = RENK.altin;
  ctx.fill();
  const avatar = await avatarYukle(kisi.avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    ctx.drawImage(avatar, ax - ar, ay - ar, ar * 2, ar * 2);
  } else {
    ctx.fillStyle = RENK.koyuKirmizi;
    ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    ctx.fillStyle = RENK.yazi;
    ctx.font = '72px KageSansBold';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojisiz(kisi.ad).charAt(0).toUpperCase() || '?', ax, ay + 4);
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Seviye rozeti
  yuvarlakDikdortgen(ctx, ax - 46, ay + ar - 8, 92, 34, 17);
  ctx.fillStyle = RENK.kirmizi;
  ctx.fill();
  ctx.fillStyle = RENK.yazi;
  ctx.font = '20px KageSansBold';
  ctx.textAlign = 'center';
  ctx.fillText(`Sv. ${o.seviye}`, ax, ay + ar + 16);
  ctx.textAlign = 'left';

  // Ad, unvan, klan
  const sx = 270;
  ctx.fillStyle = RENK.yazi;
  ctx.font = '44px KageSansBold';
  ctx.fillText(sigdir(ctx, emojisiz(kisi.ad) || 'Samuray', GEN - sx - 40), sx, 92);
  ctx.fillStyle = RENK.altin;
  ctx.font = '24px KageSans';
  const unvanSatiri = [emojisiz(o.unvan), o.klan ? `Klan: ${emojisiz(o.klan)}` : null].filter(Boolean).join('  •  ');
  ctx.fillText(sigdir(ctx, unvanSatiri, GEN - sx - 40), sx, 130);

  // XP çubuğu
  const bx = sx, by = 152, bw = GEN - sx - 40, bh = 16;
  yuvarlakDikdortgen(ctx, bx, by, bw, bh, 8);
  ctx.fillStyle = RENK.bar;
  ctx.fill();
  if (o.xpOran > 0) {
    yuvarlakDikdortgen(ctx, bx, by, Math.max(bh, bw * o.xpOran), bh, 8);
    const xpRenk = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    xpRenk.addColorStop(0, RENK.koyuKirmizi);
    xpRenk.addColorStop(1, RENK.kirmizi);
    ctx.fillStyle = xpRenk;
    ctx.fill();
  }
  ctx.fillStyle = RENK.soluk;
  ctx.font = '16px KageSans';
  ctx.fillText(`Sohbet ilerlemesi %${Math.round(o.xpOran * 100)}`, bx, by + 38);

  // İstatistik kutuları: 4 sütun x 2 satır
  const kutular = [
    ['Servet', `${sayi(o.ryo)} Ryo`],
    ['Günlük seri', `${o.seri} gün`],
    ['Zindan zaferi', sayi(o.zindanZafer)],
    ['En derin kat', `${o.enDerinKat}. kat`],
    ['Düello G/M', o.duello],
    ['Balık türü', `${o.balikTur}/${TUR_SAYISI}`],
    ['Rozet', `${o.rozet}/${o.rozetToplam}`],
    ['Katana', emojisiz(o.kilic)]
  ];
  const kx = 40, ky = 270, kw = (GEN - 80 - 3 * 12) / 4, kh = 54;
  kutular.forEach(([etiket, deger], i) => {
    const x = kx + (i % 4) * (kw + 12);
    const y = ky + Math.floor(i / 4) * (kh + 8);
    yuvarlakDikdortgen(ctx, x, y, kw, kh, 10);
    ctx.fillStyle = RENK.panel;
    ctx.fill();
    ctx.fillStyle = RENK.soluk;
    ctx.font = '14px KageSans';
    ctx.fillText(etiket, x + 14, y + 20);
    ctx.fillStyle = RENK.yazi;
    ctx.font = '20px KageSansBold';
    ctx.fillText(sigdir(ctx, deger, kw - 28), x + 14, y + 44);
  });

  // Yoldaş satırı
  ctx.fillStyle = RENK.soluk;
  ctx.font = '18px KageSans';
  const yoldasMetni = o.yoldas ? `Yoldaş: ${emojisiz(o.yoldas)}` : 'Yoldaş yok: /yoldas ile edin';
  ctx.fillText(sigdir(ctx, yoldasMetni, GEN - sx - 40), sx, 230);

  ctx.fillStyle = RENK.koyuKirmizi;
  ctx.font = '14px KageSansBold';
  ctx.textAlign = 'right';
  ctx.fillText('KAGE-95 • kage95.com', GEN - 24, YUK - 8);

  return canvas.encode('png');
}
