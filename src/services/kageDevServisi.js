import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DEV_STATE_FILE = path.join(DATA_DIR, 'dev_state.json');
const CHANGELOG_FILE = path.join(__dirname, '../data/changelog.json');

/**
 * Güncel changelog verisini yükler
 */
export function changelogYukle() {
  try {
    if (fs.existsSync(CHANGELOG_FILE)) {
      return JSON.parse(fs.readFileSync(CHANGELOG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[KageDev] changelog.json okunamadı:', err.message);
  }
  return {
    version: '1.2.0',
    tarih: new Date().toISOString().split('T')[0],
    baslik: 'Genel Sistem ve Altyapı Güncellemesi',
    gelistirici: 'Jagwey',
    yeniOzellikler: ['Sistem stabilitesi ve performans iyileştirmeleri yapıldı.'],
    duzeltmeler: ['Hata düzeltmeleri tamamlandı.']
  };
}

/**
 * Son duyurulan sürüm bilgisini okur
 */
function sonDuyurulanSurumuGetir() {
  try {
    if (fs.existsSync(DEV_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEV_STATE_FILE, 'utf-8'));
      return data.lastAnnouncedVersion || null;
    }
  } catch (err) {
    console.error('[KageDev] dev_state.json okunamadı:', err.message);
  }
  return null;
}

/**
 * Son duyurulan sürümü kaydeder
 */
function sonDuyurulanSurumuKaydet(version) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DEV_STATE_FILE, JSON.stringify({
      lastAnnouncedVersion: version,
      lastAnnouncedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[KageDev] dev_state.json kaydedilemedi:', err.message);
  }
}

/**
 * Güncelleme notu kartını oluşturur
 */
export function guncellemeKartiOlustur(changelog, client) {
  const ramKullanimi = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const uptimeSaat = (process.uptime() / 3600).toFixed(1);

  const yeniOzelliklerMetni = changelog.yeniOzellikler?.map(o => `• ${o}`).join('\n') || '• Detaylı geliştirme notları mevcut.';
  const duzeltmelerMetni = changelog.duzeltmeler?.map(d => `• ${d}`).join('\n') || '• Çeşitli hata düzeltmeleri yapıldı.';

  const embed = kageEmbed({
    baslik: `⛩️ KAGE GÜNCELLEMESİ YAYINLANDI • v${changelog.version}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**${changelog.baslik}**\n\nGölgeler güçlendi! Kage bot yeni yetenekler, optimizasyonlar ve güvenlik yamalarıyla güncellendi.\n\n*${rastgeleSlogan()}*`,
    thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 256 }),
    alanlar: [
      {
        name: `🚀 Yeni Eklenen Özellikler`,
        value: yeniOzelliklerMetni,
        inline: false
      },
      {
        name: `🛠️ İyileştirmeler & Düzeltmeler`,
        value: duzeltmelerMetni,
        inline: false
      },
      {
        name: `📡 Canlı Sistem Durumu`,
        value: `**Geliştirici:** \`${changelog.gelistirici || 'Jagwey'}\`\n**Gecikme (Ping):** \`${client.ws.ping}ms\`\n**Bellek (RAM):** \`${ramKullanimi} MB\`\n**Açık Kalma Süresi:** \`${uptimeSaat} saat\`\n**Node.js:** \`${process.version}\``,
        inline: false
      }
    ],
    footer: `Kage 95 Discord Botu • Sürüm v${changelog.version} • ${changelog.tarih}`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('GitHub Reposu')
      .setURL('https://github.com/jagwey/kage-discord-bot')
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.KATANA),
    new ButtonBuilder()
      .setLabel('kage95.com')
      .setURL(process.env.SITE_URL || 'https://kage95.com')
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return { embed, row };
}

/**
 * kage-dev kanalını bulur veya otomatik oluşturur
 * @param {import('discord.js').Guild} guild
 */
async function kageDevKanaliniBulVeyaOlustur(guild) {
  // 1. Önce mevcut kanalı ara
  let kanal = guild.channels.cache.find(c => 
    c.isTextBased() && (c.name === 'kage-dev' || c.name === 'kage-geliştirici')
  );

  if (kanal) return kanal;

  // 2. Yoksa yeni oluştur
  try {
    kanal = await guild.channels.create({
      name: 'kage-dev',
      type: ChannelType.GuildText,
      topic: '⛩️ Kage Bot Güncelleme Notları, Geliştirici Günlükleri ve Sistem Raporları',
      reason: 'Kage Bot Otomatik Güncelleme Bildirim Kanalı'
    });
    console.log(`[KageDev] '${guild.name}' sunucusunda yeni #kage-dev kanalı oluşturuldu.`);
    return kanal;
  } catch (err) {
    console.error(`[KageDev] #kage-dev kanalı oluşturulamadı (${guild.name}):`, err.message);
    // Yetki yetersizse sunucudaki ilk metin kanalını yedek olarak kullan
    return guild.channels.cache.find(c => c.isTextBased()) || null;
  }
}

/**
 * Bot başladığında yeni güncelleme varsa #kage-dev kanalında duyurur
 * @param {import('discord.js').Client} client
 * @param {boolean} force
 */
export async function kageDevKontrolEtVeDuyur(client, force = false) {
  try {
    const changelog = changelogYukle();
    const sonSurum = sonDuyurulanSurumuGetir();

    // Sürüm zaten duyurulduysa ve zorlama yoksa tekrar atma
    if (!force && sonSurum === changelog.version) {
      console.log(`[KageDev] Sürüm v${changelog.version} daha önce #kage-dev kanalında duyurulmuş. Pas geçildi.`);
      return;
    }

    const guildId = process.env.GUILD_ID;
    const guilds = guildId ? [await client.guilds.fetch(guildId).catch(() => null)] : [...client.guilds.cache.values()];

    for (const guild of guilds) {
      if (!guild) continue;

      const kanal = await kageDevKanaliniBulVeyaOlustur(guild);
      if (!kanal || !kanal.isTextBased()) continue;

      const { embed, row } = guncellemeKartiOlustur(changelog, client);

      await kanal.send({
        content: `⚔️ **[YENİ GÜNCELLEME]** Kage bot güncellendi! İşte yeni özellikler ve yama detayları:`,
        embeds: [embed],
        components: [row]
      });

      console.log(`[KageDev] v${changelog.version} güncelleme notu #${kanal.name} kanalına iletildi.`);
    }

    sonDuyurulanSurumuKaydet(changelog.version);
  } catch (err) {
    console.error('[KageDev] Güncelleme duyurulurken hata oluştu:', err.message);
  }
}
