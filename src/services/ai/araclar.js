import { aiEylemiCalistir } from '../aiAjanServisi.js';
import { bakiyeGetir, liderlikListesi } from '../ekonomiServisi.js';

const S = (aciklama) => ({ type: 'STRING', description: aciklama });
const N = (aciklama) => ({ type: 'NUMBER', description: aciklama });

function arac(name, description, properties = {}, required = []) {
  const decl = { name, description };
  if (Object.keys(properties).length) {
    decl.parameters = { type: 'OBJECT', properties, ...(required.length ? { required } : {}) };
  }
  return decl;
}

// Herkesin kullanabildiği, salt okunur (ya da kendi notunu yazan) araçlar
const HERKESE_ACIK = [
  arac('site_veri_getir', 'kage95.com sitesinden canlı manga verisi çeker.', {
    islem: S('tum_mangalar | ara | detay | son_bolumler'),
    sorgu: S('ara için aranacak kelime'),
    id: N('detay için manga id')
  }, ['islem']),
  arac('kullanici_bilgi_getir', 'Bir kullanıcının Discord sicilini, rollerini, Ryo/seviye bilgisini ve hafıza notlarını getirir.', {
    kullanici: S('isim veya id')
  }, ['kullanici']),
  arac('sunucu_durum_getir', 'Sunucu üye sayısı, kanallar, roller, boost ve zenginlik sıralaması.'),
  arac('hafiza_ara', 'Kage\'nin kalıcı hafızasında arama yapar.', { sorgu: S('aranacak kelime') }, ['sorgu']),
  arac('hafiza_kaydet', 'Konuşan kişi hakkında hatırlanması gereken bir bilgiyi kalıcı hafızaya yazar.', {
    baslik: S('kısa başlık'),
    icerik: S('kaydedilecek bilgi')
  }, ['icerik']),
  arac('bakiye', 'Konuşan kişinin (ya da belirtilen kullanıcının) Ryo bakiyesi, kılıç seviyesi ve unvanı.', {
    kullanici_id: S('boşsa konuşan kişi')
  }),
  arac('liderlik', 'En zengin klan üyelerinin sıralaması.', { adet: N('1-10 arası, varsayılan 5') })
];

// Sadece yönetici kimliğiyle gelen sohbetlerde sunulan araçlar
const YONETICI = [
  arac('hafiza_yenile', 'Site ve sunucuyu tarayıp derin öğrenme döngüsünü tetikler.'),
  arac('kanal_mesaj_gonder', 'Belirtilen kanala mesaj/ferman yazar.', {
    kanal: S('kanal adı'), mesaj: S('mesaj'), embed_baslik: S('isteğe bağlı embed başlığı')
  }, ['kanal', 'mesaj']),
  arac('sunucu_sifirla', 'TÜM kanalları ve rolleri silip Kage mimarisini sıfırdan kurar. YIKICI.'),
  arac('sunucu_kur', 'Mevcut kanalları silmeden Kage mimarisini kurar.'),
  arac('kategori_olustur', 'Yeni kategori ve içine kanallar açar.', {
    isim: S('kategori adı'), kanallar: { type: 'ARRAY', items: { type: 'STRING' }, description: 'kanal adları' }
  }, ['isim']),
  arac('kanal_olustur', 'Kanal açar.', {
    isim: S('kanal-adi'), tur: S('metin | ses'), kategori: S('kategori adı'), emoji: S('emoji')
  }, ['isim']),
  arac('kanal_sil', 'Kanalı siler. YIKICI.', { isim: S('kanal adı') }, ['isim']),
  arac('kanal_duzenle', 'Kanal adı/konusu/yavaş modunu günceller.', {
    kanal: S('kanal adı'), yeni_isim: S('yeni ad'), konu: S('konu'), yavasmod: N('saniye')
  }, ['kanal']),
  arac('rol_olustur', 'Yeni rol oluşturur.', {
    isim: S('rol adı'), renk: S('altin | mor | mavi | kirmizi | #hex'), ayri_goster: { type: 'BOOLEAN' }
  }, ['isim']),
  arac('rol_sil', 'Rolü siler. YIKICI.', { isim: S('rol adı') }, ['isim']),
  arac('rol_ver', 'Üyeye rol verir.', { kullanici: S('isim veya id'), rol: S('rol adı') }, ['kullanici', 'rol']),
  arac('rol_al', 'Üyeden rol alır.', { kullanici: S('isim veya id'), rol: S('rol adı') }, ['kullanici', 'rol']),
  arac('kural_ekle', 'Kurallar kanalına madde ekler.', { kural: S('kural metni') }, ['kural']),
  arac('anket_yap', 'Oylamalı anket asar.', {
    soru: S('soru'), secenekler: { type: 'ARRAY', items: { type: 'STRING' }, description: 'seçenekler' }
  }, ['soru', 'secenekler']),
  arac('mesaj_sil', 'Bu kanaldan toplu mesaj siler. YIKICI.', { sayi: N('adet') }, ['sayi']),
  arac('duyuru_yap', 'Duyuru kanalına duyuru yapar.', {
    baslik: S('başlık'), icerik: S('içerik'), etiket: { type: 'BOOLEAN' }
  }, ['baslik', 'icerik']),
  arac('kullanici_sustur', 'Üyeyi süreli susturur.', {
    kullanici: S('isim veya id'), dakika: N('süre'), sebep: S('sebep')
  }, ['kullanici']),
  arac('kullanici_at', 'Üyeyi sunucudan atar. YIKICI.', { kullanici: S('isim veya id'), sebep: S('sebep') }, ['kullanici']),
  arac('kullanici_yasakla', 'Üyeyi banlar. YIKICI.', { kullanici: S('isim veya id'), sebep: S('sebep') }, ['kullanici']),
  arac('yavasmod_ayarla', 'Bu kanalın yavaş modunu ayarlar (0 kapatır).', { saniye: N('saniye') }, ['saniye']),
  arac('kilit_ayarla', 'Bu kanalı kilitler/açar.', { durum: S('kilitle | ac') }, ['durum']),
  arac('ryo_ekle', 'Üyeye Ryo ekler.', { kullanici: S('isim veya id'), miktar: N('miktar') }, ['kullanici', 'miktar'])
];

// Buton onayı gerektiren eylemler
export const YIKICI_EYLEMLER = new Set([
  'sunucu_sifirla', 'kullanici_yasakla', 'kullanici_at', 'kanal_sil', 'rol_sil', 'mesaj_sil'
]);

const YONETICI_AD = new Set(YONETICI.map(a => a.name));
const YEREL = new Set(['bakiye', 'liderlik']);

/** Yetkiye göre Gemini'ye sunulacak fonksiyon listesi. */
export function aracListesi({ yonetici }) {
  return yonetici ? [...HERKESE_ACIK, ...YONETICI] : HERKESE_ACIK;
}

export function yonetimEylemiMi(ad) {
  return YONETICI_AD.has(ad);
}

/**
 * Tek bir aracı çalıştırır. Yıkıcı eylemler burada ÇALIŞTIRILMAZ, çağıran taraf onay akışına sokar.
 * @returns {Promise<{basarili:boolean, detay?:string, hata?:string}>}
 */
export async function aracCalistir(ad, args = {}, ctx) {
  const { guild, channel, member, client, yonetici } = ctx;

  if (YONETICI_AD.has(ad) && !yonetici) {
    return { basarili: false, hata: 'Bu eylem için yönetici yetkisi gerekir.' };
  }

  if (ad === 'bakiye') {
    const id = args.kullanici_id || member?.id;
    const b = bakiyeGetir(id);
    return {
      basarili: true,
      detay: `Ryo: ${b.ryo}, Banka: ${b.banka}, Toplam: ${b.toplam}, Kılıç: ${b.kilic?.isim || b.kilic?.seviye}, Unvan: ${b.unvan}, Seri: ${b.streak}, Düello zaferi: ${b.duelloZafer}, Zindan zaferi: ${b.zindanZafer}`
    };
  }

  if (ad === 'liderlik') {
    const adet = Math.min(Math.max(Number(args.adet) || 5, 1), 10);
    const liste = liderlikListesi(adet);
    const satirlar = await Promise.all(liste.map(async (k, i) => {
      const u = await client?.users?.fetch(k.userId).catch(() => null);
      return `${i + 1}. ${u?.username || k.userId} — ${k.toplam} Ryo (${k.unvan})`;
    }));
    return { basarili: true, detay: satirlar.join('\n') || 'Henüz kimse yok.' };
  }

  let parametreler = args;
  if (ad === 'hafiza_kaydet' && !yonetici) {
    // Normal üye yalnızca kendi hakkında not düşebilir
    parametreler = {
      kategori: 'kullanici',
      baslik: args.baslik || 'Not',
      icerik: args.icerik,
      kullanici: member?.id
    };
  } else if (ad === 'hafiza_kaydet' && !args.kullanici && (!args.kategori || args.kategori === 'kullanici')) {
    parametreler = { ...args, kategori: 'kullanici', kullanici: member?.id };
  }

  return aiEylemiCalistir({ eylem: ad, parametreler, guild, channel, member, client });
}
