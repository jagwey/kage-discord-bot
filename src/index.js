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
