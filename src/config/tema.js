import { EmbedBuilder } from 'discord.js';

/**
 * ⛩️ Kage Tasarım Dili ve Tematik Sabitler
 * Minimalist, samuray & gölge ninjası atmosferi, kan kırmızısı ve derin siyah vurgular.
 */
export const TEMA = {
  ISIM: 'Kage',
  RENKLER: {
    KAN_KIRMIZISI: 0xe53935,     // #e53935 - Ana vurgu rengi
    GOLGE_KIRMIZISI: 0x8e0e15,   // #8e0e15 - Derin karanlık kırmızı
    GOLGE_SIYAHI: 0x0e0c0c,      // #0e0c0c - Near-black arka plan
    ALTIN: 0xd4af37,              // #d4af37 - Samuray altın rütbe vurgusu
    BILGI: 0x2b2d42,              // Koyu füme bilgi rengi
    BASARI: 0x2ecc71,
    HATA: 0xe74c3c
  },
  EMOJILER: {
    TORII: '⛩️',
    KATANA: '🗡️',
    PARSOMEN: '📜',
    GOLGE: '🥷',
    FENER: '🏮',
    KAN: '🩸',
    YILDIZ: '⭐',
    ALEV: '🔥',
    OYUN: '🎮',
    KULLANICI: '👤',
    BAGLANTI: '🔗',
    ZAMAN: '⏳',
    BILGI: 'ℹ️',
    TAC: '👑'
  },
  SLOGANLAR: [
    'Sessizce oku, derinlere in.',
    'Gölgelerin ardındaki gerçekleri arayanlar için...',
    'Kılıç kınında paslanmaz, sayfalar çevrilmeden durmaz.',
    'Karanlığın içinde parlayan kan kırmızısı bir mürekkep.',
    'Gölgenin yolu sabır, kılıcın yolu intikamdır.'
  ],
  URLS: {
    SITE: process.env.SITE_URL || 'https://kage95.com',
    API: process.env.API_BASE_URL || 'https://kage95.com/api',
    LOGOTYPE: 'https://kage95.com/assets/favicon.svg'
  }
};

/**
 * Rastgele bir Kage tematik sloganı döner
 */
export function rastgeleSlogan() {
  const index = Math.floor(Math.random() * TEMA.SLOGANLAR.length);
  return TEMA.SLOGANLAR[index];
}

/**
 * Standartlaştırılmış Kage temalı Discord Embed üretici
 * @param {Object} secenekler Embed yapılandırma seçenekleri
 * @returns {EmbedBuilder}
 */
export function kageEmbed(secenekler = {}) {
  const embed = new EmbedBuilder()
    .setColor(secenekler.renk || TEMA.RENKLER.KAN_KIRMIZISI)
    .setTimestamp();

  if (secenekler.baslik) {
    embed.setTitle(`${TEMA.EMOJILER.TORII} ${secenekler.baslik}`);
  }

  if (secenekler.aciklama) {
    embed.setDescription(secenekler.aciklama);
  }

  if (secenekler.resim) {
    embed.setImage(secenekler.resim);
  }

  if (secenekler.thumbnail) {
    embed.setThumbnail(secenekler.thumbnail);
  }

  if (secenekler.url) {
    embed.setURL(secenekler.url);
  }

  if (secenekler.alanlar && Array.isArray(secenekler.alanlar)) {
    embed.addFields(secenekler.alanlar);
  }

  embed.setFooter({
    text: secenekler.altMetin || `Kage • ${rastgeleSlogan()}`,
    iconURL: secenekler.altIkon || TEMA.URLS.LOGOTYPE
  });

  return embed;
}
