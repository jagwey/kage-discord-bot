import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const EKONOMI_FILE = path.join(DATA_DIR, 'ekonomi.json');

let ekonomiVerisi = {};

export const KILIC_SEVIYELERI = [
  { seviye: 1, ad: '🗡️ Tahta Katana', bonus: 0, maliyet: 0, desc: 'Acemi bir samurayın ilk kılıcı.' },
  { seviye: 2, ad: '⚔️ Çelik Katana', bonus: 10, maliyet: 500, desc: 'Dövülmüş çelik. Düello ve zindanda +%10 kazanma bonusu.' },
  { seviye: 3, ad: '🩸 Kanlı Muramasa', bonus: 20, maliyet: 1500, desc: 'Lanetli keskinlik. +%20 kazanma bonusu.' },
  { seviye: 4, ad: '🐉 Kage Ejder Kılıcı', bonus: 35, maliyet: 3500, desc: 'Ateşle dövülmüş efsanevi katana. +%35 kazanma bonusu.' },
  { seviye: 5, ad: '👑 Efsanevi Gölge Kılıcı', bonus: 50, maliyet: 8000, desc: 'Şogunların kadim yadigarı. +%50 nihai kazanma bonusu.' }
];

export const MARKET_URUNLERI = [
  { id: 'unvan_golge', ad: '🥷 Gölge Suikastçısı Unvanı', fiyat: 800, tip: 'unvan', deger: 'Gölge Suikastçısı', desc: 'Profilinizde görünen havalı bir samuray unvanı.' },
  { id: 'unvan_ronin', ad: '📜 Başıboş Ronin Unvanı', fiyat: 400, tip: 'unvan', deger: 'Başıboş Ronin', desc: 'Yalnız bir kılıç ustasının unvanı.' },
  { id: 'unvan_onur', ad: '⛩️ Onurlu Daimyo Unvanı', fiyat: 2000, tip: 'unvan', deger: 'Onurlu Daimyo', desc: 'Klan meclisinin en saygın unvanı.' },
  { id: 'muska_sans', ad: '🏮 Kızıl Şans Muskası', fiyat: 600, tip: 'muska', deger: 'sans_muskasi', desc: 'Zindan seferlerinde ganimeti %25 artırır.' }
];

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
      kilicSeviye: 1,
      aktifUnvan: 'Acemi Samuray',
      envanter: [],
      guncellemeTarihi: new Date().toISOString()
    };
    veriyiKaydet();
  }
  return ekonomiVerisi[userId];
}

export function bakiyeGetir(userId) {
  const h = kullaniciHesabi(userId);
  const kilic = KILIC_SEVIYELERI.find(k => k.seviye === (h.kilicSeviye || 1)) || KILIC_SEVIYELERI[0];
  return {
    ryo: h.ryo || 0,
    banka: h.banka || 0,
    toplam: (h.ryo || 0) + (h.banka || 0),
    streak: h.streak || 0,
    duelloZafer: h.duelloZafer || 0,
    duelloMaglubiyet: h.duelloMaglubiyet || 0,
    zindanZafer: h.zindanZafer || 0,
    kilic,
    unvan: h.aktifUnvan || 'Acemi Samuray',
    envanter: h.envanter || []
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

    if (gecenZaman > 2 * gunMs) {
      h.streak = 1;
    } else {
      h.streak = (h.streak || 0) + 1;
    }
  } else {
    h.streak = 1;
  }

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

export function kilicGelistir(userId) {
  const h = kullaniciHesabi(userId);
  const mevcutSeviye = h.kilicSeviye || 1;
  if (mevcutSeviye >= 5) {
    return { basarili: false, mesaj: 'Kılıcınız zaten en üst seviye olan **Efsanevi Gölge Kılıcı** kademesindedir!' };
  }

  const sonrakiKilic = KILIC_SEVIYELERI.find(k => k.seviye === mevcutSeviye + 1);
  if (!sonrakiKilic) {
    return { basarili: false, mesaj: 'Geliştirilecek üst kademe kılıç bulunamadı.' };
  }

  if ((h.ryo || 0) < sonrakiKilic.maliyet) {
    return {
      basarili: false,
      mesaj: `Yetersiz Ryo! Bu kılıcı dövmek için **${sonrakiKilic.maliyet} Ryo** gerekir. Sende olan: **${h.ryo || 0} Ryo**.`
    };
  }

  h.ryo -= sonrakiKilic.maliyet;
  h.kilicSeviye = sonrakiKilic.seviye;
  veriyiKaydet();

  return {
    basarili: true,
    yeniKilic: sonrakiKilic,
    kalanRyo: h.ryo
  };
}

export function marketSatinAl(userId, urunId) {
  const h = kullaniciHesabi(userId);
  const urun = MARKET_URUNLERI.find(u => u.id === urunId);
  if (!urun) return { basarili: false, mesaj: 'Böyle bir pazar eşyası bulunamadı.' };

  if ((h.ryo || 0) < urun.fiyat) {
    return { basarili: false, mesaj: `Yetersiz Ryo! Bu eşya için **${urun.fiyat} Ryo** gerekir. Sende olan: **${h.ryo || 0} Ryo**.` };
  }

  if (urun.tip === 'unvan') {
    h.aktifUnvan = urun.deger;
  }

  if (!h.envanter) h.envanter = [];
  if (!h.envanter.includes(urun.ad)) {
    h.envanter.push(urun.ad);
  }

  h.ryo -= urun.fiyat;
  veriyiKaydet();

  return {
    basarili: true,
    urun,
    kalanRyo: h.ryo
  };
}

export function liderlikListesi(limit = 10) {
  const sirali = Object.entries(ekonomiVerisi)
    .map(([userId, veri]) => ({
      userId,
      toplam: (veri.ryo || 0) + (veri.banka || 0),
      ryo: veri.ryo || 0,
      duelloZafer: veri.duelloZafer || 0,
      streak: veri.streak || 0,
      unvan: veri.aktifUnvan || 'Acemi Samuray'
    }))
    .sort((a, b) => b.toplam - a.toplam)
    .slice(0, limit);

  return sirali;
}
