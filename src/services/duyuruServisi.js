import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { tumMangalariGetir, mangaDetayGetir, tamGorselUrl, sonEklenenBolumleriGetir } from './mangaServisi.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const SEEN_DATA_FILE = path.join(DATA_DIR, 'seen_data.json');

// Bellek içi görülmüş manga ve bölümler
let gorulenBolumler = new Set();
let gorulenMangalar = new Set();
let pollerInterval = null;
let ilkCalisma = true;

function gorulenleriYukle() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SEEN_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(SEEN_DATA_FILE, 'utf-8'));
      if (Array.isArray(data.bolumler)) gorulenBolumler = new Set(data.bolumler);
      if (Array.isArray(data.mangalar)) gorulenMangalar = new Set(data.mangalar);
      console.log(`[DuyuruServisi] Hafızadan ${gorulenMangalar.size} manga, ${gorulenBolumler.size} bölüm yüklendi.`);
    }
  } catch (err) {
    console.error('[DuyuruServisi] Görülmüş veriler yüklenirken hata:', err.message);
  }
}

function gorulenleriKaydet() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SEEN_DATA_FILE, JSON.stringify({
      bolumler: [...gorulenBolumler],
      mangalar: [...gorulenMangalar]
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DuyuruServisi] Veriler kaydedilemedi:', err.message);
  }
}

/**
 * Duyuru kanalını dinamik olarak bulur (Asla boş kalmaz!)
 */
export function duyuruKanaliniBul(client) {
  const guildId = process.env.GUILD_ID;
  const guild = (guildId ? client.guilds.cache.get(guildId) : null) || client.guilds.cache.first();
  if (!guild) return null;

  // 1. Ayarlardan kanal ID'si
  const ayarlar = sunucuAyarGetir(guild.id);
  if (ayarlar?.mangaDuyuruKanalId) {
    const k = guild.channels.cache.get(ayarlar.mangaDuyuruKanalId);
    if (k && k.isTextBased()) return k;
  }

  // 2. Çevre değişkeninden
  if (process.env.ANNOUNCEMENT_CHANNEL_ID) {
    const k = guild.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL_ID);
    if (k && k.isTextBased()) return k;
  }

  // 3. Sunucudaki isimlerden otomatik keşfet
  return guild.channels.cache.find(c => 
    c.isTextBased() && (
      c.name.includes('manga-yayın') ||
      c.name.includes('manga-duyuru') ||
      c.name.includes('duyuru') ||
      c.name.includes('manga')
    )
  ) || guild.channels.cache.find(c => c.isTextBased()) || null;
}

/**
 * Yeni manga için duyuru kartı üretir
 */
export function mangaDuyuruKartiOlustur(manga) {
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';
  const mangaUrl = manga.mangaUrl || `${siteUrl}/manga.html?id=${manga.id || manga.mangaId}`;
  const kapak = manga.kapakResmi ? tamGorselUrl(manga.kapakResmi) : `${siteUrl}/favicon.svg`;

  const embed = kageEmbed({
    baslik: `🔥 YENİ MANGA YAYINLANDI • ${manga.mangaAdi}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 kütüphanesine yepyeni bir efsane katıldı! Kılıcını kınından çıkar ve bu kadim seriyi ilk okuyanlardan ol.\n\n` +
      `📖 **Özet:**\n${manga.aciklama || 'Gölge dünyasında unutulmaz bir macera seni bekliyor.'}\n\n` +
      `*${rastgeleSlogan()}*`,
    thumbnail: kapak,
    url: mangaUrl,
    alanlar: [
      { name: '🗡️ Seri Adı', value: `**${manga.mangaAdi}**`, inline: true },
      { name: '🌐 Platform', value: `[kage95.com](${siteUrl})`, inline: true }
    ],
    footer: `Kage 95 Manga Platformu • Yeni Seri Yayını`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Mangayı Oku')
      .setURL(mangaUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN),
    new ButtonBuilder()
      .setLabel('Tüm Kütüphane')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return { embed, row };
}

/**
 * Yeni bölüm duyuru kartı üretir
 */
export function bolumDuyuruKartiOlustur(bolum) {
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';
  const okumaUrl = bolum.okumaUrl || `${siteUrl}/read.html?mangaId=${bolum.mangaId}&chapterId=${bolum.bolumId}`;

  const embed = kageEmbed({
    baslik: `⚡ YENİ BÖLÜM YAYINLANDI • ${bolum.mangaAdi}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 kütüphanesine taze bir parşömen eklendi!\n\n` +
      `${TEMA.EMOJILER.KATANA} **Bölüm:** ${bolum.bolumBaslik || `Bölüm ${bolum.bolumNo}`}\n` +
      `${TEMA.EMOJILER.ZAMAN} **Yayın Saati:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
      `*${rastgeleSlogan()}*`,
    thumbnail: bolum.kapakResmi ? tamGorselUrl(bolum.kapakResmi) : null,
    url: okumaUrl,
    alanlar: [
      { name: '📖 Seri', value: `**${bolum.mangaAdi}**`, inline: true },
      { name: '🌐 Platform', value: `[kage95.com](${siteUrl})`, inline: true }
    ],
    footer: `Kage 95 Otomatik Bölüm Takipçisi`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Hemen Oku')
      .setURL(okumaUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN),
    new ButtonBuilder()
      .setLabel('Kage 95 Kütüphanesi')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return { embed, row };
}

/**
 * Anlık yeni manga duyurusu (Webhook ile çağrılır)
 */
export async function anlikMangaDuyur(client, mangaData) {
  try {
    const kanal = duyuruKanaliniBul(client);
    if (!kanal) throw new Error('Duyuru kanalı bulunamadı.');

    const mangaIdStr = String(mangaData.id || mangaData.mangaId);
    gorulenMangalar.add(mangaIdStr);
    gorulenleriKaydet();

    const { embed, row } = mangaDuyuruKartiOlustur(mangaData);

    const guild = kanal.guild;
    const okurRolu = guild.roles.cache.find(r => r.name.includes('Manga Okuru'));
    const content = okurRolu ? `<@&${okurRolu.id}>` : undefined;

    await kanal.send({
      ...(content ? { content } : {}),
      embeds: [embed],
      components: [row]
    });

    console.log(`[DuyuruServisi] Anlık manga duyuruldu: ${mangaData.mangaAdi}`);
    return { success: true };
  } catch (err) {
    console.error('[DuyuruServisi] Manga duyuru hatası:', err.message);
    throw err;
  }
}

/**
 * Anlık yeni bölüm duyurusu (Webhook ile çağrılır)
 */
export async function anlikBolumDuyur(client, data) {
  try {
    const kanal = duyuruKanaliniBul(client);
    if (!kanal) throw new Error('Duyuru kanalı bulunamadı.');

    const bolumObj = {
      mangaId: data.mangaId,
      mangaAdi: data.mangaAdi || 'Bilinmeyen Seri',
      kapakResmi: data.kapakResmi,
      bolumId: data.bolumId || Date.now(),
      bolumNo: data.bolumNo || 1,
      bolumBaslik: data.bolumAdi || `Bölüm ${data.bolumNo || 1}`,
      okumaUrl: data.okumaUrl
    };

    gorulenBolumler.add(String(bolumObj.bolumId));
    gorulenleriKaydet();

    const { embed, row } = bolumDuyuruKartiOlustur(bolumObj);

    const guild = kanal.guild;
    const okurRolu = guild.roles.cache.find(r => r.name.includes('Manga Okuru'));
    const content = okurRolu ? `<@&${okurRolu.id}>` : undefined;

    await kanal.send({
      ...(content ? { content } : {}),
      embeds: [embed],
      components: [row]
    });

    console.log(`[DuyuruServisi] Anlık bölüm duyuruldu: ${bolumObj.mangaAdi} - ${bolumObj.bolumBaslik}`);
    return { success: true };
  } catch (err) {
    console.error('[DuyuruServisi] Bölüm duyuru hatası:', err.message);
    throw err;
  }
}

/**
 * Genel site duyurusu (Webhook ile çağrılır)
 */
export async function anlikDuyuruDuyur(client, data) {
  try {
    const kanal = duyuruKanaliniBul(client);
    if (!kanal) throw new Error('Duyuru kanalı bulunamadı.');

    const embed = kageEmbed({
      baslik: `📢 SİTE DUYURUSU: ${data.baslik || 'Önemli Bildirim'}`,
      renk: data.onemli ? TEMA.RENKLER.UYARI_SARI : TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: data.icerik || 'Kage 95 platformunda yeni bir duyuru yayınlandı.',
      alanlar: [
        { name: '📜 Kategori', value: `\`${data.etiket || 'Genel'}\``, inline: true },
        { name: '🌐 Platform', value: `[kage95.com](${process.env.SITE_URL || 'https://kage95.com'})`, inline: true }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Kage 95\'e Git')
        .setURL(process.env.SITE_URL || 'https://kage95.com')
        .setStyle(ButtonStyle.Link)
        .setEmoji(TEMA.EMOJILER.TORII)
    );

    await kanal.send({ embeds: [embed], components: [row] });
    return { success: true };
  } catch (err) {
    console.error('[DuyuruServisi] Site duyuru hatası:', err.message);
    throw err;
  }
}

/**
 * Rol senkronizasyonu
 */
export async function anlikRolGuncelle(client, data) {
  try {
    const { discordId, okunanBolumSayisi = 0, puan = 0 } = data;
    if (!discordId) return;

    // Site okuma XP'si -> Ryo (idempotent, yalnızca artış ödenir)
    let ryoKredi = 0;
    try {
      const { siteXpKrediEt } = await import('./ekonomiServisi.js');
      ryoKredi = siteXpKrediEt(discordId, puan, okunanBolumSayisi).eklenen;
      if (ryoKredi > 0) console.log(`[RolSync] ${discordId} site XP -> +${ryoKredi} Ryo`);
    } catch (err) {
      console.error('[RolSync] Ryo kredisi hatası:', err.message);
    }

    const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
    if (!guild) return { ryoKredi };

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return { ryoKredi };

    let hedefRolAdi = 'Shinobi';
    if (okunanBolumSayisi >= 300 || puan >= 3000) hedefRolAdi = 'Kage Efsanesi';
    else if (okunanBolumSayisi >= 150 || puan >= 1500) hedefRolAdi = 'Jonin Komutanı';
    else if (okunanBolumSayisi >= 50 || puan >= 500) hedefRolAdi = 'Chunin Kıdemlisi';
    else if (okunanBolumSayisi >= 15 || puan >= 150) hedefRolAdi = 'Genin Savaşçısı';

    const rol = guild.roles.cache.find(r => r.name.toLowerCase().includes(hedefRolAdi.toLowerCase()));
    if (rol && !member.roles.cache.has(rol.id)) {
      await member.roles.add(rol);
      console.log(`[RolSync] ${member.user.tag} -> ${hedefRolAdi}`);
    }
    return { ryoKredi, rol: hedefRolAdi };
  } catch (err) {
    console.error('[RolSync] Hata:', err.message);
  }
}

/**
 * Arka plan otomatik periyodik tarama (Hem manga hem bölüm kontrolü)
 */
export async function periyodikKontrolEtVeDuyur(client) {
  try {
    const kanal = duyuruKanaliniBul(client);
    if (!kanal) return;

    // 1. Mangaları Kontrol Et
    const mangalar = await tumMangalariGetir();
    if (Array.isArray(mangalar)) {
      if (ilkCalisma && gorulenMangalar.size === 0) {
        for (const m of mangalar) gorulenMangalar.add(String(m.id));
      } else {
        for (const m of mangalar) {
          const mId = String(m.id);
          if (!gorulenMangalar.has(mId)) {
            gorulenMangalar.add(mId);
            gorulenleriKaydet();
            await anlikMangaDuyur(client, m).catch(() => {});
          }
        }
      }
    }

    // 2. Bölümleri Kontrol Et
    const sonBolumler = await sonEklenenBolumleriGetir();
    if (Array.isArray(sonBolumler)) {
      if (ilkCalisma && gorulenBolumler.size === 0) {
        for (const b of sonBolumler) gorulenBolumler.add(String(b.bolumId));
      } else {
        for (const b of sonBolumler) {
          const bId = String(b.bolumId);
          if (!gorulenBolumler.has(bId)) {
            gorulenBolumler.add(bId);
            gorulenleriKaydet();
            await anlikBolumDuyur(client, b).catch(() => {});
          }
        }
      }
    }

    if (ilkCalisma) {
      gorulenleriKaydet();
      ilkCalisma = false;
      console.log(`[DuyuruServisi] İlk tarama tamamlandı: ${gorulenMangalar.size} manga, ${gorulenBolumler.size} bölüm indekslendi.`);
    }
  } catch (err) {
    console.error('[DuyuruServisi] Periyodik tarama hatası:', err.message);
  }
}

/**
 * Arka plan zamanlayıcısını başlatır
 */
export function duyuruServisiniBaslat(client) {
  gorulenleriYukle();

  console.log('[DuyuruServisi] Akıllı manga ve bölüm poller aktif edildi.');

  // İlk kontrol 15 saniye sonra
  setTimeout(() => {
    periyodikKontrolEtVeDuyur(client);
  }, 15000);

  // Her 3 dakikada bir kontrol et
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(() => {
    periyodikKontrolEtVeDuyur(client);
  }, 3 * 60 * 1000);
}

/**
 * Test amaçlı simülasyon
 */
export async function duyuruTestEt(client, kanalId) {
  const kanal = await client.channels.fetch(kanalId);
  if (!kanal || !kanal.isTextBased()) throw new Error('Kanal bulunamadı.');

  const { embed, row } = mangaDuyuruKartiOlustur({
    id: 1,
    mangaAdi: 'Kage 95 (TEST SERİSİ)',
    kapakResmi: null,
    aciklama: 'Bu bir test manga duyurusudur. Sistem tıkır tıkır çalışıyor!'
  });

  await kanal.send({
    content: '⛩️ **[TEST DUYURUSU]** Sistem yeni manga bildirim simülasyonu:',
    embeds: [embed],
    components: [row]
  });
}
