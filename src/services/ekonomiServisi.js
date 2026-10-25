import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const EKONOMI_FILE = path.join(DATA_DIR, 'ekonomi.json');

let ekonomiVerisi = {};

function veriyiYukle() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(EKONOMI_FILE)) {
      ekonomiVerisi = JSON.parse(fs.readFileSync(EKONOMI_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[Ekonomi] Veri yüklenemedi:', err.message);
    ekonomiVerisi = {};
  }
}

function veriyiKaydet() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EKONOMI_FILE, JSON.stringify(ekonomiVerisi, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Ekonomi] Veri kaydedilemedi:', err.message);
  }
}

veriyiYukle();

function kullaniciHesabi(userId) {
  if (!ekonomiVerisi[userId]) {
    ekonomiVerisi[userId] = {
      ryo: 100, // Başlangıç hediyesi 100 Ryo
      banka: 0,
      streak: 0,
      sonGunluk: null,
      duelloZafer: 0,
      duelloMaglubiyet: 0,
      zindanZafer: 0,
      envanter: [],
      guncellemeTarihi: new Date().toISOString()
    };
    veriyiKaydet();
  }
  return ekonomiVerisi[userId];
}

export function bakiyeGetir(userId) {
  const h = kullaniciHesabi(userId);
  return {
    ryo: h.ryo || 0,
    banka: h.banka || 0,
    toplam: (h.ryo || 0) + (h.banka || 0),
    streak: h.streak || 0,
    duelloZafer: h.duelloZafer || 0,
    duelloMaglubiyet: h.duelloMaglubiyet || 0,
    zindanZafer: h.zindanZafer || 0
  };
}

export function ryoEkle(userId, miktar) {
  const h = kullaniciHesabi(userId);
  h.ryo = (h.ryo || 0) + Math.max(0, Math.floor(miktar));
  h.guncellemeTarihi = new Date().toISOString();
  veriyiKaydet();
  return h.ryo;
}

export function ryoDus(userId, miktar) {
  const h = kullaniciHesabi(userId);
  const gereken = Math.max(0, Math.floor(miktar));
  if ((h.ryo || 0) < gereken) return false;
  h.ryo -= gereken;
  h.guncellemeTarihi = new Date().toISOString();
  veriyiKaydet();
  return true;
}

export function gunlukAl(userId) {
  const h = kullaniciHesabi(userId);
  const simdi = Date.now();
  const gunMs = 24 * 60 * 60 * 1000;

  if (h.sonGunluk) {
    const gecenZaman = simdi - new Date(h.sonGunluk).getTime();
    if (gecenZaman < gunMs) {
      const kalanMs = gunMs - gecenZaman;
      const kalanSaat = Math.floor(kalanMs / (60 * 60 * 1000));
      const kalanDk = Math.floor((kalanMs % (60 * 60 * 1000)) / (60 * 1000));
      return {
        basarili: false,
        kalanSure: `${kalanSaat} saat ${kalanDk} dakika`,
        kalanMs
      };
    }

    // 48 saati geçtiyse seri bozulur
    if (gecenZaman > 2 * gunMs) {
      h.streak = 1;
    } else {
      h.streak = (h.streak || 0) + 1;
    }
  } else {
    h.streak = 1;
  }

  // Taban 250 Ryo + her streak günü için +50 Ryo (maks 500)
  const streakBonus = Math.min((h.streak - 1) * 50, 500);
  const kazanc = 250 + streakBonus;

  h.ryo = (h.ryo || 0) + kazanc;
  h.sonGunluk = new Date().toISOString();
  veriyiKaydet();

  return {
    basarili: true,
    kazanc,
    streak: h.streak,
    yeniBakiye: h.ryo
  };
}

export function duelloSonucuKaydet(kazananId, kaybedenId, bahis = 0) {
  const k = kullaniciHesabi(kazananId);
  const m = kullaniciHesabi(kaybedenId);

  k.duelloZafer = (k.duelloZafer || 0) + 1;
  m.duelloMaglubiyet = (m.duelloMaglubiyet || 0) + 1;

  if (bahis > 0) {
    k.ryo = (k.ryo || 0) + bahis;
    m.ryo = Math.max(0, (m.ryo || 0) - bahis);
  }

  veriyiKaydet();
}

export function zindanZaferiKaydet(userId, kazanilanRyo) {
  const h = kullaniciHesabi(userId);
  h.zindanZafer = (h.zindanZafer || 0) + 1;
  h.ryo = (h.ryo || 0) + kazanilanRyo;
  veriyiKaydet();
}

export function liderlikListesi(limit = 10) {
  const sirali = Object.entries(ekonomiVerisi)
    .map(([userId, veri]) => ({
      userId,
      toplam: (veri.ryo || 0) + (veri.banka || 0),
      ryo: veri.ryo || 0,
      duelloZafer: veri.duelloZafer || 0,
      streak: veri.streak || 0
    }))
    .sort((a, b) => b.toplam - a.toplam)
    .slice(0, limit);

  return sirali;
}
