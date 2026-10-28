import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token kontrolü
if (!process.env.DISCORD_TOKEN) {
  console.error('\n❌ [Kritik Hata] DISCORD_TOKEN bulunamadı!');
  console.error('Lütfen .env dosyasını oluşturun ve bot tokeninizi girin. Örnek: .env.example dosyasını inceleyin.\n');
  process.exit(1);
}

// Discord İstemcisi - Bütün All-in-One Yönetim Intentleri
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,          // AI kanalı ve mesaj takibi için gereklidir
    GatewayIntentBits.GuildMembers,             // Karşılama ve oto-rol için gereklidir
    GatewayIntentBits.GuildModeration,          // Yasaklama ve cezalar için gereklidir
    GatewayIntentBits.GuildMessageReactions     // Anketler için gereklidir
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const discordRestGet = client.rest.get.bind(client.rest);
client.rest.get = async (route, options) => {
  if (route === '/gateway/bot') {
    console.warn('[Discord] /gateway/bot çağrısı atlandı; tek shard için güvenli Gateway metadata kullanılıyor.');
    return {
      url: 'wss://gateway.discord.gg',
      shards: 1,
      session_start_limit: {
        total: 1000,
        remaining: 1000,
        reset_after: 0,
        max_concurrency: 1
      }
    };
  }

  try {
    return await discordRestGet(route, options);
  } catch (err) {
    throw err;
  }
};

console.warn('[Discord] Gerekli privileged intentler: Message Content Intent ve Server Members Intent.');
console.warn('[Discord] Bu intentler Developer Portal > Bot > Privileged Gateway Intents bölümünde açık değilse mesaj olayları, AI, karşılama ve oto-rol çalışmaz.');

function durumGuncelle(durum, detay) {
  globalThis.__kageDurum = {
    ...(globalThis.__kageDurum || {}),
    durum,
    detay,
    sonDegisim: new Date().toISOString()
  };
}

client.on(Events.Error, err => {
  console.error('[Discord Gateway Hatası]', err);
  durumGuncelle('error', `Discord Gateway hatası: ${err.message}`);
});
client.on(Events.Warn, mesaj => console.warn('[Discord Gateway Uyarısı]', mesaj));
client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
  console.error(`[Discord] Shard ${shardId} bağlantısı koptu:`, closeEvent?.code, closeEvent?.reason || '');
  gatewayHazir = false;
  durumGuncelle('offline', `Gateway bağlantısı koptu (kod ${closeEvent?.code ?? 'bilinmiyor'}).`);
});
client.on(Events.ShardReconnecting, shardId => {
  console.warn(`[Discord] Shard ${shardId} yeniden bağlanıyor...`);
  gatewayHazir = false;
  durumGuncelle('starting', 'Discord Gateway yeniden bağlanıyor.');
  yenidenBaglantiZamanlayicisiniTemizle();
  yenidenBaglantiZamanlayici = setTimeout(() => {
    yenidenBaglantiZamanlayici = null;
    if (gatewayHazir || yenidenGirisCalisiyor) return;

    console.error('[Discord] Gateway 30 saniyede toparlanmadı; temiz login yeniden başlatılıyor.');
    yenidenGirisCalisiyor = true;
    client.destroy();
    girisYap()
      .catch(err => {
        console.error('[Kritik Yeniden Giriş Hatası]', err);
        durumGuncelle('error', `Yeniden giriş başarısız: ${err.message}`);
        process.exit(1);
      })
      .finally(() => {
        yenidenGirisCalisiyor = false;
      });
  }, 30_000);
});
client.on(Events.ClientReady, gatewayHazirIsaretle);
client.on(Events.ShardError, (err, shardId) => {
  console.error(`[Discord] Shard ${shardId} Gateway hatası:`, err);
  durumGuncelle('error', `Shard ${shardId} Gateway hatası: ${err.message}`);
});
client.on(Events.Invalidated, () => {
  console.error('[Discord] Gateway oturumu geçersiz kılındı; process yeniden başlatılmalı.');
  durumGuncelle('error', 'Discord Gateway oturumu geçersiz.');
});

client.commands = new Collection();
let gatewayHazir = false;
let yenidenBaglantiZamanlayici = null;
let yenidenGirisCalisiyor = false;

function yenidenBaglantiZamanlayicisiniTemizle() {
  if (!yenidenBaglantiZamanlayici) return;
  clearTimeout(yenidenBaglantiZamanlayici);
  yenidenBaglantiZamanlayici = null;
}

function gatewayHazirIsaretle() {
  gatewayHazir = true;
  yenidenBaglantiZamanlayicisiniTemizle();
  durumGuncelle('online', 'Discord Gateway bağlantısı hazır.');
}

// 1. Komutları Yükle
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = await import(`file://${filePath}`);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[Komut Yüklendi] /${command.data.name}`);
      } else {
        console.warn(`[Uyarı] ${file} dosyasında 'data' veya 'execute' eksik.`);
      }
    } catch (err) {
      console.error(`[Hata] ${file} komutu yüklenemedi:`, err.message);
    }
  }
}

// 2. Olayları (Events) Yükle
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = await import(`file://${filePath}`);
      const handler = (...args) => Promise.resolve(event.execute(...args)).catch(err => {
        console.error(`[Olay Hatası] ${event.name} (${file})`, err);
        durumGuncelle('error', `${event.name} olayı hata verdi: ${err.message}`);
      });
      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }
      console.log(`[Olay Yüklendi] ${event.name}`);
    } catch (err) {
      console.error(`[Hata] ${file} olayı yüklenemedi:`, err.message);
    }
  }
}

// 3. Bulut Sunucuları ve Webhook Entegrasyonu İçin HTTP API Sunucusu
import http from 'http';
import { anlikMangaDuyur, anlikBolumDuyur, anlikDuyuruDuyur, anlikRolGuncelle } from './services/duyuruServisi.js';

const PORT = process.env.PORT || 3000;
let WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  WEBHOOK_SECRET = (await import('crypto')).randomBytes(24).toString('hex');
  console.warn('[Webhook] WEBHOOK_SECRET tanımsız; bu oturum için rastgele bir sır üretildi. Site entegrasyonu için .env içine WEBHOOK_SECRET ekleyin.');
}

import { siteYardimSor } from './services/ai/kageBeyin.js';

// Site yardım API'si: ayrı anahtar yoksa webhook sırrı kullanılır.
const SITE_API_KEY = process.env.SITE_API_KEY || WEBHOOK_SECRET;
const YARDIM_MAKS_GOVDE = 4096;
const YARDIM_MAKS_SORU = 500;
const YARDIM_PENCERE_MS = 60 * 1000;
const YARDIM_PENCERE_LIMIT = 10;
const yardimIstekleri = new Map(); // ip -> zaman damgaları

function yardimHizSiniriGecer(ip) {
  const simdi = Date.now();
  const liste = (yardimIstekleri.get(ip) || []).filter(t => simdi - t < YARDIM_PENCERE_MS);
  if (liste.length >= YARDIM_PENCERE_LIMIT) {
    yardimIstekleri.set(ip, liste);
    return false;
  }
  liste.push(simdi);
  yardimIstekleri.set(ip, liste);
  if (yardimIstekleri.size > 5000) {
    for (const [k, v] of yardimIstekleri) if (!v.some(t => simdi - t < YARDIM_PENCERE_MS)) yardimIstekleri.delete(k);
  }
  return true;
}

if (globalThis.__erkenSunucu) {
  globalThis.__erkenSunucu.closeAllConnections?.();
  await new Promise(r => globalThis.__erkenSunucu.close(r));
  globalThis.__erkenSunucu = null;
}

http.createServer(async (req, res) => {
  // CORS Başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-kage-secret, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 1. Canlılık Kontrolü (Uptime / Health)
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    const durum = globalThis.__kageDurum || { durum: 'starting', detay: 'Başlatılıyor.' };
    const kod = durum.durum === 'online' || durum.durum === 'starting' ? 200 : 503;
    res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: durum.durum,
      detail: durum.detay,
      lastChange: durum.sonDegisim,
      bot: 'Kage',
      ping: client.ws.ping,
      guilds: client.guilds.cache.size,
      time: new Date().toISOString()
    }));
    return;
  }

  // 2. Webhook Rotaları (POST)
  if (req.method === 'POST' && url.pathname.startsWith('/api/webhook/')) {
    const gelenSecret = req.headers['x-kage-secret'] || url.searchParams.get('secret');
    if (gelenSecret !== WEBHOOK_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Yetkisiz erişim. Geçersiz webhook secret.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = body ? JSON.parse(body) : {};

        // A0. Yeni Manga Webhook'u
        if (url.pathname === '/api/webhook/manga') {
          const sonuc = await anlikMangaDuyur(client, data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'Yeni manga duyurusu başarıyla Discord kanalına iletildi.', ...sonuc }));
          return;
        }

        // A. Yeni Bölüm Webhook'u
        if (url.pathname === '/api/webhook/bolum') {
          const sonuc = await anlikBolumDuyur(client, data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'Bölüm duyurusu başarıyla Discord kanalına iletildi.', ...sonuc }));
          return;
        }

        // B. Site Duyurusu Webhook'u
        if (url.pathname === '/api/webhook/duyuru') {
          const sonuc = await anlikDuyuruDuyur(client, data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'Duyuru başarıyla Discord kanalına iletildi.', ...sonuc }));
          return;
        }

        // C. Kullanıcı Rol / XP Senkronizasyonu
        if (url.pathname === '/api/webhook/rol-sync') {
          const sonuc = await anlikRolGuncelle(client, data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, ...sonuc }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Bilinmeyen webhook rotası.' }));
      } catch (err) {
        console.error('[HTTP API Hatası]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Webhook işlenirken hata oluştu.', detay: err.message }));
      }
    });
    return;
  }

  // 3. Site Yardım API'si: POST /api/yardim/sor  { soru } -> { cevap }
  if (req.method === 'POST' && url.pathname === '/api/yardim/sor') {
    const json = (kod, nesne) => {
      res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(nesne));
    };
    const gelen = req.headers['x-kage-secret'] || url.searchParams.get('secret') ||
      String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (gelen !== SITE_API_KEY) return json(401, { error: 'Yetkisiz erişim.' });

    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (!yardimHizSiniriGecer(ip)) return json(429, { error: 'Çok fazla istek. Biraz bekle.' });

    let body = '';
    let asildi = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > YARDIM_MAKS_GOVDE && !asildi) {
        asildi = true;
        json(413, { error: 'İstek çok büyük.' });
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (asildi) return;
      try {
        const soru = String((body ? JSON.parse(body) : {}).soru || '').trim();
        if (!soru) return json(400, { error: 'soru alanı gerekli.' });
        if (soru.length > YARDIM_MAKS_SORU) return json(400, { error: `Soru en fazla ${YARDIM_MAKS_SORU} karakter olabilir.` });
        const sonuc = await siteYardimSor(soru);
        if (sonuc.kota) return json(429, { error: sonuc.cevap });
        if (sonuc.hata) return json(503, { error: 'Asistan şu an kullanılamıyor.' });
        return json(200, { cevap: sonuc.cevap });
      } catch (err) {
        console.error('[Yardım API Hatası]', err.message);
        return json(400, { error: 'Geçersiz istek.' });
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Bulunamadı');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP API] Entegrasyon ve canlılık sunucusu 0.0.0.0:${PORT} portunda dinlemede.`);
});

// Beklenmeyen Hataları Yakalama (Çökme Koruması)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Hata Koruması] Yakalanmamış Promise Reddi:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[Hata Koruması] Yakalanmamış İstisna:', err);
  durumGuncelle('error', `Yakalanmamış istisna: ${err.message}`);
});

// Temiz Kapanış (Graceful Shutdown)
let kapaniyor = false;
const cikisYap = async () => {
  if (kapaniyor) return;
  kapaniyor = true;
  console.log('\n[Kage95-Bot] Gölgeye geri dönülüyor... Bot güvenle kapatılıyor.');
  // Render diski kapanınca silinir; son değişiklikler yedeklenmeden çıkılmaz (en fazla 15 sn)
  const { kapanistaYedekle } = await import('./services/kalicilikServisi.js');
  await Promise.race([kapanistaYedekle(), new Promise(r => setTimeout(r, 15000))]).catch(() => null);
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', cikisYap);
process.on('SIGTERM', cikisYap);

// Botu sınırlı retry ile başlat. Kalıcı kimlik hatasında platformun yeniden
// başlatması için process sonlandırılır; health endpoint'i sahte online kalmaz.
async function girisYap() {
  const maxDeneme = 3;
  const loginTimeoutMs = 45000;
  const preflightTimeoutMs = 8000;
  const token = process.env.DISCORD_TOKEN;

  console.log(`[Discord] Login öncesi ağ kontrolü başlıyor (Node ${process.version}).`);
  try {
    const preflight = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${token}`,
        'User-Agent': 'DiscordBot (https://github.com/jagwey/kage-discord-bot, 1.0.0)'
      },
      signal: AbortSignal.timeout(preflightTimeoutMs)
    });
    const preflightBody = await preflight.text();
    if (!preflight.ok) {
      const detay = preflight.status === 401
        ? 'DISCORD_TOKEN geçersiz veya yetkisiz.'
        : `Discord REST HTTP ${preflight.status}.`;
      console.error(`[Discord] Login öncesi REST kontrolü başarısız: ${detay}`);
      if (preflight.status === 401) {
        durumGuncelle('error', detay);
        process.exit(1);
      }
      if (preflight.status !== 429) console.error('[Discord] REST yanıt gövdesi:', preflightBody.slice(0, 300));
    } else {
      console.log('[Discord] Login öncesi REST kontrolü başarılı; Gateway bağlantısı deneniyor.');
    }
  } catch (err) {
    console.error('[Discord] Login öncesi REST kontrolü başarısız:', err.message);
    console.error('[Discord] Render dış ağ/DNS erişimini ve Discord durumunu kontrol edin.');
  }

  for (let deneme = 1; deneme <= maxDeneme; deneme++) {
    durumGuncelle('starting', `Discord'a bağlanılıyor (${deneme}/${maxDeneme}).`);
    try {
      await Promise.race([
        client.login(token),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Discord login ${loginTimeoutMs / 1000} saniyede tamamlanmadı.`)), loginTimeoutMs);
        })
      ]);
      return;
    } catch (err) {
      const mesaj = String(err?.message || err);
      console.error(`[Giriş Hatası] Deneme ${deneme}/${maxDeneme}:`, mesaj);
      if (/invalid token|incorrect login details|401|unauthorized/i.test(mesaj)) {
        durumGuncelle('error', 'DISCORD_TOKEN geçersiz veya yetkisiz.');
        process.exit(1);
      }
      client.destroy();
      if (deneme < maxDeneme) await new Promise(resolve => setTimeout(resolve, deneme * 2000));
    }
  }
  durumGuncelle('error', 'Discord bağlantısı kurulamadı; process yeniden başlatılmalı.');
  process.exitCode = 1;
  process.exit(1);
}

girisYap().catch(err => {
  console.error('[Kritik Giriş Hatası]', err);
  durumGuncelle('error', err.message);
  process.exit(1);
});
