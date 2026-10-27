import { ActivityType, Events } from 'discord.js';
import { duyuruServisiniBaslat } from '../services/duyuruServisi.js';
import { kageDevKontrolEtVeDuyur } from '../services/kageDevServisi.js';
import { hafizaServisiniBaslat } from '../services/kageHafizaServisi.js';
import { hatirlaticiServisiniBaslat } from '../services/hatirlaticiServisi.js';
import { cekilisServisiniBaslat } from '../services/cekilisServisi.js';
import { golgeGozServisiniBaslat } from '../services/golgeGozServisi.js';
import { toplulukServisiniBaslat } from '../services/toplulukServisi.js';

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

  // Komutları Discord API'ye otomatik eşitle (Tüm bağlı sunuculara anında yükle)
  try {
    const komutlar = client.commands.map(cmd => cmd.data.toJSON());
    
    // 1. Botun bulunduğu TÜM sunuculara anında komutları yükle (0 saniye bekleme)
    for (const [gId, guild] of client.guilds.cache) {
      try {
        await client.application.commands.set(komutlar, gId);
        console.log(`[Kage] ${komutlar.length} komut "${guild.name}" (${gId}) sunucusuna anında yüklendi! ⚡`);
      } catch (err) {
        console.warn(`[Kage] ${guild.name} sunucusuna komut yüklenemedi:`, err.message);
      }
    }

    // 2. Global (genel) komutları temizle (Çift görünme sorununu %100 çözer!)
    await client.application.commands.set([]);
    console.log(`[Kage] Eski genel komutlar temizlendi, çift görünme engellendi.`);
  } catch (err) {
    console.error('[Kage] Komutlar eşitlenirken hata oluştu:', err);
  }

  // Bölüm takip ve duyuru servisini başlat
  duyuruServisiniBaslat(client);

  // Kage AI Derin Hafıza & Günlük Öğrenme Servisini Başlat
  hafizaServisiniBaslat(client);

  // Kullanıcı hatırlatıcılarını periyodik kontrolle vakti gelince gönder
  hatirlaticiServisiniBaslat(client);

  // Süresi dolan çekilişleri bitirip kazananları duyurur (yeniden başlatmada da devam eder)
  cekilisServisiniBaslat(client);

  // Kage-95 Gölge Gözü: Tüm sunucuyu arka planda izleyen ve otonom öğrenen nöbetçi
  golgeGozServisiniBaslat(client);

  // Doğum günü kutlaması, haftalık sahip raporu ve kayıtsız hatırlatma
  toplulukServisiniBaslat(client);

  // #kage-dev kanalı ve otomatik sürüm güncelleme duyurusu kontrolü
  setTimeout(() => {
    kageDevKontrolEtVeDuyur(client);
  }, 3000);
}
