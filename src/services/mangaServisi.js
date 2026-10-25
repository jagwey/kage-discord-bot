import axios from 'axios';
import { TEMA } from '../config/tema.js';

const API_BASE = process.env.API_BASE_URL || 'https://kage95.com/api';
const SITE_URL = process.env.SITE_URL || 'https://kage95.com';

// Kısa süreli bellek önbelleği (API sunucusunu gereksiz yükten korumak için)
let mangaOnbellegi = null;
let sonOnbellekZamani = 0;
const ONBELLEK_SURESI_MS = 60 * 1000; // 60 saniye

/**
 * Kapak görseli veya dosya yolunu tam URL'e dönüştürür
 * @param {string} url
 * @returns {string}
 */
export function tamGorselUrl(url) {
  if (!url) return `${SITE_URL}/assets/favicon.svg`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

/**
 * Canlı siteden tüm mangaların listesini çeker (önbellek destekli)
 * @param {boolean} zorlaYenile
 * @returns {Promise<Array>}
 */
export async function tumMangalariGetir(zorlaYenile = false) {
  const simdi = Date.now();
  if (!zorlaYenile && mangaOnbellegi && (simdi - sonOnbellekZamani < ONBELLEK_SURESI_MS)) {
    return mangaOnbellegi;
  }

  try {
    const yanit = await axios.get(`${API_BASE}/mangas`, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Kage95-Discord-Bot/1.0 (+https://kage95.com)'
      }
    });

    if (Array.isArray(yanit.data)) {
      mangaOnbellegi = yanit.data;
      sonOnbellekZamani = simdi;
      return mangaOnbellegi;
    }
    return [];
  } catch (hata) {
    console.error('[MangaServisi] Mangalar alınırken hata oluştu:', hata.message);
    // Önbellekte eski veri varsa hata anında onu döndür
    if (mangaOnbellegi) return mangaOnbellegi;
    return [];
  }
}

/**
 * İsim veya kategoriye göre manga arar
 * @param {string} sorgu
 * @returns {Promise<Array>}
 */
export async function mangaAra(sorgu) {
  if (!sorgu || typeof sorgu !== 'string') return [];
  const mangalar = await tumMangalariGetir();
  const temizSorgu = sorgu.trim().toLowerCase();

  return mangalar.filter(manga => {
    const baslik = (manga.mangaAdi || '').toLowerCase();
    const aciklama = (manga.aciklama || '').toLowerCase();
    const kategoriler = Array.isArray(manga.kategoriler)
      ? manga.kategoriler.map(k => k.toLowerCase()).join(' ')
      : '';

    return baslik.includes(temizSorgu) ||
           kategoriler.includes(temizSorgu) ||
           aciklama.includes(temizSorgu);
  });
}

/**
 * ID'ye göre manga detayını ve bölümlerini getirir
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
export async function mangaDetayGetir(id) {
  try {
    const yanit = await axios.get(`${API_BASE}/mangas/${id}`, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Kage95-Discord-Bot/1.0 (+https://kage95.com)'
      }
    });
    return yanit.data;
  } catch (hata) {
    console.error(`[MangaServisi] Manga (${id}) detayı alınamadı:`, hata.message);
    return null;
  }
}

/**
 * Sitedeki son eklenen bölümleri tarar
 * @returns {Promise<Array>}
 */
export async function sonEklenenBolumleriGetir() {
  const mangalar = await tumMangalariGetir();
  const bolumListesi = [];

  // Mangaların detaylarını çekerek son eklenen bölümleri derler
  // API hız sınırını aşmamak için ilk 6 güncel seriyi inceler
  const taranacakMangalar = mangalar.slice(0, 8);

  for (const manga of taranacakMangalar) {
    try {
      const detay = await mangaDetayGetir(manga.id);
      if (detay && Array.isArray(detay.bolumler) && detay.bolumler.length > 0) {
        for (const bolum of detay.bolumler) {
          bolumListesi.push({
            mangaId: manga.id,
            mangaAdi: manga.mangaAdi,
            kapakResmi: tamGorselUrl(manga.kapakResmiURL),
            bolumId: bolum.id || `${manga.id}-${bolum.bolumNumarasi || bolum.no}`,
            bolumNo: bolum.bolumNumarasi || bolum.no || 1,
            bolumBaslik: bolum.baslik || `Bölüm ${bolum.bolumNumarasi || bolum.no || 1}`,
            eklenmeTarihi: bolum.eklenmeTarihi || manga.eklenmeTarihi || new Date().toISOString(),
            okumaUrl: `${SITE_URL}/manga/${manga.id}/bolum/${bolum.id || bolum.bolumNumarasi || 1}`
          });
        }
      }
    } catch (err) {
      // Hata durumunda devam et
    }
  }

  // Tarihe göre yeniden eskiye sırala
  bolumListesi.sort((a, b) => new Date(b.eklenmeTarihi) - new Date(a.eklenmeTarihi));
  return bolumListesi;
}

/**
 * Kullanıcı profili bilgilerini çeker veya Kage 95 Samuray rütbe motoruyla üretir
 * @param {string} kullaniciAdi
 * @returns {Promise<Object>}
 */
export async function kullaniciProfiliGetir(kullaniciAdi) {
  const temizAd = (kullaniciAdi || 'Gölge Savaşçısı').trim();

  // Canlı API'de kullanıcı endpoint'i varsa dene
  try {
    const yanit = await axios.get(`${API_BASE}/users/${encodeURIComponent(temizAd)}`, {
      timeout: 4000
    });
    if (yanit.data && typeof yanit.data === 'object') {
      return {
        ...yanit.data,
        kaynak: 'canli_api'
      };
    }
  } catch (err) {
    // API endpoint'i henüz yoksa veya 404 döndüyse tematik samuray okur motorunu devreye sok
  }

  // Deterministik tematik Kage 95 hesaplama (kullanıcı adına göre sabit, tutarlı istatistikler)
  let hash = 0;
  for (let i = 0; i < temizAd.length; i++) {
    hash = (hash << 5) - hash + temizAd.charCodeAt(i);
    hash |= 0;
  }
  const pozitifHash = Math.abs(hash);

  // Rütbe ve Seviye Belirleme
  const seviye = (pozitifHash % 99) + 1; // 1 - 99 arası
  const okunanBolum = (seviye * 37) + (pozitifHash % 150);
  const tamamlananSeri = Math.floor(seviye / 7) + 1;

  let unvan = 'Gölge Ronin';
  let unvanEmoji = '🩸';
  let rutbeRengi = TEMA.RENKLER.BILGI;

  if (seviye >= 90) {
    unvan = 'Kage (Gölge Lordu)';
    unvanEmoji = '👑';
    rutbeRengi = TEMA.RENKLER.ALTIN;
  } else if (seviye >= 75) {
    unvan = 'Anbu Kaptanı';
    unvanEmoji = '🥷';
    rutbeRengi = TEMA.RENKLER.KAN_KIRMIZISI;
  } else if (seviye >= 50) {
    unvan = 'Jonin (Usta Samuray)';
    unvanEmoji = '🗡️';
    rutbeRengi = TEMA.RENKLER.GOLGE_KIRMIZISI;
  } else if (seviye >= 25) {
    unvan = 'Chunin (Kıdemli Okur)';
    unvanEmoji = '🏮';
    rutbeRengi = TEMA.RENKLER.KAN_KIRMIZISI;
  } else if (seviye >= 10) {
    unvan = 'Genin (Sayfa Avcısı)';
    unvanEmoji = '📜';
    rutbeRengi = TEMA.RENKLER.BILGI;
  }

  const klanlar = [
    'Kızıl Kılıç Hanedanı',
    'Gece Bekçileri',
    'Kan Kırmızı Gölge Birliği',
    'Yalnız Roninler Loncası',
    'Efsanevi Kage Muhafızları',
    'Mürekkep ve Çelik Klanı'
  ];
  const favoriTurler = ['Seinen', 'Karanlık Fantazi', 'Aksiyon', 'Gizem & Psikolojik', 'Tarihi & Samuray'];

  const klan = klanlar[pozitifHash % klanlar.length];
  const favoriTur = favoriTurler[pozitifHash % favoriTurler.length];

  return {
    kullaniciAdi: temizAd,
    seviye,
    unvan,
    unvanEmoji,
    rutbeRengi,
    okunanBolum,
    tamamlananSeri,
    klan,
    favoriTur,
    profilUrl: `${SITE_URL}/profil/${encodeURIComponent(temizAd)}`,
    kaynak: 'kage_rutbe_sistemi'
  };
}
