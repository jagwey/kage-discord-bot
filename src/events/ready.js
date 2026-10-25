import { ActivityType, Events } from 'discord.js';
import { duyuruServisiniBaslat } from '../services/duyuruServisi.js';
import { kageDevKontrolEtVeDuyur } from '../services/kageDevServisi.js';

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

  // Komutları Discord API'ye otomatik eşitle (Çift komut sorununu önlemek için önce globali temizle)
  try {
    const komutlar = client.commands.map(cmd => cmd.data.toJSON());
    const guildId = process.env.GUILD_ID || '1563941845367787682';

    if (guildId) {
      // Global komutları temizle (Böylece sunucuda her komut iki kez görünmez!)
      await client.application.commands.set([]);
      // Sadece bu sunucuya yükle (Anında ve tekil görünür)
      await client.application.commands.set(komutlar, guildId);
      console.log(`[Kage] ${komutlar.length} komut ${guildId} sunucusuna TEKİL olarak eşitlendi (Çift komutlar temizlendi)! ⚡`);
    } else {
      await client.application.commands.set(komutlar);
      console.log(`[Kage] ${komutlar.length} komut genel olarak eşitlendi.`);
    }
  } catch (err) {
    console.error('[Kage] Komutlar eşitlenirken hata oluştu:', err);
  }

  // Bölüm takip ve duyuru servisini başlat
  duyuruServisiniBaslat(client);

  // #kage-dev kanalı ve otomatik sürüm güncelleme duyurusu kontrolü
  setTimeout(() => {
    kageDevKontrolEtVeDuyur(client);
  }, 3000);
}
