import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'sunucu_ayarlari.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'uyarilar.json');

// Bellek içi durumlar
let ayarlarOnbellegi = {};
let uyarilarOnbellegi = {};

function dizinleriHazirla() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Dosyadan ayarları yükle
export function ayarlariYukle() {
  dizinleriHazirla();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      ayarlarOnbellegi = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
    if (fs.existsSync(WARNINGS_FILE)) {
      uyarilarOnbellegi = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[VeritabaniServisi] Yükleme hatası:', err.message);
  }
}

// Sunucu ayarlarını getir
export function sunucuAyarGetir(guildId) {
  if (!ayarlarOnbellegi[guildId]) {
    ayarlarOnbellegi[guildId] = {
      modLogKanalId: process.env.MOD_LOG_CHANNEL_ID || null,
      otoRolId: process.env.AUTO_ROLE_ID || null,
      hosgeldinKanalId: process.env.WELCOME_CHANNEL_ID || null,
      aiYonetimKanalId: process.env.AI_ADMIN_CHANNEL_ID || null
    };
  }
  return ayarlarOnbellegi[guildId];
}

// Sunucu ayarlarını güncelle
export function sunucuAyarGuncelle(guildId, yeniAyarlar) {
  dizinleriHazirla();
  const mevcut = sunucuAyarGetir(guildId);
  ayarlarOnbellegi[guildId] = { ...mevcut, ...yeniAyarlar };

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(ayarlarOnbellegi, null, 2), 'utf-8');
  } catch (err) {
    console.error('[VeritabaniServisi] Ayarlar kaydedilemedi:', err.message);
  }
  return ayarlarOnbellegi[guildId];
}

// Üyeye uyarı ekle
export function uyariEkle(guildId, userId, sebep, yetkiliId) {
  dizinleriHazirla();
  const key = `${guildId}_${userId}`;
  if (!uyarilarOnbellegi[key]) {
    uyarilarOnbellegi[key] = [];
  }

  const yeniUyari = {
    id: `uyari_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    sebep: sebep || 'Sebep belirtilmedi.',
    yetkiliId,
    tarih: new Date().toISOString()
  };

  uyarilarOnbellegi[key].push(yeniUyari);

  try {
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(uyarilarOnbellegi, null, 2), 'utf-8');
  } catch (err) {
    console.error('[VeritabaniServisi] Uyarı kaydedilemedi:', err.message);
  }

  return uyarilarOnbellegi[key];
}

// Üyenin uyarılarını getir
export function uyarilariGetir(guildId, userId) {
  const key = `${guildId}_${userId}`;
  return uyarilarOnbellegi[key] || [];
}

// Üyenin tüm uyarılarını temizle
export function uyarilariTemizle(guildId, userId) {
  dizinleriHazirla();
  const key = `${guildId}_${userId}`;
  const silinenSayisi = (uyarilarOnbellegi[key] || []).length;
  delete uyarilarOnbellegi[key];

  try {
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(uyarilarOnbellegi, null, 2), 'utf-8');
  } catch (err) {
    console.error('[VeritabaniServisi] Uyarılar temizlenemedi:', err.message);
  }

  return silinenSayisi;
}

// İlk yükleme
ayarlariYukle();
