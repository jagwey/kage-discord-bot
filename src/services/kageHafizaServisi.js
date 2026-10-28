import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tumMangalariGetir, sonEklenenBolumleriGetir, onbellektekiMangalar } from './mangaServisi.js';
import { liderlikListesi } from './ekonomiServisi.js';
import { KISA_KOMUT_OZETI } from './komutNiyetServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const HAFIZA_DOSYASI = path.join(DATA_DIR, 'kage_hafiza.json');
// Yoğun olaylar 2 sn içinde tek atomik yazıma toplanır (event loop bloklanmaz).
const KAYIT_GECIKME_MS = 2000;

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
  kullaniciModelleri: {},
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
let kayitZamanlayici = null;
let yaziliyor = false;
let yazimSozu = Promise.resolve();
let kirli = false;

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
        kullaniciProfilleri: parsed.kullaniciProfilleri || {},
        kullaniciModelleri: parsed.kullaniciModelleri || {}
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

function kaydiPlanla() {
  if (kayitZamanlayici || yaziliyor) return;
  kayitZamanlayici = setTimeout(() => {
    kayitZamanlayici = null;
    void hafizaDiskeYaz();
  }, KAYIT_GECIKME_MS);
  kayitZamanlayici.unref?.();
}

/**
 * Mevcut hafızayı diske kaydeder. Hemen yazmaz; kısa pencerede gelen
 * güncellemeler tek yazımda birleşir.
 */
export function hafizaKaydet() {
  if (!hafizaOnbellegi) return;
  kirli = true;
  kaydiPlanla();
}

async function atomikYaz(govde) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  const gecici = `${HAFIZA_DOSYASI}.${process.pid}.tmp`;
  try {
    await fs.promises.writeFile(gecici, govde, 'utf8');
    await fs.promises.rename(gecici, HAFIZA_DOSYASI);
  } catch (err) {
    await fs.promises.unlink(gecici).catch(() => {});
    throw err;
  }
}

function hafizaDiskeYaz() {
  if (yaziliyor) return yazimSozu;
  if (!kirli || !hafizaOnbellegi) return yazimSozu;
  yaziliyor = true;
  yazimSozu = (async () => {
    try {
      while (kirli && hafizaOnbellegi) {
        kirli = false;
        hafizaOnbellegi.sonGuncelleme = new Date().toISOString();
        const govde = JSON.stringify(hafizaOnbellegi, null, 2);
        try {
          await atomikYaz(govde);
        } catch (err) {
          kirli = true;
          console.error('[KageHafiza] Hafıza kaydedilemedi:', err.message);
          break;
        }
      }
    } finally {
      yaziliyor = false;
      if (kirli) kaydiPlanla();
    }
  })();
  return yazimSozu;
}

/** Bekleyen hafıza yazımını hemen diske alır. Kapanışta yedekten önce çağrılır. */
export function hafizaFlush() {
  if (kayitZamanlayici) {
    clearTimeout(kayitZamanlayici);
    kayitZamanlayici = null;
  }
  return hafizaDiskeYaz();
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
    if (kHafiza.notlar.length > 100) {
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
 * Kullanıcının kalıcı model tercihini kaydeder
 * @param {string} userId
 * @param {string} modelKodu 'auto' | 'gemini' | 'groq_120b' | 'groq_qwen' | 'openrouter_free' | 'pollinations'
 */
export function kullaniciModelSec(userId, modelKodu = 'auto') {
  if (!userId) return false;
  const hafiza = hafizaYukle();
  if (!hafiza.kullaniciModelleri) hafiza.kullaniciModelleri = {};
  hafiza.kullaniciModelleri[userId] = modelKodu;
  hafizaKaydet();
  return true;
}

/**
 * Kullanıcının kayıtlı model tercihini getirir (varsayılan: auto)
 * @param {string} userId
 * @returns {string}
 */
export function kullaniciModelGetir(userId) {
  if (!userId) return 'auto';
  const hafiza = hafizaYukle();
  return hafiza.kullaniciModelleri?.[userId] || 'auto';
}

/**
 * Hangi yapay zeka modeli olursa olsun (Gemini, Groq, OpenRouter, Pollinations) çıktısından
 * [ÖĞRENİLDİ: ...] etiketlerini ayıklar ve merkezi hafızaya kalıcı olarak işler.
 * @param {string} userId
 * @param {string} userName
 * @param {string} metin
 * @returns {{ temizMetin: string, ogrenilenler: string[] }}
 */
export function ogrenilenleriAyiklaVeKaydet(userId, userName, metin = '') {
  if (!metin || typeof metin !== 'string') return { temizMetin: metin, ogrenilenler: [] };
  
  const ogrenilenler = [];
  const regex = /\[ÖĞRENİLDİ:\s*([^\]]+)\]/gi;
  let match;

  while ((match = regex.exec(metin)) !== null) {
    const bilgi = match[1]?.trim();
    if (bilgi && bilgi.length >= 3) {
      ogrenilenler.push(bilgi);
      if (userId) {
        kullaniciNotuEkle(userId, userName, bilgi);
        profilGuncelle(userId, { kisaOzet: bilgi });
      }
    }
  }

  // Çıktıdan etiketleri ve duygu etiketini temizle
  const temizMetin = metin
    .replace(/\[ÖĞRENİLDİ:\s*[^\]]+\]/gi, '')
    .replace(/\[DUYGU:\s*[^\]]+\]/gi, '')
    .trim();

  return { temizMetin, ogrenilenler };
}

/**
 * TÜM YAPAY ZEKA MODELLERİNİN (Gemini, Groq, OpenRouter, Pollinations, ChatBot)
 * ortaklaşa kullandığı derin, samimi, gerçekçi hafıza ve kişilik bağlamı.
 * 
 * @param {Object} p
 * @param {string} p.userId
 * @param {string} p.userName
 * @param {string} [p.prompt]
 * @param {boolean} [p.isFemale]
 * @param {string} [p.kilicAd]
 * @param {number} [p.ryo]
 * @param {string} [p.ekBaglam]
 * @returns {string}
 */
export function ortakHafizaBaglamiGetir({
  userId = null,
  userName = 'Samuray',
  prompt = '',
  isFemale = false,
  kilicAd = 'Çelik Katana',
  ryo = 0,
  ekBaglam = ''
}) {
  const hafizaMetni = hafizaBaglamMetniUret(prompt, userId, userName);
  const hitap = isFemale ? 'kunoichi, zarif savaşçı' : 'samuray, kılıç kardeşi';

  return `Sen Kage-95 (https://kage95.com) manga platformunun ve bu Discord topluluğunun bilge, zeki, esprili ve sadık gölge samurayısın. Kurucumuz ve şogunumuz Jagwey'dir.
Konuştuğun kişi: ${userName} (${isFemale ? 'Kız/Kunoichi' : 'Erkek/Samuray'}). Ona samimi bir ${hitap} gibi hitap et.
Elindeki kılıç: ${kilicAd} | Kesesindeki servet: ${ryo} Ryo.

ORTAK MERKEZİ HAFIZA BİLGİLERİ:
${hafizaMetni}
${ekBaglam ? `\nEK BİLGİLER:\n${ekBaglam}` : ''}

KONUŞMA VE DAVRANIŞ KURALLARI (ÇOK ÖNEMLİ):
1. Biz gerçek hayatta nasıl samimi, doğal ve esprili konuşuyorsak sen de öyle konuş! Yapmacık robot gibi kurallar sıralama, 'ben bir yapay zekayım' deme; kanlı canlı bir anime ve manga aşığı samuray dostu gibi ol.
2. Kullanıcıların söylediklerini, tercihlerini ve anlattıklarını asla unutma; hafızandaki bilgileri yeri geldikçe sohbete doğal bir şekilde kat.
3. Kullanıcı sana şunu yap, şunu ayarla dediğinde: Eğer yapabileceğin bir şeyse hemen açık ve net yanıt ver; komut yazmak zorunda kalmasın.
4. Kullanıcı kendisi hakkında yeni bir bilgi verirse (adı, sevdiği bir şey, yaşı, kedi/köpeği, favori mangası vb.), cevabının EN SONUNA şu etiketi ekle:
[ÖĞRENİLDİ: <kullanıcı hakkında kalıcı 1 cümlelik gerçek>]
5. Cevabın 1-3 paragraf arasında, akıcı ve tatmin edici olsun.`;
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

// Türkçe karakterleri sadeleştirir: "Yükop" ile "yukop" aynı sayılır.
function sadelestir(metin = '') {
  return String(metin).toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

function duzenlemeMesafesi(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let onceki = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const satir = [i];
    for (let j = 1; j <= b.length; j++) {
      satir[j] = Math.min(onceki[j] + 1, satir[j - 1] + 1, onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    onceki = satir;
  }
  return onceki[b.length];
}

// Kelime ekleri ("yukop'un", "yukopa") ve küçük yazım hataları da eşleşir.
function kelimeBenzer(kelime, aranan) {
  if (kelime.startsWith(aranan) || aranan.startsWith(kelime) && kelime.length >= 4) return true;
  if (aranan.length < 4) return false;
  const tolerans = aranan.length >= 7 ? 2 : 1;
  return duzenlemeMesafesi(kelime.slice(0, aranan.length + 1), aranan) <= tolerans
    || duzenlemeMesafesi(kelime, aranan) <= tolerans;
}

function eslesmePuani(alan, arananKelime, tokens) {
  const metin = sadelestir(alan);
  if (!metin) return 0;
  let puan = metin.includes(arananKelime) ? 5 : 0;
  const kelimeler = metin.split(/[^a-z0-9]+/).filter(Boolean);
  for (const t of tokens) {
    if (metin.includes(t)) puan += 2;
    else if (kelimeler.some(k => kelimeBenzer(k, t))) puan += 1;
  }
  return puan;
}

/**
 * Hafıza içinde bulanık arama yapar: tam eşleşme gerekmez,
 * Türkçe karakter farkı, ekler ve küçük yazım hataları tolere edilir.
 * @param {string} sorgu
 * @param {number} limit
 */
export function hafizaArama(sorgu, limit = 5) {
  if (!sorgu || typeof sorgu !== 'string') return [];
  const hafiza = hafizaYukle();
  const arananKelime = sadelestir(sorgu.trim());
  const tokens = arananKelime.split(/[^a-z0-9]+/).filter(t => t.length > 2);
  if (tokens.length === 0 && arananKelime) tokens.push(arananKelime);

  const sonuclar = [];

  // 1. Genel Bilgilerde Ara
  for (const b of hafiza.ogrenilenBilgiler) {
    const puan = eslesmePuani(b.baslik, arananKelime, tokens) * 2 + eslesmePuani(b.icerik, arananKelime, tokens);
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
    const notlar = uVeri.notlar || [];
    let puan = eslesmePuani(uVeri.kullaniciAdi, arananKelime, tokens) * 2;

    const eslesenNotlar = [];
    for (const not of notlar) {
      const notPuan = eslesmePuani(not, arananKelime, tokens);
      if (notPuan > 0) {
        eslesenNotlar.push(not);
        puan += notPuan;
      }
    }

    // İsim eşleştiyse notlarda kelime geçmese de kişinin son notları gösterilir
    const gosterilecek = eslesenNotlar.length > 0 ? eslesenNotlar : notlar.slice(-5);
    if (puan > 0 && gosterilecek.length > 0) {
      sonuclar.push({
        tur: 'kullanici_hafizasi',
        baslik: `Kullanıcı: ${uVeri.kullaniciAdi}`,
        detay: gosterilecek.join(' • '),
        kullaniciId: uId,
        puan
      });
    }
  }

  // 3. Site Trendlerinde Ara
  const trendler = hafiza.siteVerileri.trendMangalar || [];
  for (const m of trendler) {
    if (eslesmePuani(m.mangaAdi, arananKelime, tokens) > 0) {
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
  // Bellekteki canlı liste varsa günlük anlık görüntü yerine o kullanılır (ID'ler değişebiliyor)
  const canli = onbellektekiMangalar();
  if (Array.isArray(canli) && canli.length > 0) {
    const trendOzet = [...canli].sort((a, b) => (b.okunmaSayisi || 0) - (a.okunmaSayisi || 0)).slice(0, 3).map(m => m.mangaAdi).join(', ');
    satirlar.push(`• Canlı kage95.com Durumu: Kütüphanede ${canli.length} manga var. Öne Çıkan Seriler: ${trendOzet}`);
  } else {
    satirlar.push(`• kage95.com (son tarama ${hafiza.siteVerileri.sonTaramaTarihi || '?'}): ${hafiza.siteVerileri.toplamManga} manga. Güncel id/bölüm için site_veri_getir kullan.`);
  }

  // Komut sorulursa ya da kullanıcı komut adını karıştırırsa model bu özetten kısa hali önerir.
  satirlar.push(`• ${KISA_KOMUT_OZETI}`);
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
