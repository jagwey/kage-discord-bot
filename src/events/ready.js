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
       ⛩️  K  A  G  E  -  9  5  ⛩️
  `;

  console.log(banner);
  console.log(`[Kage-95] Gölge ninjası uyandı! Giriş yapıldı: ${client.user.tag}`);
  console.log(`[Kage-95] Toplam Sunucu: ${client.guilds.cache.size} | Toplam Kullanıcı: ${client.users.cache.size}`);

  // Bot durumunu ve aktivitesini ayarla
  client.user.setPresence({
    activities: [
      {
        name: '⛩️ Kage-95 | /yardim',
        type: ActivityType.Custom,
        state: '🩸 Gölgelerin efendisi devrede... /yardim'
      }
    ],
    status: 'online'
  });

  // Komutları Discord API'ye otomatik eşitle (Deploy)
  try {
    const komutlar = client.commands.map(cmd => cmd.data.toJSON());
    const guildId = process.env.GUILD_ID || '1563941845367787682';

    if (guildId) {
      await client.application.commands.set(komutlar, guildId);
      console.log(`[Kage-95] ${komutlar.length} komut sunucuna (${guildId}) ANINDA eşitlendi! ⚡`);

      // Çift komut oluşmasını engellemek için global komut listesini boşalt
      try {
        const globalKomutlar = await client.application.commands.fetch();
        if (globalKomutlar.size > 0) {
          await client.application.commands.set([]);
          console.log('[Kage-95] Eski genel komutlar temizlendi (çift komut önlendi).');
        }
      } catch (temizleHata) {
        // İsteğe bağlı
      }
    } else {
      await client.application.commands.set(komutlar);
      console.log(`[Kage-95] ${komutlar.length} komut genel (global) olarak eşitlendi.`);
    }
  } catch (err) {
    console.error('[Kage-95] Komutlar eşitlenirken hata oluştu:', err);
  }

  // Bölüm takip ve duyuru servisini başlat
  duyuruServisiniBaslat(client);
}
