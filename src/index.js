import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';

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

client.commands = new Collection();

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
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
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
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'kage95_secret_key';

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
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
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

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Bulunamadı');
}).listen(PORT, () => {
  console.log(`[HTTP API] Entegrasyon ve canlılık sunucusu ${PORT} portunda dinlemede.`);
});

// Beklenmeyen Hataları Yakalama (Çökme Koruması)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Hata Koruması] Yakalanmamış Promise Reddi:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[Hata Koruması] Yakalanmamış İstisna:', err);
});

// Temiz Kapanış (Graceful Shutdown)
const cikisYap = () => {
  console.log('\n[Kage95-Bot] Gölgeye geri dönülüyor... Bot güvenle kapatılıyor.');
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', cikisYap);
process.on('SIGTERM', cikisYap);

// Botu Başlat
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('\n❌ [Giriş Hatası] Discord\'a bağlanılamadı:');
  console.error(err.message);
  console.error('Lütfen .env dosyasındaki DISCORD_TOKEN değerinin doğruluğunu teyit edin.\n');
});
