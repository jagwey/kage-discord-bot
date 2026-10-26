import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { kullaniciNotuEkle, profilGuncelle, bilgiOgren, hafizaKaydet } from './kageHafizaServisi.js';
import { akilliAiUret } from './aiRouterServisi.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const GOZ_DOSYASI = path.join(DATA_DIR, 'golge_goz_istatistik.json');

const VARSAYILAN_GOZ = {
  acik: true,
  toplamIncelenenMesaj: 0,
  ogrenilenBilgiSayisi: 0,
  onlenenIhlalSayisi: 0,
  sonTaramaZamani: null,
  sonOgrenilenler: [],
  sonIhlaller: []
};

let gozVerisi = null;
const mesajHavuzu = [];
let taramaSuruyor = false;

function gozYukle() {
  if (gozVerisi) return gozVerisi;
  try {
    if (fs.existsSync(GOZ_DOSYASI)) {
      gozVerisi = { ...VARSAYILAN_GOZ, ...JSON.parse(fs.readFileSync(GOZ_DOSYASI, 'utf8')) };
      return gozVerisi;
    }
  } catch {}
  gozVerisi = { ...VARSAYILAN_GOZ };
  gozKaydet();
  return gozVerisi;
}

function gozKaydet() {
  if (!gozVerisi) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GOZ_DOSYASI, JSON.stringify(gozVerisi, null, 2), 'utf8');
  } catch (err) {
    console.error('[GolgeGoz] Veri kaydedilemedi:', err.message);
  }
}

export function golgeGozDurumu() {
  return gozYukle();
}

// Reklam ve davet linki regex'i
const REKLAM_LINK_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9]+/i;

/**
 * Gelen mesajları 0 ms yerel sezgisel süzgeçten geçirir ve Gölge Havuzuna aktarır.
 * Botu ve sunucuyu asla yavaşlatmaz, asenkron ve non-blocking çalışır.
 * @param {import('discord.js').Message} message 
 */
export async function golgeGozMesajIsle(message) {
  if (!message || message.author?.bot || !message.guild) return;
  const v = gozYukle();
  if (!v.acik) return;

  v.toplamIncelenenMesaj += 1;
  const metin = (message.content || '').trim();
  if (!metin || metin.length < 3) return;

  // 1. ANLIK REKLAM / DAVET TESPİTİ (0 ms)
  if (REKLAM_LINK_REGEX.test(metin)) {
    // Yönetici değilse işaretle ve logla
    if (!message.member?.permissions?.has('ManageMessages')) {
      v.onlenenIhlalSayisi += 1;
      const ihlalKayit = {
        kullanici: message.author.tag,
        kullaniciId: message.author.id,
        kanal: message.channel.name,
        tip: 'İzinsiz Discord Davet Linki',
        zaman: new Date().toISOString()
      };
      v.sonIhlaller.unshift(ihlalKayit);
      if (v.sonIhlaller.length > 20) v.sonIhlaller.pop();
      gozKaydet();

      // Admin kanalına canlı istihbarat bildir
      adminIhlalBildir(message, 'İzinsiz Discord Davet Linki', metin);
    }
  }

  // 2. Anlamlı ve Bilgi Taşıyan Mesajları Gölge Havuzuna Ekle
  // Kısa selamlar, tek kelimelik mesajlar API'ye gitmez (Sıfır Kota Tüketimi)
  if (metin.length >= 15 && !metin.startsWith('/') && !metin.startsWith('!')) {
    mesajHavuzu.push({
      userId: message.author.id,
      userName: message.member?.displayName || message.author.username,
      kanal: message.channel.name,
      metin: metin.slice(0, 300),
      tarih: Date.now()
    });

    if (mesajHavuzu.length > 50) {
      mesajHavuzu.shift();
    }
  }
}

/**
 * Admin kanalına şüpheli eylem canlı istihbaratını gönderir
 */
function adminIhlalBildir(message, ihlalTipi, icerik) {
  try {
    const ayarlar = sunucuAyarGetir(message.guild.id);
    const hedefKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;
    if (!hedefKanalId) return;

    const adminKanal = message.guild.channels.cache.get(hedefKanalId);
    if (adminKanal && adminKanal.isTextBased()) {
      adminKanal.send({
        content: `👁️ **[GÖLGE GÖZÜ RADARI]** <#${message.channel.id}> odasında bir ihlal sezildi!\n` +
          `👤 **Kullanıcı:** ${message.author} (\`${message.author.tag}\`)\n` +
          `🚨 **Tespit:** \`${ihlalTipi}\`\n` +
          `📝 **Mesaj:** ||${icerik.slice(0, 150)}||`,
        allowedMentions: { parse: [] }
      }).catch(() => null);
    }
  } catch (err) {
    console.warn('[GolgeGoz AdminLog]', err.message);
  }
}

/**
 * Arka planda toplanan sohbet havuzunu TEK BİR API ÇAĞRISIYLA analiz eder.
 * Kullanıcıların ilgi alanlarını, favori mangalarını ve sunucu bilgilerini otonom öğrenir.
 * Sıfır yorgunluk ve ultra düşük kota tüketimi sağlar.
 * @param {import('discord.js').Client} client 
 */
export async function golgeGozTopluAnaliz(client) {
  if (taramaSuruyor || mesajHavuzu.length < 5) return;
  taramaSuruyor = true;
  const v = gozYukle();

  try {
    // Havuzdaki mesajları al ve havuzu boşalt
    const islenecekMesajlar = mesajHavuzu.splice(0, 15);
    const sohbetMetni = islenecekMesajlar.map(m => `[${m.userName} | #${m.kanal}]: ${m.metin}`).join('\n');

    const prompt = `Aşağıda Discord kalesinde konuşulan son mesajlar yer alıyor:\n\n${sohbetMetni}\n\n` +
      `GÖREV:\n` +
      `1. Kullanıcıların kendileri hakkında paylaştığı önemli kişisel gerçekleri (örn: yaş, şehir, evcil hayvan, favori manga/anime, meslek vb.) tespit et.\n` +
      `Her tespit için format: [KULLANICI_BILGI: <KullanıcıAdı> | <Gerçek Bilgi>]\n` +
      `2. Sunucuya, kage95 platformuna veya topluluğa dair yeni bir genel kural/bilgi varsa çıkar: [GENEL_BILGI: <Kısa Başlık> | <İçerik>]\n` +
      `3. Eğer kayda değer yeni bir bilgi yoksa sadece [BİLGİ_YOK] yaz.\n` +
      `Cevabını sade ve sadece bu formatta ver.`;

    // Ultra hızlı ve hafif Groq / Pollinations modelini kullan
    const sonuc = await akilliAiUret({
      prompt,
      gorevTipi: 'hizli_sohbet',
      userId: 'golge_goz_sistemi',
      userName: 'Gölge Gözü'
    });

    const cevap = sonuc.metin || '';

    // Kullanıcı bilgilerini işle
    const uRegex = /\[KULLANICI_BILGI:\s*([^\|]+)\|\s*([^\]]+)\]/gi;
    let uMatch;
    while ((uMatch = uRegex.exec(cevap)) !== null) {
      const uAd = uMatch[1].trim();
      const bilgi = uMatch[2].trim();
      if (bilgi && bilgi.length >= 4) {
        // İlgili mesajdan userId bul
        const eslesen = islenecekMesajlar.find(m => m.userName.toLowerCase() === uAd.toLowerCase());
        const uId = eslesen?.userId || `anon_${uAd.toLowerCase()}`;

        kullaniciNotuEkle(uId, uAd, bilgi);
        profilGuncelle(uId, { kisaOzet: bilgi });

        v.ogrenilenBilgiSayisi += 1;
        v.sonOgrenilenler.unshift({ kullanici: uAd, bilgi, zaman: new Date().toISOString() });
        if (v.sonOgrenilenler.length > 20) v.sonOgrenilenler.pop();
      }
    }

    // Genel bilgileri işle
    const gRegex = /\[GENEL_BILGI:\s*([^\|]+)\|\s*([^\]]+)\]/gi;
    let gMatch;
    while ((gMatch = gRegex.exec(cevap)) !== null) {
      const baslik = gMatch[1].trim();
      const icerik = gMatch[2].trim();
      if (baslik && icerik) {
        bilgiOgren('otonom_goz', baslik, icerik, 'Gölge Gözü AI');
        v.ogrenilenBilgiSayisi += 1;
      }
    }

    v.sonTaramaZamani = new Date().toISOString();
    gozKaydet();
    hafizaKaydet();
  } catch (err) {
    console.warn('[GolgeGoz] Toplu analiz atlandı:', err.message);
  } finally {
    taramaSuruyor = false;
  }
}

/**
 * Bot başlatıldığında Gölge Gözü servisinin periyodik arka plan tarayıcısını kurar (60 saniye aralıkla)
 * @param {import('discord.js').Client} client 
 */
export function golgeGozServisiniBaslat(client) {
  gozYukle();
  console.log('[GolgeGoz] 👁️ Kage-95 Gölge Gözü (Otonom Sunucu Nöbetçisi & Öğrenme Motoru) devrede!');

  // Her 60 saniyede bir hafif toplu analiz döngüsü
  setInterval(() => {
    golgeGozTopluAnaliz(client).catch(() => null);
  }, 60 * 1000);
}
