import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tumMangalariGetir, sonEklenenBolumleriGetir } from './mangaServisi.js';
import { liderlikListesi } from './ekonomiServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const HAFIZA_DOSYASI = path.join(DATA_DIR, 'kage_hafiza.json');

const VARSAYILAN_HAFIZA = {
  versiyon: '2.0.0',
  olusturulmaTarihi: new Date().toISOString(),
  sonGuncelleme: new Date().toISOString(),
  ogrenmeSayisi: 0,
  siteVerileri: {
    toplamManga: 0,
    kategoriler: [],
    trendMangalar: [],
    sonEklenenBolumler: [],
    sonTaramaTarihi: null
  },
  sunucuVerileri: {
    toplamUye: 0,
    cevrimiciUye: 0,
    kanalSayisi: 0,
    rolSayisi: 0,
    enZenginler: [],
    enKuvvetliKiliclar: [],
    sonTaramaTarihi: null
  },
  kullaniciNotlari: {},
  kullaniciProfilleri: {},
  ogrenilenBilgiler: [
    {
      id: 'kage_vizyon',
      kategori: 'site',
      baslik: 'Kage-95 Platformu ve Kurucu',
      icerik: 'Kage-95 (https://kage95.com) kurucumuz ve liderimiz Jagwey tarafından kurulmuş öncü bir Türkçe manga, manhwa ve webtoon platformudur. Kalenin şogun ve tek efendisi Jagwey\'dir.',
      tarih: new Date().toISOString()
    },
    {
      id: 'kage_felsefe',
      kategori: 'felsefe',
      baslik: 'Bushido Onur Kanunu',
      icerik: 'Kage Kalesi üyeleri çeliğe, söze ve dosta sadakatle bağlıdır. Zayıfları korur, zindanlarda cesurca savaşır ve klandaki her kılıç kardeşine saygı duyar.',
      tarih: new Date().toISOString()
    },
    {
      id: 'kage_ekonomi',
      kategori: 'ekonomi',
      baslik: 'Ryo ve Demircilik Düzeni',
      icerik: 'Kalede para birimi Ryo\'dur. Zindan akınları, /gunluk maaşı, blackjack ve düellolar ile Ryo kazanılır. Demircide kılıçlar Kadim Katana ve Muramasa seviyesine kadar yükseltilebilir.',
      tarih: new Date().toISOString()
    }
  ],
  gunlukDusunceGunlugu: []
};

let hafizaOnbellegi = null;

/**
 * Hafıza dosyasını diskten yükler veya varsayılanı oluşturur
 * @returns {typeof VARSAYILAN_HAFIZA}
 */
export function hafizaYukle() {
  if (hafizaOnbellegi) return hafizaOnbellegi;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(HAFIZA_DOSYASI)) {
      const hamVeri = fs.readFileSync(HAFIZA_DOSYASI, 'utf8');
      const parsed = JSON.parse(hamVeri);
      hafizaOnbellegi = {
        ...VARSAYILAN_HAFIZA,
        ...parsed,
        siteVerileri: { ...VARSAYILAN_HAFIZA.siteVerileri, ...(parsed.siteVerileri || {}) },
        sunucuVerileri: { ...VARSAYILAN_HAFIZA.sunucuVerileri, ...(parsed.sunucuVerileri || {}) },
        kullaniciProfilleri: parsed.kullaniciProfilleri || {}
      };
      return hafizaOnbellegi;
    }
  } catch (err) {
    console.warn('[KageHafiza] Hafıza dosyası okunurken hata, varsayılana dönülüyor:', err.message);
  }

  hafizaOnbellegi = JSON.parse(JSON.stringify(VARSAYILAN_HAFIZA));
  hafizaKaydet();
  return hafizaOnbellegi;
}

/**
 * Mevcut hafızayı diske kaydeder
 */
export function hafizaKaydet() {
  if (!hafizaOnbellegi) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    hafizaOnbellegi.sonGuncelleme = new Date().toISOString();
    fs.writeFileSync(HAFIZA_DOSYASI, JSON.stringify(hafizaOnbellegi, null, 2), 'utf8');
  } catch (err) {
    console.error('[KageHafiza] Hafıza kaydedilemedi:', err.message);
  }
}

/**
 * Kullanıcı hakkında yeni bir hafıza notu ekler
 * @param {string} userId 
 * @param {string} userName 
 * @param {string} notMetni 
 */
export function kullaniciNotuEkle(userId, userName, notMetni) {
  if (!userId || !notMetni) return false;
  const hafiza = hafizaYukle();

  if (!hafiza.kullaniciNotlari[userId]) {
    hafiza.kullaniciNotlari[userId] = {
      kullaniciAdi: userName || 'Samuray',
      notlar: [],
      sonGuncelleme: new Date().toISOString()
    };
  }

  const kHafiza = hafiza.kullaniciNotlari[userId];
  kHafiza.kullaniciAdi = userName || kHafiza.kullaniciAdi;
  kHafiza.sonGuncelleme = new Date().toISOString();

  // Mükerrer kaydı önle
  if (!kHafiza.notlar.includes(notMetni.trim())) {
    kHafiza.notlar.push(notMetni.trim());
    if (kHafiza.notlar.length > 25) {
      kHafiza.notlar.shift();
    }
  }

  hafizaKaydet();
  return true;
}

/**
 * Kullanıcının mevcut hafıza kaydını getirir
 * @param {string} userId 
 * @returns {Object|null}
 */
export function kullaniciHafizasiGetir(userId) {
  if (!userId) return null;
  const hafiza = hafizaYukle();
  return hafiza.kullaniciNotlari[userId] || null;
}

const PROFIL_LISTE_LIMITI = 12;

function listeBirlestir(eski = [], yeni = []) {
  const sonuc = [...eski];
  for (const oge of yeni) {
    const temiz = String(oge || '').trim().slice(0, 80);
    if (!temiz) continue;
    if (sonuc.some(x => x.toLowerCase() === temiz.toLowerCase())) continue;
    sonuc.push(temiz);
  }
  return sonuc.slice(-PROFIL_LISTE_LIMITI);
}

/**
 * Kullanıcının yapılandırılmış profilini günceller (yapay zekanın çıkardığı gerçekler)
 * @param {string} userId
 * @param {{ ilgiAlanlari?: string[], favoriMangalar?: string[], ton?: string, dil?: string, kisaOzet?: string }} veri
 */
export function profilGuncelle(userId, veri = {}) {
  if (!userId || !veri || typeof veri !== 'object') return null;
  const hafiza = hafizaYukle();
  const p = hafiza.kullaniciProfilleri[userId] || {
    ilgiAlanlari: [], favoriMangalar: [], ton: '', dil: '', kisaOzet: '', sonGuncelleme: null
  };

  p.ilgiAlanlari = listeBirlestir(p.ilgiAlanlari, Array.isArray(veri.ilgiAlanlari) ? veri.ilgiAlanlari : []);
  p.favoriMangalar = listeBirlestir(p.favoriMangalar, Array.isArray(veri.favoriMangalar) ? veri.favoriMangalar : []);
  if (typeof veri.ton === 'string' && veri.ton.trim()) p.ton = veri.ton.trim().slice(0, 60);
  if (typeof veri.dil === 'string' && veri.dil.trim()) p.dil = veri.dil.trim().slice(0, 30);
  if (typeof veri.kisaOzet === 'string' && veri.kisaOzet.trim()) p.kisaOzet = veri.kisaOzet.trim().slice(0, 300);
  p.sonGuncelleme = new Date().toISOString();

  hafiza.kullaniciProfilleri[userId] = p;
  hafizaKaydet();
  return p;
}

/**
 * @param {string} userId
 * @returns {Object|null}
 */
export function profilGetir(userId) {
  if (!userId) return null;
  return hafizaYukle().kullaniciProfilleri[userId] || null;
}

/**
 * Kullanıcının profilini ve kişisel notlarını kalıcı olarak siler (/hafiza unut)
 * @param {string} userId
 * @returns {{ profil: boolean, not: number }}
 */
export function kullaniciUnut(userId) {
  if (!userId) return { profil: false, not: 0 };
  const hafiza = hafizaYukle();
  const profil = Boolean(hafiza.kullaniciProfilleri[userId]);
  const not = hafiza.kullaniciNotlari[userId]?.notlar?.length || 0;
  delete hafiza.kullaniciProfilleri[userId];
  delete hafiza.kullaniciNotlari[userId];
  hafizaKaydet();
  return { profil, not };
}

/**
 * Genel bilgi veya kural ekler
 * @param {string} kategori 
 * @param {string} baslik 
 * @param {string} icerik 
 * @param {string} ekleyen 
 */
export function bilgiOgren(kategori, baslik, icerik, ekleyen = 'Kage AI') {
  if (!baslik || !icerik) return false;
  const hafiza = hafizaYukle();

  const yeniBilgi = {
    id: `bilgi_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    kategori: kategori || 'genel',
    baslik: baslik.trim(),
    icerik: icerik.trim(),
    ekleyen,
    tarih: new Date().toISOString()
  };

  hafiza.ogrenilenBilgiler.push(yeniBilgi);
  if (hafiza.ogrenilenBilgiler.length > 300) {
    hafiza.ogrenilenBilgiler.shift();
  }

  hafizaKaydet();
  return yeniBilgi;
}

/**
 * Hafıza içinde anahtar kelime veya anlamsal eşleşmeyle arama yapar
 * @param {string} sorgu 
 * @param {number} limit 
 */
export function hafizaArama(sorgu, limit = 5) {
  if (!sorgu || typeof sorgu !== 'string') return [];
  const hafiza = hafizaYukle();
  const arananKelime = sorgu.trim().toLowerCase();
  const tokens = arananKelime.split(/[\s.,!?:;]+/).filter(t => t.length > 2);

  const sonuclar = [];

  // 1. Genel Bilgilerde Ara
  for (const b of hafiza.ogrenilenBilgiler) {
    let puan = 0;
    const bBaslik = (b.baslik || '').toLowerCase();
    const bIcerik = (b.icerik || '').toLowerCase();

    if (bBaslik.includes(arananKelime)) puan += 10;
    if (bIcerik.includes(arananKelime)) puan += 5;

    for (const t of tokens) {
      if (bBaslik.includes(t)) puan += 3;
      if (bIcerik.includes(t)) puan += 2;
    }

    if (puan > 0) {
      sonuclar.push({
        tur: 'ogrenilen_bilgi',
        baslik: b.baslik,
        detay: b.icerik,
        kategori: b.kategori,
        puan
      });
    }
  }

  // 2. Kullanıcı Notlarında Ara
  for (const [uId, uVeri] of Object.entries(hafiza.kullaniciNotlari)) {
    const uAd = (uVeri.kullaniciAdi || '').toLowerCase();
    const notlar = uVeri.notlar || [];
    let puan = 0;

    if (uAd.includes(arananKelime)) puan += 8;
    for (const t of tokens) {
      if (uAd.includes(t)) puan += 3;
    }

    const eslesenNotlar = [];
    for (const not of notlar) {
      const notLow = not.toLowerCase();
      let notPuan = 0;
      if (notLow.includes(arananKelime)) notPuan += 6;
      for (const t of tokens) {
        if (notLow.includes(t)) notPuan += 2;
      }
      if (notPuan > 0) {
        eslesenNotlar.push(not);
        puan += notPuan;
      }
    }

    if (puan > 0 && eslesenNotlar.length > 0) {
      sonuclar.push({
        tur: 'kullanici_hafizasi',
        baslik: `Kullanıcı: ${uVeri.kullaniciAdi}`,
        detay: eslesenNotlar.join(' • '),
        kullaniciId: uId,
        puan
      });
    }
  }

  // 3. Site Trendlerinde Ara
  const trendler = hafiza.siteVerileri.trendMangalar || [];
  for (const m of trendler) {
    const mAd = (m.mangaAdi || '').toLowerCase();
    if (mAd.includes(arananKelime) || tokens.some(t => mAd.includes(t))) {
      sonuclar.push({
        tur: 'site_verisi',
        baslik: `Manga: ${m.mangaAdi}`,
        detay: `Tür: ${(m.kategoriler || []).join(', ')} | Okunma: ${m.okunmaSayisi || 0}`,
        puan: 6
      });
    }
  }

  // Puana göre sırala ve limitle
  sonuclar.sort((a, b) => b.puan - a.puan);
  return sonuclar.slice(0, limit);
}

/**
 * AI için derin hafıza ve canlı veri bağlam metnini hazırlar
 * @param {string} mesaj 
 * @param {string} userId 
 * @param {string} userName 
 * @returns {string}
 */
export function hafizaBaglamMetniUret(mesaj = '', userId = null, userName = null) {
  const hafiza = hafizaYukle();
  const satirlar = [];

  satirlar.push('=== [KAGE DERİN HAFIZA & CANLI VERİ TABANI BANKASI] ===');
  satirlar.push(`• Sistem Durumu: Son Öğrenme Döngüsü: ${hafiza.sonGuncelleme} (Toplam Öğrenme: ${hafiza.ogrenmeSayisi})`);
  satirlar.push(`• Canlı kage95.com Durumu: Kütüphanede ${hafiza.siteVerileri.toplamManga} manga yayında.`);
  if (hafiza.siteVerileri.trendMangalar.length > 0) {
    const trendOzet = hafiza.siteVerileri.trendMangalar.slice(0, 3).map(m => m.mangaAdi).join(', ');
    satirlar.push(`• Öne Çıkan Seriler: ${trendOzet}`);
  }

  satirlar.push(`• Kaledeki Samuraylar: ${hafiza.sunucuVerileri.toplamUye} üye, ${hafiza.sunucuVerileri.rolSayisi} rol, ${hafiza.sunucuVerileri.kanalSayisi} kanal.`);
  if (hafiza.sunucuVerileri.enZenginler.length > 0) {
    const zenginOzet = hafiza.sunucuVerileri.enZenginler.slice(0, 3).map(z => `${z.unvan}: ${z.toplam} Ryo`).join(' | ');
    satirlar.push(`• Klan Hazine Zirvesi: ${zenginOzet}`);
  }

  // Kullanıcıya özel hafıza notları
  if (userId && hafiza.kullaniciNotlari[userId]) {
    const uNot = hafiza.kullaniciNotlari[userId];
    if (uNot.notlar && uNot.notlar.length > 0) {
      satirlar.push(`• [${userName || uNot.kullaniciAdi} Hakkında Kişisel Hafızan]: ${uNot.notlar.join('; ')}`);
    }
  }

  // Yapılandırılmış kullanıcı profili (Hafıza 2.0)
  const profil = userId ? hafiza.kullaniciProfilleri?.[userId] : null;
  if (profil) {
    const parcalar = [];
    if (profil.kisaOzet) parcalar.push(profil.kisaOzet);
    if (profil.ilgiAlanlari?.length) parcalar.push(`İlgi alanları: ${profil.ilgiAlanlari.join(', ')}`);
    if (profil.favoriMangalar?.length) parcalar.push(`Sevdiği seriler: ${profil.favoriMangalar.join(', ')}`);
    if (profil.ton) parcalar.push(`Tercih ettiği ton: ${profil.ton}`);
    if (parcalar.length) satirlar.push(`• [${userName || 'Kullanıcı'} Profili]: ${parcalar.join(' | ')}`);
  }

  // Mesajla ilgili arama sonuçları
  if (mesaj && mesaj.length > 2) {
    const aramaSonuclari = hafizaArama(mesaj, 3);
    if (aramaSonuclari.length > 0) {
      satirlar.push('• [Soruyla İlgili Hatırladıkların]:');
      for (const s of aramaSonuclari) {
        satirlar.push(`  - (${s.baslik}): ${s.detay}`);
      }
    }
  }

  // Son düşünce günlüğü
  if (hafiza.gunlukDusunceGunlugu.length > 0) {
    const sonGunluk = hafiza.gunlukDusunceGunlugu[hafiza.gunlukDusunceGunlugu.length - 1];
    satirlar.push(`• [Gölge Günlüğü - ${sonGunluk.tarih}]: ${sonGunluk.ozet}`);
  }

  satirlar.push('=== [HAFIZA SONU] ===\n');
  return satirlar.join('\n');
}

/**
 * Canlı kage95.com sitesi ve Discord sunucu verilerini tarayarak AI hafızasını derinlemesine eğitir ve yeniler.
 * @param {import('discord.js').Client} client 
 */
export async function gunlukDerinOgrenme(client) {
  console.log('[KageHafiza] 🧠 Günlük derin öğrenme ve veri senkronizasyonu başlatılıyor...');
  const hafiza = hafizaYukle();
  const simdiTarih = new Date().toISOString().slice(0, 10);

  // 1. kage95.com Canlı Veri Taraması
  try {
    const mangalar = await tumMangalariGetir(true);
    if (Array.isArray(mangalar) && mangalar.length > 0) {
      hafiza.siteVerileri.toplamManga = mangalar.length;

      // Kategorileri topla
      const katSet = new Set();
      mangalar.forEach(m => {
        if (Array.isArray(m.kategoriler)) m.kategoriler.forEach(k => katSet.add(k));
      });
      hafiza.siteVerileri.kategoriler = Array.from(katSet);

      // Trend ve çok okunanları seç
      const sirali = [...mangalar].sort((a, b) => (b.okunmaSayisi || 0) - (a.okunmaSayisi || 0));
      hafiza.siteVerileri.trendMangalar = sirali.slice(0, 8).map(m => ({
        id: m.id,
        mangaAdi: m.mangaAdi,
        kategoriler: m.kategoriler,
        okunmaSayisi: m.okunmaSayisi || 0,
        yazar: m.yazar || 'Kage Ekibi',
        aciklama: m.aciklama ? m.aciklama.slice(0, 150) + '...' : ''
      }));

      // Son eklenen bölümleri al
      try {
        const sonBolumler = await sonEklenenBolumleriGetir();
        hafiza.siteVerileri.sonEklenenBolumler = (sonBolumler || []).slice(0, 6).map(b => ({
          mangaAdi: b.mangaAdi,
          bolumNo: b.bolumNo,
          eklenmeTarihi: b.eklenmeTarihi
        }));
      } catch {}

      hafiza.siteVerileri.sonTaramaTarihi = new Date().toISOString();
    }
  } catch (err) {
    console.warn('[KageHafiza] Site verileri senkronizasyon uyarısı:', err.message);
  }

  // 2. Discord Sunucu ve Üye Telemetrisi
  try {
    let toplamUye = 0;
    let kanalSayisi = 0;
    let rolSayisi = 0;

    if (client && client.guilds?.cache) {
      for (const [, guild] of client.guilds.cache) {
        toplamUye += guild.memberCount || 0;
        kanalSayisi += guild.channels.cache.size || 0;
        rolSayisi += guild.roles.cache.size || 0;
      }
    }

    hafiza.sunucuVerileri.toplamUye = toplamUye;
    hafiza.sunucuVerileri.kanalSayisi = kanalSayisi;
    hafiza.sunucuVerileri.rolSayisi = rolSayisi;

    // Ekonomi Zirvesi
    try {
      const zenginler = liderlikListesi(5);
      hafiza.sunucuVerileri.enZenginler = zenginler.map(z => ({
        userId: z.userId,
        toplam: z.toplam,
        unvan: z.unvan
      }));
    } catch {}

    hafiza.sunucuVerileri.sonTaramaTarihi = new Date().toISOString();
  } catch (err) {
    console.warn('[KageHafiza] Sunucu telemetrisi uyarısı:', err.message);
  }

  // 3. Günlük Düşünce Günlüğü (AI Reflection)
  const gunlukOzet = `Bugün Kage Kalesi'nde toplam ${hafiza.sunucuVerileri.toplamUye} samuray nöbette. kage95.com kütüphanemizde ${hafiza.siteVerileri.toplamManga} manga yayında. Klan hazinesinde liderlik ${hafiza.sunucuVerileri.enZenginler[0]?.toplam || 0} Ryo ile korunuyor. Gölgeler huzurlu, zindanlar kan kokuyor.`;

  // Aynı gün için birden fazla girdi yerine güncelle
  const varOlanIndex = hafiza.gunlukDusunceGunlugu.findIndex(g => g.tarih === simdiTarih);
  if (varOlanIndex !== -1) {
    hafiza.gunlukDusunceGunlugu[varOlanIndex].ozet = gunlukOzet;
  } else {
    hafiza.gunlukDusunceGunlugu.push({
      tarih: simdiTarih,
      baslik: `Gölge Günlüğü • ${simdiTarih}`,
      ozet: gunlukOzet
    });
    if (hafiza.gunlukDusunceGunlugu.length > 30) {
      hafiza.gunlukDusunceGunlugu.shift();
    }
  }

  hafiza.ogrenmeSayisi = (hafiza.ogrenmeSayisi || 0) + 1;
  hafizaKaydet();

  console.log(`[KageHafiza] ✅ Derin öğrenme tamamlandı! (Öğrenme #${hafiza.ogrenmeSayisi} • Site: ${hafiza.siteVerileri.toplamManga} manga, Sunucu: ${hafiza.sunucuVerileri.toplamUye} üye)`);
  return hafiza;
}

/**
 * Bot açıldığında arka plan hafıza servisini ve 24 saatlik öğrenme döngüsünü başlatır
 * @param {import('discord.js').Client} client 
 */
export function hafizaServisiniBaslat(client) {
  // İlk yükleme
  hafizaYukle();
  console.log('[KageHafiza] 🧠 Kage-95 Derin Hafıza & Bilgi Bankası yüklendi.');

  // Başlangıçtan 10 saniye sonra ilk derin öğrenmeyi yap
  setTimeout(() => {
    gunlukDerinOgrenme(client).catch(err => console.error('[KageHafiza] İlk öğrenme hatası:', err));
  }, 10000);

  // Her 24 saatte bir otomatik derin öğrenme döngüsü
  const YIRMIDORT_SAAT = 24 * 60 * 60 * 1000;
  setInterval(() => {
    gunlukDerinOgrenme(client).catch(err => console.error('[KageHafiza] Periyodik öğrenme hatası:', err));
  }, YIRMIDORT_SAAT);
}
