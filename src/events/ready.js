import { ActivityType, Events } from 'discord.js';
import { duyuruServisiniBaslat } from '../services/duyuruServisi.js';
import { kageDevKontrolEtVeDuyur } from '../services/kageDevServisi.js';
import { hafizaServisiniBaslat } from '../services/kageHafizaServisi.js';
import { hatirlaticiServisiniBaslat } from '../services/hatirlaticiServisi.js';
import { cekilisServisiniBaslat } from '../services/cekilisServisi.js';
import { golgeGozServisiniBaslat } from '../services/golgeGozServisi.js';
import { toplulukServisiniBaslat } from '../services/toplulukServisi.js';
import { etkinlikServisiniBaslat } from '../services/etkinlikServisi.js';

export const name = Events.ClientReady;
export const once = true;
let komutSyncZamanlayici = null;
let komutSyncCalisiyor = false;

async function komutlariEslestir(client) {
  const komutlar = client.commands.map(cmd => cmd.data.toJSON());
  const guildId = process.env.GUILD_ID;
  const otomatikGuildId = !guildId && client.guilds.cache.size === 1
    ? client.guilds.cache.first().id
    : null;
  const hedefGuildId = guildId || otomatikGuildId;

  if (hedefGuildId) {
    const guild = client.guilds.cache.get(hedefGuildId);
    if (!guild) {
      console.warn(`[Kage] GUILD_ID=${hedefGuildId} botun bağlı olduğu sunucular arasında bulunamadı.`);
      return;
    }
    await client.application.commands.set(komutlar, hedefGuildId);
    console.log(`[Kage] ${komutlar.length} komut "${guild.name}" sunucusuna yüklendi.`);
    return;
  }

  await client.application.commands.set(komutlar);
  console.log(`[Kage] ${komutlar.length} komut global olarak eşitlendi.`);
}

/**
 * Bot Discord Gateway'e bağlandığında çalışır
 * @param {import('discord.js').Client} client
 */
export async function execute(client) {
  globalThis.__kageDurum = {
    ...(globalThis.__kageDurum || {}),
    durum: 'online',
    detay: 'Discord Gateway bağlantısı hazır.',
    sonDegisim: new Date().toISOString()
  };
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

  // Devam eden istek bitmeden yenisini başlatma; discord.js 429 beklemesini yönetir.
  const komutSyncBaslat = () => {
    if (komutSyncCalisiyor) return;
    komutSyncCalisiyor = true;
    komutlariEslestir(client)
      .catch(err => {
        console.error('[Kage] Komutlar eşitlenemedi:', err.message);
        if (!komutSyncZamanlayici) {
          komutSyncZamanlayici = setTimeout(() => {
            komutSyncZamanlayici = null;
            komutSyncBaslat();
          }, 30_000);
        }
      })
      .finally(() => {
        komutSyncCalisiyor = false;
      });
  };
  komutSyncBaslat();

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
  etkinlikServisiniBaslat(client);

  // #kage-dev kanalı ve otomatik sürüm güncelleme duyurusu kontrolü
  setTimeout(() => {
    kageDevKontrolEtVeDuyur(client).catch(err => {
      console.warn('[KageDev] Başlangıç kontrolü başarısız:', err.message);
    });
  }, 3000);
}
