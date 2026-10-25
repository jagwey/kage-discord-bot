import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { tumMangalariGetir, mangaDetayGetir, tamGorselUrl, sonEklenenBolumleriGetir } from './mangaServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const SEEN_CHAPTERS_FILE = path.join(DATA_DIR, 'seen_chapters.json');

// Bellek içi görülmüş bölümler seti
let gorulenBolumler = new Set();
let pollerInterval = null;
let ilkCalisma = true;

/**
 * Görülmüş bölümleri yerel diskten yükler
 */
function gorulenleriYukle() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SEEN_CHAPTERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SEEN_CHAPTERS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        gorulenBolumler = new Set(data);
        console.log(`[DuyuruServisi] Önbellekten ${gorulenBolumler.size} görülmüş bölüm yüklendi.`);
      }
    }
  } catch (err) {
    console.error('[DuyuruServisi] Görülmüş bölümler yüklenirken hata:', err.message);
  }
}

/**
 * Görülmüş bölümleri yerel diske kaydeder
 */
function gorulenleriKaydet() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SEEN_CHAPTERS_FILE, JSON.stringify([...gorulenBolumler]), 'utf-8');
  } catch (err) {
    console.error('[DuyuruServisi] Görülmüş bölümler kaydedilemedi:', err.message);
  }
}

/**
 * Tekil bir bölüm duyurusu için şık Discord embed ve okuma butonu üretir
 * @param {Object} bolum
 * @returns {{ embed: import('discord.js').EmbedBuilder, row: ActionRowBuilder }}
 */
export function bolumDuyuruKartiOlustur(bolum) {
  const embed = kageEmbed({
    baslik: `YENİ BÖLÜM YAYINLANDI • ${bolum.mangaAdi}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 kütüphanesine yeni bir parşömen eklendi. Kılıcını hazırla ve gölgelerin arasına dal!\n\n${TEMA.EMOJILER.KATANA} **Bölüm:** ${bolum.bolumBaslik || `Bölüm ${bolum.bolumNo}`}\n${TEMA.EMOJILER.ZAMAN} **Yayın Tarihi:** <t:${Math.floor(new Date(bolum.eklenmeTarihi || Date.now()).getTime() / 1000)}:R>`,
    thumbnail: bolum.kapakResmi,
    url: bolum.okumaUrl,
    alanlar: [
      {
        name: `${TEMA.EMOJILER.PARSOMEN} Manga Bilgisi`,
        value: `**${bolum.mangaAdi}** serisinin son gelişmeleri Kage 95'te yayında.`,
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.FENER} Platform`,
        value: `[kage95.com](${process.env.SITE_URL || 'https://kage95.com'})`,
        inline: true
      },
      {
        name: `${TEMA.EMOJILER.GOLGE} Slogan`,
        value: `*${rastgeleSlogan()}*`,
        inline: true
      }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Hemen Oku')
      .setURL(bolum.okumaUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN),
    new ButtonBuilder()
      .setLabel('Kage 95 Kütüphanesi')
      .setURL(process.env.SITE_URL || 'https://kage95.com')
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return { embed, row };
}

/**
 * Otomatik bölüm tarama ve duyurma mekanizmasını çalıştırır
 * @param {import('discord.js').Client} client
 */
export async function bolumleriKontrolEtVeDuyur(client) {
  const kanalId = process.env.ANNOUNCEMENT_CHANNEL_ID;
  if (!kanalId) {
    return;
  }

  try {
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (!kanal || !kanal.isTextBased()) {
      return;
    }

    const sonBolumler = await sonEklenenBolumleriGetir();

    // Bot ilk kez açıldığında kanalı flood yapmamak için mevcut bölümleri kaydet
    if (ilkCalisma && gorulenBolumler.size === 0) {
      for (const b of sonBolumler) {
        gorulenBolumler.add(String(b.bolumId));
      }
      gorulenleriKaydet();
      ilkCalisma = false;
      console.log(`[DuyuruServisi] İlk başlatma: ${sonBolumler.length} mevcut bölüm indekslendi.`);
      return;
    }
    ilkCalisma = false;

    // Yeni olanları tespit et
    for (const bolum of sonBolumler) {
      const bKey = String(bolum.bolumId);
      if (!gorulenBolumler.has(bKey)) {
        gorulenBolumler.add(bKey);
        gorulenleriKaydet();

        const { embed, row } = bolumDuyuruKartiOlustur(bolum);

        const rolId = process.env.ANNOUNCEMENT_ROLE_ID;
        const mesajIcerik = rolId ? `<@&${rolId}>` : null;

        await kanal.send({
          content: mesajIcerik,
          embeds: [embed],
          components: [row]
        });

        console.log(`[DuyuruServisi] Yeni bölüm duyuruldu: ${bolum.mangaAdi} - Bölüm ${bolum.bolumNo}`);
      }
    }
  } catch (err) {
    console.error('[DuyuruServisi] Bölüm kontrol döngüsünde hata:', err.message);
  }
}

/**
 * Test amaçlı anında bir duyuru kartı gönderir
 * @param {import('discord.js').Client} client
 * @param {string} kanalId
 */
export async function duyuruTestEt(client, kanalId) {
  const kanal = await client.channels.fetch(kanalId);
  if (!kanal || !kanal.isTextBased()) {
    throw new Error('Hedef metin kanalı bulunamadı veya erişilemez.');
  }

  // Canlı API'den ilk mangayı örnek al
  const mangalar = await tumMangalariGetir();
  const ornekManga = mangalar[0] || {
    id: 10,
    mangaAdi: 'Berserk',
    kapakResmiURL: '/uploads/berserk.jpg'
  };

  const ornekBolum = {
    mangaId: ornekManga.id,
    mangaAdi: ornekManga.mangaAdi,
    kapakResmi: tamGorselUrl(ornekManga.kapakResmiURL),
    bolumId: `test-${Date.now()}`,
    bolumNo: 375,
    bolumBaslik: 'Bölüm 375: Gölgelerin Uyanışı (TEST DUYURUSU)',
    eklenmeTarihi: new Date().toISOString(),
    okumaUrl: `${process.env.SITE_URL || 'https://kage95.com'}/manga/${ornekManga.id}`
  };

  const { embed, row } = bolumDuyuruKartiOlustur(ornekBolum);
  await kanal.send({
    content: `${TEMA.EMOJILER.TORII} **[TEST BİLDİRİMİ]** Aşağıda yeni bölüm duyuru kartı simüle edilmiştir:`,
    embeds: [embed],
    components: [row]
  });
}

/**
 * Arka plan zamanlayıcısını başlatır
 * @param {import('discord.js').Client} client
 */
export function duyuruServisiniBaslat(client) {
  gorulenleriYukle();

  const aralikDakika = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10);
  const aralikMs = Math.max(aralikDakika, 1) * 60 * 1000;

  console.log(`[DuyuruServisi] Arka plan bölüm poller aktif edildi (${aralikDakika} dakikada bir kontrol edilecek).`);

  // İlk kontrolü 10 saniye sonra yap
  setTimeout(() => {
    bolumleriKontrolEtVeDuyur(client);
  }, 10000);

  // Periyodik döngü
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(() => {
    bolumleriKontrolEtVeDuyur(client);
  }, aralikMs);
}

/**
 * Web sitesinden (ASP.NET backend) gelen anlık yeni bölüm bildirimini Discord'a iletir
 * @param {import('discord.js').Client} client
 * @param {Object} data
 */
export async function anlikBolumDuyur(client, data) {
  try {
    let kanalId = process.env.ANNOUNCEMENT_CHANNEL_ID;
    let kanal = null;

    if (kanalId) {
      kanal = await client.channels.fetch(kanalId).catch(() => null);
    }

    // Hedef kanal env'de yoksa sunucudaki ilk uygun kanalı bul
    if (!kanal || !kanal.isTextBased()) {
      const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
      if (guild) {
        kanal = guild.channels.cache.find(c => 
          c.isTextBased() && (c.name.includes('duyuru') || c.name.includes('manga') || c.name.includes('genel'))
        ) || guild.channels.cache.find(c => c.isTextBased());
      }
    }

    if (!kanal) {
      throw new Error('Duyuru gönderilecek uygun bir Discord metin kanalı bulunamadı.');
    }

    const bolumObj = {
      mangaId: data.mangaId,
      mangaAdi: data.mangaAdi || 'Bilinmeyen Seri',
      kapakResmi: data.kapakResmi ? tamGorselUrl(data.kapakResmi) : null,
      bolumId: data.bolumId || Date.now(),
      bolumNo: data.bolumNo || 1,
      bolumBaslik: data.bolumAdi || `Bölüm ${data.bolumNo || 1}`,
      eklenmeTarihi: new Date().toISOString(),
      okumaUrl: data.okumaUrl || `${process.env.SITE_URL || 'https://kage95.com'}/read.html?mangaId=${data.mangaId}&chapterId=${data.bolumId}`
    };

    // Bölüm ID'sini görüldü olarak kaydet ki poller tekrar atmasın
    gorulenBolumler.add(String(bolumObj.bolumId));
    gorulenleriKaydet();

    const { embed, row } = bolumDuyuruKartiOlustur(bolumObj);

    const rolId = process.env.ANNOUNCEMENT_ROLE_ID;
    const mesajIcerik = rolId ? `<@&${rolId}>` : null;

    const gonderilen = await kanal.send({
      content: mesajIcerik,
      embeds: [embed],
      components: [row]
    });

    console.log(`[DuyuruServisi - WEBHOOK] Anlık bölüm yayınlandı: ${bolumObj.mangaAdi} - Bölüm ${bolumObj.bolumNo}`);
    return { success: true, messageId: gonderilen.id, channelId: kanal.id };
  } catch (err) {
    console.error('[DuyuruServisi - WEBHOOK] Bölüm bildirimi gönderilirken hata:', err.message);
    throw err;
  }
}

/**
 * Web sitesinden gelen genel site duyurusunu Discord'a iletir
 * @param {import('discord.js').Client} client
 * @param {Object} data
 */
export async function anlikDuyuruDuyur(client, data) {
  try {
    let kanalId = process.env.ANNOUNCEMENT_CHANNEL_ID;
    let kanal = null;

    if (kanalId) {
      kanal = await client.channels.fetch(kanalId).catch(() => null);
    }

    if (!kanal || !kanal.isTextBased()) {
      const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
      if (guild) {
        kanal = guild.channels.cache.find(c => 
          c.isTextBased() && (c.name.includes('duyuru') || c.name.includes('genel'))
        ) || guild.channels.cache.find(c => c.isTextBased());
      }
    }

    if (!kanal) {
      throw new Error('Duyuru gönderilecek uygun bir Discord metin kanalı bulunamadı.');
    }

    const embed = kageEmbed({
      baslik: `📢 SİTE DUYURUSU: ${data.baslik || 'Önemli Bildirim'}`,
      renk: data.onemli ? TEMA.RENKLER.UYARI_SARI : TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: data.icerik || 'Kage 95 platformunda yeni bir duyuru yayınlandı.',
      alanlar: [
        {
          name: `${TEMA.EMOJILER.PARSOMEN} Kategori / Etiket`,
          value: `\`${data.etiket || 'Genel'}\``,
          inline: true
        },
        {
          name: `${TEMA.EMOJILER.FENER} Platform`,
          value: `[kage95.com](${process.env.SITE_URL || 'https://kage95.com'})`,
          inline: true
        }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Kage 95\'e Git')
        .setURL(process.env.SITE_URL || 'https://kage95.com')
        .setStyle(ButtonStyle.Link)
        .setEmoji(TEMA.EMOJILER.TORII)
    );

    const gonderilen = await kanal.send({
      embeds: [embed],
      components: [row]
    });

    console.log(`[DuyuruServisi - WEBHOOK] Site duyurusu yayınlandı: ${data.baslik}`);
    return { success: true, messageId: gonderilen.id };
  } catch (err) {
    console.error('[DuyuruServisi - WEBHOOK] Duyuru gönderilirken hata:', err.message);
    throw err;
  }
}

/**
 * Web sitesindeki okuma puanı ve seviyeye göre Discord kullanıcısının rolünü senkronize eder
 * @param {import('discord.js').Client} client
 * @param {Object} data
 */
export async function anlikRolGuncelle(client, data) {
  try {
    const { discordId, okunanBolumSayisi = 0, puan = 0, unvan } = data;
    if (!discordId) throw new Error('discordId parametresi zorunludur.');

    const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
    if (!guild) throw new Error('Discord sunucusu bulunamadı.');

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      return { success: false, message: 'Kullanıcı bu Discord sunucusunda bulunamadı.' };
    }

    // Seviye Rütbe Eşleşmeleri
    let hedefRolAdi = 'Shinobi';
    if (okunanBolumSayisi >= 300 || puan >= 3000) hedefRolAdi = 'Kage';
    else if (okunanBolumSayisi >= 150 || puan >= 1500) hedefRolAdi = 'Jonin';
    else if (okunanBolumSayisi >= 50 || puan >= 500) hedefRolAdi = 'Chunin';
    else if (okunanBolumSayisi >= 15 || puan >= 150) hedefRolAdi = 'Genin';

    // Sunucuda bu isimde rol var mı kontrol et, yoksa oluşturmayı dene
    let rol = guild.roles.cache.find(r => r.name.toLowerCase() === hedefRolAdi.toLowerCase());
    if (!rol) {
      try {
        rol = await guild.roles.create({
          name: hedefRolAdi,
          color: hedefRolAdi === 'Kage' ? '#e53935' : hedefRolAdi === 'Jonin' ? '#d32f2f' : '#b0bec5',
          reason: 'Kage Otomatik Manga Okuma Rütbesi'
        });
      } catch (err) {
        console.warn(`[RolSync] ${hedefRolAdi} rolü otomatik oluşturulamadı:`, err.message);
      }
    }

    if (rol && !member.roles.cache.has(rol.id)) {
      await member.roles.add(rol);
      console.log(`[RolSync] ${member.user.tag} kullanıcısına '${hedefRolAdi}' rolü verildi.`);
    }

    return { success: true, member: member.user.tag, hedefRol: hedefRolAdi };
  } catch (err) {
    console.error('[RolSync] Rol senkronizasyon hatası:', err.message);
    throw err;
  }
}
