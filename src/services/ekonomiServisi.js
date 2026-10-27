import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hareketKaydet } from './ekonomiLogServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const EKONOMI_FILE = path.join(DATA_DIR, 'ekonomi.json');

let ekonomiVerisi = {};

// `risk`: bu kademeye döverken kırılma yüzdesi.
export const KILIC_SEVIYELERI = [
  { seviye: 1, ad: '🗡️ Tahta Katana', bonus: 0, maliyet: 0, risk: 0, desc: 'Acemi bir samurayın ilk kılıcı.' },
  { seviye: 2, ad: '⚔️ Çelik Katana', bonus: 10, maliyet: 500, risk: 0, desc: 'Dövülmüş çelik. Düello ve zindanda +%10 kazanma bonusu.' },
  { seviye: 3, ad: '🩸 Kanlı Muramasa', bonus: 20, maliyet: 1500, risk: 0, desc: 'Lanetli keskinlik. +%20 kazanma bonusu.' },
  { seviye: 4, ad: '🐉 Kage Ejder Kılıcı', bonus: 35, maliyet: 3500, risk: 15, desc: 'Ateşle dövülmüş efsanevi katana. +%35 kazanma bonusu.' },
  { seviye: 5, ad: '👑 Efsanevi Gölge Kılıcı', bonus: 50, maliyet: 8000, risk: 25, desc: 'Şogunların kadim yadigarı. +%50 nihai kazanma bonusu.' },
  { seviye: 6, ad: '✨ Kadim Kusanagi no Tsurugi', bonus: 70, maliyet: 16000, risk: 35, desc: 'Fırtına tanrısının göklerden indirdiği kutsal kılıç. +%70 üstün hasar bonusu.' },
  { seviye: 7, ad: '🌌 Kozmik Hiçlik Katanası', bonus: 100, maliyet: 35000, risk: 45, desc: 'Yıldız tozu ve ebedi gölgenin birleşimi. +%100 nihai tanrısal güç.' }
];

export const KORUMA_TILSIMI_FIYAT = 750;
export const KORUMA_TILSIMI_MAKS = 3;
/** Her kırılmada sonraki denemenin başarı şansına eklenen puan. */
export const OCAK_SANS_ARTISI = 10;
/** Bu kademeden itibaren kırılan kılıç bir seviye geriler. */
export const GERILEME_SEVIYESI = 5;

/** Bir sonraki dövmenin gerçek kırılma yüzdesi (birikmiş şans düşülmüş). */
export function kilicRiski(hedef, ocakSans = 0) {
  return Math.max(0, (hedef?.risk || 0) - ocakSans);
}

export const SERI_KALKANI_FIYAT = 1500;
export const SERI_KALKANI_MAKS = 3;
/** Belirli seri günlerinde verilen tek seferlik ek ödül. */
export const SERI_DONUMLERI = { 7: 500, 14: 1000, 30: 3000 };

export const MARKET_URUNLERI = [
  { id: 'unvan_golge', ad: '🥷 Gölge Suikastçısı Unvanı', fiyat: 800, tip: 'unvan', deger: 'Gölge Suikastçısı', desc: 'Profilinizde görünen havalı bir samuray unvanı.' },
  { id: 'unvan_ronin', ad: '📜 Başıboş Ronin Unvanı', fiyat: 400, tip: 'unvan', deger: 'Başıboş Ronin', desc: 'Yalnız bir kılıç ustasının unvanı.' },
  { id: 'unvan_onur', ad: '⛩️ Onurlu Daimyo Unvanı', fiyat: 2000, tip: 'unvan', deger: 'Onurlu Daimyo', desc: 'Klan meclisinin en saygın unvanı.' },
  { id: 'unvan_shogun', ad: '👑 Büyük Şogun Unvanı', fiyat: 5000, tip: 'unvan', deger: 'Büyük Şogun', desc: 'Kalenin mutlak hükümdarlık unvanı.' },
  { id: 'unvan_kunoichi', ad: '🌸 Kiraz Çiçeği Kunoichi Unvanı', fiyat: 1500, tip: 'unvan', deger: 'Kiraz Çiçeği Kunoichi', desc: 'Zarif ve ölümcül savaşçı hanımların unvanı.' },
  { id: 'muska_sans', ad: '🏮 Kızıl Şans Muskası', fiyat: 600, tip: 'muska', deger: 'sans_muskasi', desc: 'Zindan seferlerinde ganimeti %25 artırır.' },
  { id: 'muska_koruma', ad: '🪬 Çelik Koruma Tılsımı', fiyat: 1000, tip: 'muska', deger: 'koruma_muskasi', desc: 'Zindanda ölüm cezasını (para kaybını) yarı yarıya düşürür.' },
  { id: 'bilet_kumarhane', ad: '🎫 VIP Kumarhane Kartı', fiyat: 2500, tip: 'kart', deger: 'vip_kumar', desc: 'Blackjack ve slot masalarında kayıpların %10\'unu kasadan geri iade eder.' }
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
    seriKalkani: h.seriKalkani || 0,
    enUzunSeri: h.enUzunSeri || h.streak || 0,
    duelloZafer: h.duelloZafer || 0,
    duelloMaglubiyet: h.duelloMaglubiyet || 0,
    zindanZafer: h.zindanZafer || 0,
    kilic,
    unvan: h.aktifUnvan || 'Acemi Samuray',
    envanter: h.envanter || [],
    korumaTilsimi: h.korumaTilsimi || 0,
    ocakSans: h.ocakSans || 0
  };
}

export function ryoEkle(userId, miktar, neden = '') {
  const h = kullaniciHesabi(userId);
  const eklenen = Math.max(0, Math.floor(miktar));
  h.ryo = (h.ryo || 0) + eklenen;
  h.guncellemeTarihi = new Date().toISOString();
  veriyiKaydet();
  hareketKaydet(userId, 'ekle', eklenen, neden, h.ryo);
  return h.ryo;
}

// Site XP -> Ryo oranları
const RYO_PER_PUAN = 0.2; // 5 puan = 1 Ryo
const RYO_PER_BOLUM = 2;

/**
 * Site okuma ilerlemesini (puan + okunan bölüm) Ryo'ya çevirir.
 * Idempotent: yalnızca daha önce kredilenmemiş artış (delta) ödenir.
 * @returns {{eklenen:number, bakiye:number}}
 */
export function siteXpKrediEt(userId, puan = 0, bolumSayisi = 0) {
  const h = kullaniciHesabi(userId);
  const yeniPuan = Math.max(0, Math.floor(Number(puan) || 0));
  const yeniBolum = Math.max(0, Math.floor(Number(bolumSayisi) || 0));
  const eskiPuan = h.siteXpKredi || 0;
  const eskiBolum = h.siteBolumKredi || 0;

  const puanFark = Math.max(0, yeniPuan - eskiPuan);
  const bolumFark = Math.max(0, yeniBolum - eskiBolum);
  const eklenen = Math.floor(puanFark * RYO_PER_PUAN) + bolumFark * RYO_PER_BOLUM;

  // Yüksek değerleri hatırla (site değeri düşerse tekrar ödeme yapılmasın)
  h.siteXpKredi = Math.max(eskiPuan, yeniPuan);
  h.siteBolumKredi = Math.max(eskiBolum, yeniBolum);
  if (eklenen > 0) h.ryo = (h.ryo || 0) + eklenen;
  h.guncellemeTarihi = new Date().toISOString();
  veriyiKaydet();
  return { eklenen, bakiye: h.ryo };
}

export function ryoDus(userId, miktar, neden = '') {
  const h = kullaniciHesabi(userId);
  const gereken = Math.max(0, Math.floor(miktar));
  if ((h.ryo || 0) < gereken) return false;
  h.ryo -= gereken;
  h.guncellemeTarihi = new Date().toISOString();
  veriyiKaydet();
  hareketKaydet(userId, 'dus', gereken, neden, h.ryo);
  return true;
}

export function gunlukAl(userId) {
  const h = kullaniciHesabi(userId);
  const simdi = Date.now();
  const gunMs = 24 * 60 * 60 * 1000;
  let kalkanKullanildi = false;

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
      // Seri kalkanı kaçırılan günü bir kez affeder; yoksa seri sıfırlanır.
      if ((h.seriKalkani || 0) > 0) {
        h.seriKalkani -= 1;
        h.streak = (h.streak || 0) + 1;
        kalkanKullanildi = true;
      } else {
        h.streak = 1;
      }
    } else {
      h.streak = (h.streak || 0) + 1;
    }
  } else {
    h.streak = 1;
  }

  const streakBonus = Math.min((h.streak - 1) * 75, 1500);
  const donumBonusu = SERI_DONUMLERI[h.streak] || (h.streak > 30 && h.streak % 30 === 0 ? 3000 : 0);
  const kazanc = 250 + streakBonus + donumBonusu;
  if (h.streak > (h.enUzunSeri || 0)) h.enUzunSeri = h.streak;

  h.ryo = (h.ryo || 0) + kazanc;
  h.sonGunluk = new Date().toISOString();
  veriyiKaydet();

  return {
    basarili: true,
    kazanc,
    streak: h.streak,
    donumBonusu,
    kalkanKullanildi,
    kalanKalkan: h.seriKalkani || 0,
    yeniBakiye: h.ryo
  };
}

/** Seri kalkanı satın alır; elde en çok SERI_KALKANI_MAKS kalkan tutulur. */
export function seriKalkaniAl(userId, fiyat = SERI_KALKANI_FIYAT) {
  const h = kullaniciHesabi(userId);
  if ((h.seriKalkani || 0) >= SERI_KALKANI_MAKS) {
    return { basarili: false, mesaj: `En çok **${SERI_KALKANI_MAKS}** seri kalkanı taşıyabilirsin.` };
  }
  if ((h.ryo || 0) < fiyat) {
    return { basarili: false, mesaj: `Yetersiz Ryo! Seri kalkanı **${fiyat} Ryo**. Sende olan: **${h.ryo || 0} Ryo**.` };
  }
  h.ryo -= fiyat;
  h.seriKalkani = (h.seriKalkani || 0) + 1;
  veriyiKaydet();
  return { basarili: true, kalkan: h.seriKalkani, kalanRyo: h.ryo };
}

/**
 * Düello sonucunu işler. Çağıran, iki tarafın bahsini zaten `ryoDus` ile
 * çekmiş olmalıdır; `havuz` (toplam bahis) yalnızca kazanana bir kez ödenir.
 * Kaybedenden ikinci kez kesinti yapılmaz, böylece toplam Ryo korunur.
 */
export function duelloSonucuKaydet(kazananId, kaybedenId, havuz = 0) {
  const k = kullaniciHesabi(kazananId);
  const m = kullaniciHesabi(kaybedenId);

  k.duelloZafer = (k.duelloZafer || 0) + 1;
  m.duelloMaglubiyet = (m.duelloMaglubiyet || 0) + 1;

  if (havuz > 0) k.ryo = (k.ryo || 0) + Math.floor(havuz);

  veriyiKaydet();
}

/** Oyun komutları için tek yerden bahis üst sınırı. */
export const MAKS_BAHIS = 5000;

const sohbetSon = new Map();
/** Sohbet Ryo ödülü için kullanıcı başına bekleme (varsayılan 30 sn). Uygunsa true döner ve süreyi başlatır. */
export function sohbetOdulUygunMu(userId, beklemeMs = 30_000) {
  const simdi = Date.now();
  if (simdi - (sohbetSon.get(userId) || 0) < beklemeMs) return false;
  sohbetSon.set(userId, simdi);
  if (sohbetSon.size > 5000) {
    for (const [k, t] of sohbetSon) if (simdi - t > beklemeMs) sohbetSon.delete(k);
  }
  return true;
}

const zindanSon = new Map();
/** Zindan girişi için bekleme. Kalan süreyi ms olarak döner (0 = girilebilir). */
export function zindanBeklemeKalan(userId, beklemeMs = 5 * 60_000) {
  return Math.max(0, beklemeMs - (Date.now() - (zindanSon.get(userId) || 0)));
}
export function zindanBeklemeBaslat(userId) {
  zindanSon.set(userId, Date.now());
}

export function zindanZaferiKaydet(userId, kazanilanRyo) {
  const h = kullaniciHesabi(userId);
  h.zindanZafer = (h.zindanZafer || 0) + 1;
  h.ryo = (h.ryo || 0) + kazanilanRyo;
  veriyiKaydet();
}

export function zindanZaferiDetayli(userId, kazanilanRyo, dusenEsya = null) {
  const h = kullaniciHesabi(userId);
  h.zindanZafer = (h.zindanZafer || 0) + 1;
  h.ryo = (h.ryo || 0) + kazanilanRyo;

  if (dusenEsya) {
    if (!h.envanter) h.envanter = [];
    h.envanter.push(dusenEsya);
  }

  veriyiKaydet();
  return {
    ryo: h.ryo,
    dusenEsya
  };
}

export function olumCezasiUygula(userId) {
  const h = kullaniciHesabi(userId);
  let kayipMesaji = '';

  // %50 şansla çantadan bir eşya düşer
  if (h.envanter && h.envanter.length > 0 && Math.random() < 0.5) {
    const rastgeleIndex = Math.floor(Math.random() * h.envanter.length);
    const kaybolanEsya = h.envanter.splice(rastgeleIndex, 1)[0];
    kayipMesaji = `🎒 Ağır darbelerle yere yığılırken çantan parçalandı ve **${kaybolanEsya}** zindanın karanlığında kayboldu!`;
  } else {
    // Eşya düşmezse Ryo'nun %15'i yağmalanır
    const kayipRyo = Math.min(500, Math.round((h.ryo || 0) * 0.15));
    if (kayipRyo > 0) {
      h.ryo -= kayipRyo;
      kayipMesaji = `🪙 Canavarlar seni yere serdiğinde kesenden **${kayipRyo} Ryo** çaldı!`;
    } else {
      kayipMesaji = `💀 Zindandan kıl payı canını kurtardın ama katanan ağır hasar aldı.`;
    }
  }

  veriyiKaydet();
  return {
    kayipMesaji,
    kalanRyo: h.ryo || 0
  };
}

export function esyaVarMi(userId, esyaParcasi) {
  const h = kullaniciHesabi(userId);
  if (!h.envanter) return false;
  return h.envanter.some(e => e.toLowerCase().includes(esyaParcasi.toLowerCase()));
}

export function esyaHarca(userId, esyaParcasi) {
  const h = kullaniciHesabi(userId);
  if (!h.envanter) return false;
  const idx = h.envanter.findIndex(e => e.toLowerCase().includes(esyaParcasi.toLowerCase()));
  if (idx === -1) return false;
  const cikarilan = h.envanter.splice(idx, 1)[0];
  veriyiKaydet();
  return cikarilan;
}

/**
 * Kılıcı bir kademe döver. Ücret her denemede düşer. Riskli kademede kırılırsa
 * sonraki şans artar; GERILEME_SEVIYESI ve üstünde kılıç geriler, koruma tılsımı varsa
 * tılsım harcanır ve seviye korunur.
 */
export function kilicGelistir(userId, rng = Math.random) {
  const h = kullaniciHesabi(userId);
  const mevcutSeviye = h.kilicSeviye || 1;
  if (mevcutSeviye >= KILIC_SEVIYELERI.length) {
    return { basarili: false, mesaj: `Kılıcınız zaten en üst seviye olan **${KILIC_SEVIYELERI.at(-1).ad}** kademesindedir!` };
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

  const risk = kilicRiski(sonrakiKilic, h.ocakSans || 0);
  ryoDus(userId, sonrakiKilic.maliyet, `Demirci: ${sonrakiKilic.ad}`);

  if (rng() * 100 < risk) {
    h.ocakSans = (h.ocakSans || 0) + OCAK_SANS_ARTISI;
    let korundu = false;
    let geriledi = false;
    if (sonrakiKilic.seviye >= GERILEME_SEVIYESI) {
      if ((h.korumaTilsimi || 0) > 0) {
        h.korumaTilsimi -= 1;
        korundu = true;
      } else if (mevcutSeviye > 1) {
        h.kilicSeviye = mevcutSeviye - 1;
        geriledi = true;
      }
    }
    veriyiKaydet();
    return {
      basarili: false,
      kirildi: true,
      korundu,
      geriledi,
      risk,
      kilic: KILIC_SEVIYELERI.find(k => k.seviye === (h.kilicSeviye || 1)),
      ocakSans: h.ocakSans,
      kalanRyo: h.ryo
    };
  }

  h.kilicSeviye = sonrakiKilic.seviye;
  h.ocakSans = 0;
  veriyiKaydet();

  return {
    basarili: true,
    yeniKilic: sonrakiKilic,
    kalanRyo: h.ryo
  };
}

export function korumaTilsimiAl(userId) {
  const h = kullaniciHesabi(userId);
  if ((h.korumaTilsimi || 0) >= KORUMA_TILSIMI_MAKS) {
    return { basarili: false, mesaj: `En çok ${KORUMA_TILSIMI_MAKS} koruma tılsımı taşıyabilirsin.` };
  }
  if (!ryoDus(userId, KORUMA_TILSIMI_FIYAT, 'Demirci: koruma tılsımı')) {
    return { basarili: false, mesaj: `Koruma tılsımı **${KORUMA_TILSIMI_FIYAT} Ryo**. Cüzdanın yetmiyor.` };
  }
  h.korumaTilsimi = (h.korumaTilsimi || 0) + 1;
  veriyiKaydet();
  return { basarili: true, adet: h.korumaTilsimi };
}

export function marketSatinAl(userId, urunId) {
  const h = kullaniciHesabi(userId);
  const urun = MARKET_URUNLERI.find(u => u.id === urunId);
  if (!urun) return { basarili: false, mesaj: 'Böyle bir pazar eşyası bulunamadı.' };

  const sahip = (h.envanter || []).includes(urun.ad);
  if (sahip && urun.tip === 'unvan') {
    h.aktifUnvan = urun.deger;
    veriyiKaydet();
    return { basarili: true, urun, kalanRyo: h.ryo || 0, tekrar: true };
  }
  if (sahip) {
    return { basarili: false, mesaj: 'Bu eşyaya zaten sahipsiniz.' };
  }

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
