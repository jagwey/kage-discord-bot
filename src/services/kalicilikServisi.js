import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { REST, Routes, ChannelType, PermissionFlagsBits } from 'discord.js';
import { ajan } from '../ag.js';

// Render diski her deploy/yeniden başlatmada silinir. data/*.json dosyaları
// özel bir Discord kanalına ek olarak yedeklenir ve açılışta geri yüklenir.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const YEDEK_DOSYA_ADI = 'kage-yedek.json';
const YEDEK_KANAL_ADI = 'kage-yedek';
const YEDEK_ARALIGI_MS = 60 * 1000;
const SAKLANACAK_YEDEK = 5;

const rest = new REST({ version: '10', agent: ajan }).setToken(process.env.DISCORD_TOKEN || '');

let kanalId = process.env.YEDEK_KANAL_ID || null;
let botId = null;
let sonOzet = null;
// Geri yükleme başarısız olursa boş veriyle iyi yedeğin üstüne yazılmaz
let yedeklemeAcik = false;
let yedekleniyor = false;
let zamanlayici = null;
const GERI_YUKLEME_SINIRI_MS = 8 * 1000;
let geriYuklemeIptal = false;

function paketHazirla() {
  const dosyalar = {};
  if (fs.existsSync(DATA_DIR)) {
    for (const ad of fs.readdirSync(DATA_DIR)) {
      if (!ad.endsWith('.json')) continue;
      try {
        dosyalar[ad] = fs.readFileSync(path.join(DATA_DIR, ad), 'utf8');
      } catch { /* okunamayan dosya atlanır */ }
    }
  }
  const govde = JSON.stringify(dosyalar);
  const ozet = crypto.createHash('sha1').update(govde).digest('hex');
  return { dosyalar, govde, ozet };
}

async function yedekKanaliBul(olustur = false) {
  if (kanalId) return kanalId;
  const guildId = process.env.GUILD_ID;
  if (!guildId) return null;

  const kanallar = await rest.get(Routes.guildChannels(guildId));
  const mevcut = kanallar.find(k => k.name === YEDEK_KANAL_ADI && k.type === ChannelType.GuildText);
  if (mevcut) return (kanalId = mevcut.id);
  if (!olustur) return null;

  // Sadece bot görebilir; @everyone için görüntüleme kapalı
  const yeni = await rest.post(Routes.guildChannels(guildId), {
    body: {
      name: YEDEK_KANAL_ADI,
      type: ChannelType.GuildText,
      topic: 'Kage hafıza ve veri yedekleri. Silme, botun hafızası burada.',
      permission_overwrites: [
        { id: guildId, type: 0, deny: PermissionFlagsBits.ViewChannel.toString() },
        { id: botId, type: 1, allow: (PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.AttachFiles | PermissionFlagsBits.ReadMessageHistory | PermissionFlagsBits.ManageMessages).toString() }
      ]
    }
  });
  console.log(`[Kalıcılık] #${YEDEK_KANAL_ADI} yedek kanalı oluşturuldu.`);
  return (kanalId = yeni.id);
}

async function yedekMesajlari() {
  const mesajlar = await rest.get(Routes.channelMessages(kanalId), { query: new URLSearchParams({ limit: '50' }) });
  return mesajlar.filter(m => m.author?.id === botId && m.attachments?.some(a => a.filename === YEDEK_DOSYA_ADI));
}

/**
 * Son yedeği data/ klasörüne yazar. Komutlar ve servisler yüklenmeden önce çağrılmalıdır,
 * çünkü bazı servisler veriyi belleğe alıp önbellekte tutar.
 */
export async function yedektenGeriYukle({ timeoutMs = GERI_YUKLEME_SINIRI_MS } = {}) {
  let zamanAsimi;
  const sinir = new Promise(r => {
    zamanAsimi = setTimeout(() => {
      geriYuklemeIptal = true;
      console.error(`[Kalıcılık] Geri yükleme ${timeoutMs / 1000} sn içinde bitmedi, bot yedeksiz açılıyor. Bu oturumda yedekleme kapalı.`);
      r();
    }, timeoutMs);
  });
  try {
    await Promise.race([geriYuklemeDene(), sinir]);
  } finally {
    clearTimeout(zamanAsimi);
  }
}

async function geriYuklemeDene() {
  if (!process.env.DISCORD_TOKEN) return;
  for (let deneme = 1; deneme <= 3 && !geriYuklemeIptal; deneme++) {
    try {
      botId = botId || (await rest.get(Routes.user('@me'))).id;
      if (!(await yedekKanaliBul(false))) {
        console.log('[Kalıcılık] Yedek kanalı yok, ilk yedek açılışta alınacak.');
        yedeklemeAcik = true;
        return;
      }

      const [son] = await yedekMesajlari();
      if (!son) {
        console.log('[Kalıcılık] Kanalda yedek bulunamadı, mevcut veriyle devam.');
        yedeklemeAcik = true;
        return;
      }

      const ek = son.attachments.find(a => a.filename === YEDEK_DOSYA_ADI);
      const { data } = await axios.get(ek.url, { responseType: 'text', timeout: 20000, transformResponse: x => x });
      const paket = JSON.parse(data);
      // Süre dolduysa bot açılmıştır; geç gelen yedek canlı verinin üstüne yazılmaz
      if (geriYuklemeIptal) return;

      fs.mkdirSync(DATA_DIR, { recursive: true });
      let sayi = 0;
      for (const [ad, icerik] of Object.entries(paket.dosyalar || {})) {
        if (!/^[\w.-]+\.json$/.test(ad)) continue;
        fs.writeFileSync(path.join(DATA_DIR, ad), icerik, 'utf8');
        sayi++;
      }
      sonOzet = paketHazirla().ozet;
      yedeklemeAcik = true;
      console.log(`[Kalıcılık] ${sayi} veri dosyası ${paket.zaman || 'son'} tarihli yedekten geri yüklendi.`);
      return;
    } catch (err) {
      console.error(`[Kalıcılık] Geri yükleme denemesi ${deneme}/3 başarısız:`, err.message);
      await new Promise(r => setTimeout(r, 3000 * deneme));
    }
  }
  console.error('[Kalıcılık] Yedek geri yüklenemedi. Eski yedeğin üstüne yazmamak için bu oturumda yedekleme kapalı.');
}

/** Veri değiştiyse yeni yedek gönderir ve eski yedekleri temizler. */
export async function yedekle({ zorla = false } = {}) {
  if (!yedeklemeAcik || yedekleniyor) return false;
  const { govde, ozet } = paketHazirla();
  if (!zorla && ozet === sonOzet) return false;

  yedekleniyor = true;
  try {
    await yedekKanaliBul(true);
    const zaman = new Date().toISOString();
    const icerik = `{"zaman":${JSON.stringify(zaman)},"dosyalar":${govde}}`;
    await rest.post(Routes.channelMessages(kanalId), {
      body: { content: `🗄️ Veri yedeği • ${zaman}`, attachments: [{ id: 0, filename: YEDEK_DOSYA_ADI }] },
      files: [{ name: YEDEK_DOSYA_ADI, data: Buffer.from(icerik, 'utf8'), contentType: 'application/json' }]
    });
    sonOzet = ozet;

    const eskiler = (await yedekMesajlari()).slice(SAKLANACAK_YEDEK);
    for (const m of eskiler) {
      await rest.delete(Routes.channelMessage(kanalId, m.id)).catch(() => null);
    }
    return true;
  } catch (err) {
    console.error('[Kalıcılık] Yedekleme hatası:', err.message);
    return false;
  } finally {
    yedekleniyor = false;
  }
}

/** Kapanışta süren yedeğin bitmesini bekler, sonra son durumu yedekler. */
export async function kapanistaYedekle() {
  if (zamanlayici) clearInterval(zamanlayici);
  for (let i = 0; i < 50 && yedekleniyor; i++) await new Promise(r => setTimeout(r, 200));
  return yedekle();
}

export function yedeklemeyiBaslat() {
  if (zamanlayici) return;
  yedekle().catch(() => null);
  zamanlayici = setInterval(() => yedekle().catch(() => null), YEDEK_ARALIGI_MS);
}
