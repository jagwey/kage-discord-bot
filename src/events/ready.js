import { ActivityType, Events } from 'discord.js';
import { duyuruServisiniBaslat } from '../services/duyuruServisi.js';

export const name = Events.ClientReady;
export const once = true;

/**
 * Bot Discord Gateway'e bağlandığında çalışır
 * @param {import('discord.js').Client} client
 */
export async function execute(client) {
  const banner = `
  ██╗  ██╗ █████╗  ██████╗ ███████╗
  ██║ ██╔╝██╔══██╗██╔════╝ ██╔════╝
  █████╔╝ ███████║██║  ███╗█████╗  
  ██╔═██╗ ██╔══██║██║   ██║██╔══╝  
  ██║  ██╗██║  ██║╚██████╔╝███████╗
  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
       ⛩️  K  A  G  E  •  B O T  ⛩️
  `;

  console.log(banner);
  console.log(`[Kage] Gölge ninjası uyandı! Giriş yapıldı: ${client.user.tag}`);
  console.log(`[Kage] Toplam Sunucu: ${client.guilds.cache.size} | Toplam Kullanıcı: ${client.users.cache.size}`);

  // Bot durumunu ve aktivitesini ayarla
  client.user.setPresence({
    activities: [
      {
        name: '⛩️ Kage | /yardim',
        type: ActivityType.Custom,
        state: '🩸 Gölgelerin efendisi devrede... /yardim'
      }
    ],
    status: 'online'
  });

  // Komutları Discord API'ye otomatik eşitle (Deploy)
  try {
    const komutlar = client.commands.map(cmd => cmd.data.toJSON());
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      const targetGuild = await client.guilds.fetch(guildId).catch(() => null);
      if (targetGuild) {
        await targetGuild.commands.set(komutlar);
        console.log(`[Kage] ${komutlar.length} komut belirtilen sunucuya (${guildId}) eşitlendi.`);
      } else {
        await client.application.commands.set(komutlar);
        console.log(`[Kage] ${komutlar.length} komut genel (global) olarak eşitlendi.`);
      }
    } else {
      await client.application.commands.set(komutlar);
      console.log(`[Kage] ${komutlar.length} komut genel (global) olarak eşitlendi.`);
    }
  } catch (err) {
    console.error('[Kage] Komutlar eşitlenirken hata oluştu:', err);
  }

  // Bölüm takip ve duyuru servisini başlat
  duyuruServisiniBaslat(client);
}
