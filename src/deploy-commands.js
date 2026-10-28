import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import { ajan } from './ag.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Hata: DISCORD_TOKEN ve CLIENT_ID .env dosyasında tanımlı olmalıdır!');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[UYARI] ${file} dosyasında 'data' veya 'execute' eksik.`);
  }
}

const rest = new REST({ version: '10', agent: ajan }).setToken(token);

(async () => {
  try {
    console.log(`⛩️ ${commands.length} adet eğik çizgi (/) komutu Discord API'ye yükleniyor...`);

    if (guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Başarılı! ${data.length} komut yerel sunucuya (${guildId}) tekil olarak yüklendi.`);
    } else {
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Başarılı! ${data.length} komut genel (global) olarak Discord API'ye yüklendi.`);
    }
  } catch (error) {
    console.error('❌ Komutlar yüklenirken bir hata oluştu:', error);
  }
})();
