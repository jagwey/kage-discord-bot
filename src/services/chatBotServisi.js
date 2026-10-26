import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AttachmentBuilder } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { bakiyeGetir, liderlikListesi, KILIC_SEVIYELERI } from './ekonomiServisi.js';
import { tumMangalariGetir, mangaAra } from './mangaServisi.js';
import { hafizaBaglamMetniUret, kullaniciNotuEkle, hafizaArama } from './kageHafizaServisi.js';
import { duyguTespit } from './duyguServisi.js';
import { sunucuOzetiMetni } from './sunucuBilgiServisi.js';
import { egitimBaglami, ciktiyiDenetle, stickerKurali, argoModuMu, saygiIhlaliVarMi } from './egitimServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STICKERS_DIR = path.join(__dirname, '../../assets/stickers');
const KUNOICHI_DIR = path.join(STICKERS_DIR, 'kunoichi');

const STICKER_DOSYALARI_ERKEK = {
  savas: path.join(STICKERS_DIR, 'kage_savas.png'),
  cay: path.join(STICKERS_DIR, 'kage_cay.png'),
  ofke: path.join(STICKERS_DIR, 'kage_ofke.png'),
  zafer: path.join(STICKERS_DIR, 'kage_zafer.png'),
  para: path.join(STICKERS_DIR, 'kage_para.png'),
  sevgi: path.join(STICKERS_DIR, 'kage_sevgi.png'),
  dusunce: path.join(STICKERS_DIR, 'kage_dusunce.png')
};

const STICKER_DOSYALARI_KUNOICHI = {
  savas: path.join(KUNOICHI_DIR, 'kage_savas.png'),
  cay: path.join(KUNOICHI_DIR, 'kage_cay.png'),
  ofke: path.join(KUNOICHI_DIR, 'kage_ofke.png'),
  zafer: path.join(KUNOICHI_DIR, 'kage_zafer.png'),
  para: path.join(KUNOICHI_DIR, 'kage_para.png'),
  sevgi: path.join(KUNOICHI_DIR, 'kage_sevgi.png'),
  dusunce: path.join(KUNOICHI_DIR, 'kage_dusunce.png')
};

// ==========================================
// KIZ / KUNOICHI KULLANICI TESPİT SİSTEMİ
// ==========================================
const KIZ_ROL_IPUCLARI = [
  'kız', 'kiz', 'kadın', 'kadin', 'bayan', 'kunoichi', 'prenses', 'waifu',
  'female', 'she/her', 'she / her', 'girl', 'hanım', 'hanim', 'kraliçe', 'kralice'
];

const KIZ_ISIM_IPUCLARI = [
  'chan', '_chan', '-chan', 'girl', 'kiz', 'kız', 'bayan', 'prenses', 'hanim', 'hanım', 'waifu',
  'sakura', 'hinata', 'tsunade', 'rias', 'alya', 'mikasa', 'nezuko', 'nami', 'robin', 'zerotwo',
  'asuna', 'rem', 'ram', 'marin', 'yor', 'anya', 'ayşe', 'ayse', 'fatma', 'elif', 'zeynep',
  'merve', 'irem', 'büşra', 'busra', 'ezgi', 'ceren', 'tuğba', 'tugba', 'kübra', 'kubra',
  'gamze', 'selin', 'ecem', 'damla', 'dilara', 'melis', 'melisa', 'aleyna', 'esra', 'eda',
  'sena', 'hazal', 'özge', 'ozge', 'hilal', 'şeyma', 'seyma', 'gizem', 'yasemin', 'aslı',
  'asli', 'defne', 'deniz', 'duru', 'derin', 'yağmur', 'yagmur'
];

const KIZ_METIN_BILDIRIMLERI = [
  'ben kızım', 'kızım ben', 'bayanım', 'kadınım', 'ben bir kızım', 'ben bi kızım',
  'kızım olm', 'kızım knk', 'kızım kanka', 'ben hanımım', 'kunoichiyim'
];

/**
 * Kullanıcının rol, takma ad, kullanıcı adı veya mesaj içeriğinden kız olduğunu tespit eder.
 * @param {import('discord.js').User} user 
 * @param {import('discord.js').GuildMember|null} member 
 * @param {string} metin 
 * @returns {boolean}
 */
export function kullaniciKizMi(user, member = null, metin = '') {
  const metinKucuk = (metin || '').toLowerCase();
  if (KIZ_METIN_BILDIRIMLERI.some(k => metinKucuk.includes(k))) {
    return true;
  }

  if (member?.roles?.cache) {
    const rolesList = typeof member.roles.cache.some === 'function'
      ? member.roles.cache
      : Array.from(member.roles.cache.values ? member.roles.cache.values() : member.roles.cache);

    const hasRole = rolesList.some(r => {
      const rName = (r?.name || '').toLowerCase();
      return KIZ_ROL_IPUCLARI.some(ipucu => rName.includes(ipucu));
    });
    if (hasRole) return true;
  }

  const isimler = [
    member?.displayName?.toLowerCase() || '',
    user?.globalName?.toLowerCase() || '',
    user?.username?.toLowerCase() || ''
  ];

  for (const isim of isimler) {
    if (!isim) continue;
    for (const ipucu of KIZ_ISIM_IPUCLARI) {
      if (isim.includes(ipucu)) return true;
    }
  }

  return false;
}

// ==========================================
// 1. KELİME & NİYET HARİTASI
// ==========================================
const YETKI_TALEP = [
  'şunu yap', 'sunucuya ekle', 'rol aç', 'rol oluştur', 'rol ver', 'rol al',
  'kanal aç', 'kanal sil', 'kategori aç', 'kategori sil', 'banla', 'kickle',
  'sustur', 'mutele', 'temizle', 'sil', 'kural ekle', 'kuralları düzenle',
  'sunucuyu kur', 'sunucuyu sıfırla', 'admin yap', 'yetki ver', 'bana rol ver', 'botu kapat'
];

const BENI_TANIYOR_MUSUN = ['beni tanıyor musun', 'ben kimim', 'profilim nasıl', 'hakkımda ne biliyorsun', 'beni analiz et', 'ben kimim ki', 'sicilim'];
const SITEDE_NE_VAR = ['sitede ne var', 'yeni mangalar', 'yeni bölümler', 'manga listesi', 'kütüphane', 'hangi mangalar var', 'son çıkanlar', 'trendler', 'site arşivi'];
const MANGA_ONERI = ['manga öner', 'ne okusam', 'güzel manga', 'manhwa öner', 'tavsiye', 'ne okuyayım', 'manga tavsiyesi', 'bana manga ver'];
const KILIC_DEMIRCI_DURUM = ['kılıcım', 'kılıcımı nasıl güçlendiririm', 'demirci', 'kılıç durumu', 'param kılıca yeter mi', 'katana güçlendir', 'muramasa', 'katanam', 'kılıç seviyem', 'kılıç yükselt'];
const ZINDAN_SIMULASYON = ['zindana gireyim mi', 'zindanı geçer miyim', 'zindan taktiği', 'zindanda nasıl kazanırım', 'zindan rehberi', 'zindan ne', 'canavarlar', 'zindana nasıl girilir', 'zindan'];
const DULLO_TAVSIYE = ['kiminle düello', 'düello kimi önerirsin', 'düello taktiği', 'düello', 'meydan oku', 'kime meydan okuyayım'];
const EN_ZENGIN_KIM = ['en zengin kim', 'klanın en zengini', 'lider kim', 'zenginler', 'liderlik', 'en çok para kimde', 'sıralama'];
const GOREV_BUGUN = ['bugün ne yapayım', 'görev ver', 'ne yapmalıyım', 'günlük plan', 'ne önerirsin'];
const MINI_ZAR = ['zar at', 'zar', 'zar salla'];
const MINI_YAZITURA = ['yazı tura at', 'para at', 'yazı tura', 'bozuk para at'];
const MINI_BILMECE = ['bilmece sor', 'bilmece', 'soru sor', 'bulmaca'];
const STICKER_ISTEGI = ['sticker at', 'çıkartma at', 'sticker ver', 'bana sticker', 'sticker', 'çıkartma'];

const KUMAR_REHBER = ['kumar nasıl', 'blackjack nasıl', 'slot nasıl', 'kumar taktiği', 'kazanma taktiği', 'kumar', 'blackjack', 'slot', 'yazitura', 'yazı tura', 'bahis'];
const RYO_EKONOMI = ['ryo nasıl kazanılır', 'para nasıl kasılır', 'para kazan', 'nasıl zengin olurum', 'ryo ne', 'ryo kasma', 'para kasmak', 'para kasma', 'ryo kas'];
const BAKIYE_PARAM = ['param ne kadar', 'param kaç', 'bakiyem ne', 'kaç ryo var', 'cüzdanım', 'fakir miyim', 'zengin miyim', 'param'];
const SUNUCU_DURUMU = ['sunucu nasıl', 'kalede durumlar ne', 'sunucu durumu', 'kaç kişiyiz', 'sunucu kimin', 'klan ne', 'kage kalesi', 'üye sayısı', 'sunucu bilgisi', 'yeni gelen', 'yeni üye', 'kimler geldi', 'hangi kanal', 'kanalları', 'roller', 'hangi sticker', 'emojiler'];
const KURALLAR = ['kurallar', 'kural ne', 'ceza var mı', 'yasak ne', 'spoiler kuralı', 'kurallar neler'];
const KAYIT_OLMA = ['nasıl kayıt olunur', 'kayıt ol', 'kayıt nasıl', 'kayıt kapısı'];
const ROLLER_UNVAN = ['rol nasıl', 'roller ne', 'hangi roller var', 'unvan', 'nasıl rol alırım', 'seviye rolü', 'unvanlar'];
const YETKILILER = ['yetkili kim', 'modlar kim', 'admin kim', 'şogun kim', 'moderatörler', 'daimyo'];
const KURUCU_SAHIP = ['yapımcın kim', 'sahibin kim', 'seni kim yaptı', 'geliştiricin kim', 'kim kodladı', 'kurucun kim', 'jagwey kim', 'jagwey', 'sahip kim'];
const BUSHIDO_FELSEFE = ['bushido', 'samuray yolu', 'felsefe yap', 'günün sözü', 'özlü söz', 'anlamlı söz', 'felsefe', 'öğüt ver'];
const FAL_SANS = ['falıma bak', 'şansım nasıl', 'fal bak', 'kaderim ne', 'bugün şanslı mıyım', 'fal', 'burcum ne', 'burç'];
const HAVA_DURUMU = ['hava nasıl', 'hava durumu', 'dışarıda hava nasıl'];
const TROLL_SEVGI = ['beni seviyor musun', 'sevgilin var mı', 'evlenelim mi', 'aşık mısın', 'öpücük ver', 'benimle çıkar mısın', 'canım'];
const TROLL_ESPRI = ['şaka yap', 'fıkra anlat', 'güldür beni', 'komik bir şey söyle', 'espri yap', 'espri'];
const RAKIP_BOTLAR = ['mee6', 'dino', 'probot', 'carl', 'diğer botlar', 'owo', 'mudae'];
const KUFUR_HAKARET = ['aptal', 'salak', 'mal', 'gerizekalı', 'çöp bot', 'kötü bot', 'beceriksiz', 'orospu', 'piç', 'sikik'];
const PING_HIZ = ['ping', 'gecikme', 'hızlı mısın', 'ms kaç'];
const OVGU = ['adamsın', 'kral', 'harikasın', 'helal', 'sevdim seni', 'cansın', 'eyvallah', 'çok iyisin', 'harika'];
const YARDIM = ['yardım', 'komutlar', 'ne yapabilirsin', 'help', 'neler yaparsın', 'nasıl kullanılır'];

const HAL_HATIR = ['nasılsın', 'naber', 'ne haber', 'nasıl gidiyor', 'nörüyon', 'napıyon', 'ne yapıyorsun', 'iyisin', 'nasılsınız'];
const KULLANICI_IYI = ['iyiyim', 'ben de iyiyim', 'harikayım', 'süperim', 'bomba gibiyim', 'iyi çok şükür', 'fena değil'];
const KULLANICI_KOTU = ['kötüyüm', 'canım sıkkın', 'moralim bozuk', 'üzgünüm', 'keyfim yok', 'yoruldum', 'sıkıldım'];
const SELAMLAR = ['selam', 'merhaba', 'sa', 'selamun aleykum', 'hey', 'günaydın', 'iyi akşamlar', 'iyi geceler', 'selamlar', 'yo', 's.a', 'hello'];
const KIMLIK = ['kimsin', 'adın ne', 'nesin', 'sen kimsin', 'kendini tanıt', 'adın nedir', 'ne işe yararsın'];

// Anime Karşılaştırmaları
const ANIME_DEBATELERI = [
  { anahtar: ['zoro mu sanji mi', 'sanji mi zoro mu'], cevap: '🗡️ Elbette üç kılıç ustası **Roronoa Zoro**! Bir samurayın kalbinde aşçılar değil, çeliğin yolunu seçenler yatar. Enma kılıcının kudreti tartışılmaz!' },
  { anahtar: ['naruto mu sasuke mi', 'sasuke mi naruto mu'], cevap: '🥷 Sasuke gölgelerin ve intikam katanasının yolunu seçti; Naruto ise pes etmeyen azmin simgesi oldu. Kage Klanı gölgeleri sevse de, iki kılıç ustasının çarpışmasında çelik konuşur!' },
  { anahtar: ['goku mu saitama mı', 'saitama mı goku mu'], cevap: '💥 Saitama antrenmanla sınırları yıktı tek atıyor, Goku ise her ölümün eşiğinden ilahi güçle dönüyor. Ama bizim Kage evreninde ikisi de Şogun\'un önünde saygıyla eğilir!' },
  { anahtar: ['gojo mu sukuna mı', 'sukuna mı gojo mu'], cevap: '🩸 Sınırsız Boşluk mu, İblis Lordunun Kesme Alanı mı? Gojo en güçlüydü ama Sukuna antik bir zindan boss\'u gibi affetmedi. Tıpkı bizim Magma Tapınağı Ejderi gibi!' },
  { anahtar: ['luffy mi naruto mu', 'naruto mu luffy mi'], cevap: '👑 Biri Korsanlar Kralı, diğeri Hokage. Ama ikisinin de ortak noktası asla pes etmemeleri ve kage95.com\'da manga okumayı sevmeleridir!' }
];

const BILMECELER = [
  {
    soru: 'Kını vardır ama bıçağı yoktur, harfleri keser ama kan akıtmaz. Nedir bu?',
    cevap: '🖋️ **Cevap:** Kalem (veya parşömene yazan samurayın bilgeliği!)'
  },
  {
    soru: 'Gündüzleri gölgede saklanır, geceleri parıldar, gözle görülmez ama soğuk rüzgarı hissedilir. Nedir bu?',
    cevap: '🥷 **Cevap:** Kage Suikastçısı'
  },
  {
    soru: 'Ne kadar çok döversen o kadar parlar, ateşe atarsan daha da güçlenir. Nedir bu?',
    cevap: '⚔️ **Cevap:** Çelik Katana'
  },
  {
    soru: 'Yenildiğinde utanç değil zafer verir, kınına girdiğinde savaş biter. Nedir bu?',
    cevap: '🌸 **Cevap:** Samuray Onuru'
  }
];

const SAMURAY_SOZLERI = [
  '⛩️ *"Bir kılıç ustası gücünü kınından değil, sabrından alır."* — Miyamoto Musashi',
  '🥷 *"Gölgeler asla yalan söylemez. Rüzgar eser, yaprak düşer ama onur sonsuza dek yaşar."*',
  '🌸 *"Kiraz çiçekleri rüzgarla savrulur ama gerçek bir samuray fırtınanın gözünde bile dimdik durur."*',
  '🗡️ *"Karanlık çöktüğünde yalnızca en keskin katanalar parıldar. Zihnini sustur, kılıcını dinle."*',
  '🍵 *"Acele eden savaşçı kılıcını kınında unutur. Sakin ol, nefes al ve bir fincan yeşil çay iç."*',
  '🏮 *"Bin zafer kazansan bile alçakgönüllülüğü elden bırakırsan tek bir darbeyle devrilirsin."* — Hagakure'
];

function iceriyorMu(metin, kalipDizisi) {
  const kelimeListesi = metin.split(/[\s.,!?:;]+/);
  return kalipDizisi.some(kalip => {
    if (!kalip.includes(' ') && kalip.length <= 4) {
      return kelimeListesi.includes(kalip);
    }
    return metin.includes(kalip);
  });
}

function gunlukFalUret(userId) {
  const bugun = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < (userId + bugun).length; i++) {
    hash = (hash << 5) - hash + (userId + bugun).charCodeAt(i);
    hash |= 0;
  }
  const sansYuzde = Math.abs(hash % 71) + 30;
  const ruhlar = [
    { ad: '🐅 Kızıl Kaplan Ruhu', desc: 'Zindanlarda canavarları parçalayacak vahşi bir enerji var içinde!' },
    { ad: '🐉 Gölge Ejderi Ruhu', desc: 'Bugün kumarda ve kılıç dövüşünde altın oranın zirvesindesin.' },
    { ad: '🐺 Ak Kurt Ruhu', desc: 'Sakin ve ölümcül. Pusu kurup büyük ödülleri toplayacağın bir gün.' },
    { ad: '🦅 Gök Tengu Ruhu', desc: 'Çevikliğin tavan yapmış. Zindanda kaçış ve blok hamlelerin tutacak.' },
    { ad: '🎋 Kadim Bambu Ruhu', desc: 'Kırılmaz bir sabır. Bugün riskli hareketler yerine Ryo biriktirmeye odaklan.' }
  ];
  const ruh = ruhlar[Math.abs(hash % ruhlar.length)];
  return { sansYuzde, ruh };
}

/**
 * Gemini REST API ile açık uçlu sorulara Kage Persona'sıyla canlı yapay zeka yanıtı üretir.
 */
async function geminiPersonaSohbet(kullaniciMesaji, baglam) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const hafizaBaglami = hafizaBaglamMetniUret(kullaniciMesaji, baglam.userId, baglam.userName);

  const egitimBlogu = egitimBaglami(baglam.guildId, baglam.userId, kullaniciMesaji);

  const prompt = `Sen Kage-95 (https://kage95.com) manga platformunun ve bu Discord kalesinin bilge, zeki, anime sever, samuray muhafızısın. Kurucumuz ve liderimiz Jagwey'dir.
Konuştuğun kullanıcı: ${baglam.userName} (Kalenin ${baglam.katilimMetni} bir savaşçısı, elinde ${baglam.kilicAd} var, kesesinde ${baglam.ryo} Ryo taşıyor).

${hafizaBaglami}

${egitimBlogu}

Kullanıcı sana şunu sordu/söyledi:
"${kullaniciMesaji}"

GÖREVİN:
1. Son derece samimi, akıllı, hazırcevap, samuray onuru ve anime kültürüyle yoğrulmuş bilgece Türkçe yanıt ver.
2. Karşındakinin gerçek bir samuray dostun olduğunu hissettir. Gerektiğinde katanasından, Ryo'sundan veya kage95.com mangasından esprili bahset.
3. Hafıza bankandaki bilgileri doğal bir bilgelikle kullan, karşındakini tanıdığını ve sitedeki yenilikleri bildiğini hissettir.
4. Asla sunucu yönetimi/komut icra ettiğini iddia etme. 1-3 paragraf arası net, akıcı ve büyüleyici konuş.`;

  try {
    const yanit = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.75 }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    const text = yanit.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? ciktiyiDenetle(text.trim()) : null;
  } catch (err) {
    console.warn('[ChatBot Gemini] Persona yanıtı üretilemedi:', err.message);
    return null;
  }
}

/**
 * DÜNYANIN EN DETAYLI DISCORD CHATBOT MOTORU
 * Canlı veritabanı, üye telemetrisi, düello kıyaslama, yapay zeka ve PİKSEL STİCKER desteği.
 * @param {string} mesajMetni 
 * @param {import('discord.js').User} user 
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').GuildMember} member 
 * @param {import('discord.js').Message} message 
 * @returns {Promise<{ embed: import('discord.js').EmbedBuilder, files: import('discord.js').AttachmentBuilder[] }>}
 */
export async function chatBotYanitla(mesajMetni, user, guild = null, member = null, message = null) {
  const metin = (mesajMetni || '').trim().toLowerCase();
  const userName = member?.displayName || user.username;
  const guildName = guild?.name || 'Kage Klanı';
  const memberCount = guild?.memberCount || 'yüzlerce';
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';
  const isFemale = kullaniciKizMi(user, member, metin);

  // Canlı Üye Verileri
  const bakiye = bakiyeGetir(user.id);
  const ryo = bakiye.ryo || 0;
  const banka = bakiye.banka || 0;
  const streak = bakiye.streak || 0;
  const kilic = bakiye.kilic || KILIC_SEVIYELERI[0];
  const unvan = bakiye.unvan || 'Acemi Samuray';
  const duelloZafer = bakiye.duelloZafer || 0;
  const duelloMaglubiyet = bakiye.duelloMaglubiyet || 0;
  const zindanZafer = bakiye.zindanZafer || 0;
  const envanter = bakiye.envanter || [];

  // Üyenin katılım süresi
  let katilimMetni = 'kalede yenisin';
  let katilimGun = 0;
  if (member?.joinedTimestamp) {
    katilimGun = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
    katilimMetni = katilimGun === 0 ? 'bugün katıldın' : `tam ${katilimGun} gündür aramızdasın`;
  }

  // Ses Kanalı Kontrolü
  const sesKanali = member?.voice?.channel;
  const sesDurumu = sesKanali ? `🎙️ Şu an **${sesKanali.name}** ses odasında nefes alıyorsun.` : '';

  // Üye Rolleri
  let rollerMetni = isFemale ? 'Zarif Kunoichi' : 'Normal Samuray';
  if (member?.roles?.cache) {
    const rolesIter = typeof member.roles.cache.filter === 'function'
      ? member.roles.cache
      : Array.from(member.roles.cache.values ? member.roles.cache.values() : member.roles.cache);
    const onemliRoller = rolesIter
      .filter(r => r.name !== '@everyone')
      .map(r => r.name)
      .slice(0, 3);
    if (onemliRoller.length > 0) rollerMetni = onemliRoller.join(' • ');
  }

  let baslik = isFemale ? '🌸 KAGE KUNOICHI • Kunoichi Yanıtı' : '🗡️ KAGE CHAT BOT • Samuray Yanıtı';
  let aciklama = '';
  let renk = isFemale ? 0xFF66B2 : TEMA.RENKLER.BILGI;
  let duygu = 'cay'; // varsayılan duygu modu: savas, cay, ofke, zafer, para, sevgi, dusunce
  let stickerTamBoy = false;

  // =========================================================================
  // 1. GÜVENLİK & YETKİ KORUMASI
  // =========================================================================
  if (iceriyorMu(metin, YETKI_TALEP)) {
    duygu = 'ofke';
    baslik = isFemale ? '🚫 YETKİ REDDEDİLDİ • HADDİNİ BİL GÜZEL KUNOICHI!' : '🚫 YETKİ REDDEDİLDİ • HADDİNİ BİL ÇEKİRGE!';
    renk = TEMA.RENKLER.HATA;
    aciklama = `**${userName}**, dur bakalım orada!\n\n` +
      `Ben sadece **Klan Liderim Şogun'un (Sunucu Yetkilisi)** emirlerini dinler ve yapay zeka mimarımı ona sunarım.\n\n` +
      `Normal kullanıcılar için sunucu yönetim yapay zekası devre dışıdır.\n` +
      `Sen katananı kuşanıp **/zindan**'a inebilir, **/blackjack** ile şansını deneyebilir veya **/manga** okuyabilirsin!`;
  }

  // =========================================================================
  // 2. DOĞRUDAN STICKER İSTEĞİ (Örn: "kage sticker at", "kage çıkartma ver")
  // =========================================================================
  else if (iceriyorMu(metin, STICKER_ISTEGI)) {
    stickerTamBoy = true;
    if (metin.includes('savaş') || metin.includes('saldır') || metin.includes('katana') || metin.includes('kunai')) {
      duygu = 'savas';
      baslik = isFemale ? '🌸 KUNOICHI PİKSEL ÇIKARTMASI • SAVAŞ MODU' : '🗡️ KAGE PİKSEL ÇIKARTMASI • SAVAŞ MODU';
      aciklama = isFemale
        ? `Çift kunai ve sakura katanasını kınından çektim zarif kunoichi **${userName}**! Kiraz çiçekleri ve alevli çelikle düşmanları dize getirmeye hazırım! 🗡️🌸`
        : `Katanayı kınından çektim **${userName}**! Gölgelerin içinden savrulan alevli çelik iblisleri ikiye bölmeye hazır!`;
    } else if (metin.includes('öfke') || metin.includes('kızgın') || metin.includes('iblis') || metin.includes('tsundere')) {
      duygu = 'ofke';
      baslik = isFemale ? '💢 KUNOICHI PİKSEL ÇIKARTMASI • TSUNDERE ÖFKESİ' : '💀 KAGE PİKSEL ÇIKARTMASI • İBLİS ÖFKESİ';
      aciklama = isFemale
        ? `Tsundere gölge aurası alevlendi! Kage Kalesi'ne saygısızlık yapanların karşısına dikilen sevimli ama ölümcül kunoichi öfkesi! 💀💢`
        : `Karanlık aura alevlendi! Kage Kalesi'ne saygısızlık yapanların karşısına dikilen kadim gölge maskesi!`;
    } else if (metin.includes('para') || metin.includes('kumar') || metin.includes('ryo')) {
      duygu = 'para';
      baslik = isFemale ? '💰 KUNOICHI PİKSEL ÇIKARTMASI • ALTIN RYO' : '💰 KAGE PİKSEL ÇIKARTMASI • ALTIN RYO';
      aciklama = isFemale
        ? `Altın Ryo parası parmaklarımın ucunda fırıl fırıl dönüyor tatlı kunoichi **${userName}**! Şansını masalarda denemek için cesaretin var mı? ✨🪙`
        : `Kızıl Ryo parası havada taklalar atıyor! Şansını masalarda denemek için cesaretin var mı?`;
    } else if (metin.includes('sevgi') || metin.includes('tatlı') || metin.includes('aşk')) {
      duygu = 'sevgi';
      baslik = isFemale ? '💖 KUNOICHI PİKSEL ÇIKARTMASI • ONURLU SEVGİ' : '🌸 KAGE PİKSEL ÇIKARTMASI • ONURLU SEVGİ';
      aciklama = isFemale
        ? `Kiraz çiçekleri arasında kalbimin kapısı sana açıldı **${userName}**! Sen Kage Kalesi'nin en zarif ve sadık çiçeğisin. 🌸🎀`
        : `Kiraz çiçekleri arasında kalbimin kını sana açıldı **${userName}**! Klanımızın sadık bir neferisin.`;
    } else if (metin.includes('düşünce') || metin.includes('soru') || metin.includes('bilmece')) {
      duygu = 'dusunce';
      baslik = isFemale ? '❓ KUNOICHI PİKSEL ÇIKARTMASI • DERİN DÜŞÜNCE' : '❓ KAGE PİKSEL ÇIKARTMASI • DERİN DÜŞÜNCE';
      aciklama = isFemale
        ? `Başımı yana eğip gölgelerin fısıltılarını tartıyorum tatlı savaşçı... Sırada ne var acaba? 🌸✨`
        : `Zihnimi toparlıyor ve gölgelerin fısıltılarını tartıyorum... Sırada ne var acaba?`;
    } else if (metin.includes('zafer') || metin.includes('kral') || metin.includes('şogun')) {
      duygu = 'zafer';
      baslik = isFemale ? '👑 KUNOICHI PİKSEL ÇIKARTMASI • KUNOICHI ZAFERİ' : '👑 KAGE PİKSEL ÇIKARTMASI • ŞOGUN ZAFERİ';
      aciklama = isFemale
        ? `Altın kanzashi çiçeğimiz saçımızda, zafer katanamızın ucunda! Bu kalede sadece en güçlü kunoichiler parlar. 🌸👑`
        : `Şogun tacı başımızda, zafer katanamızın ucunda! Bu kalede sadece en güçlüler ayakta kalır.`;
    } else {
      duygu = 'cay';
      baslik = isFemale ? '🍵 KUNOICHI PİKSEL ÇIKARTMASI • SAKİN ÇAY MOLASI' : '🍵 KAGE PİKSEL ÇIKARTMASI • SAKİN ÇAY MOLASI';
      aciklama = isFemale
        ? `Kılıcını bir kenara bırak zarif **${userName}**... Sıcak bir kase matcha yeşil çayı ve kiraz çiçekleriyle zihnini dinlendirme vakti. 🍵🌸`
        : `Kılıcını bir kenara bırak **${userName}**... Sıcak bir kase matcha yeşil çayı içip zihnini dinlendirme vakti.`;
    }
  }

  // =========================================================================
  // 3. KULLANICI vs KULLANICI GÜÇ / DÜELLO KARŞILAŞTIRMASI
  // =========================================================================
  else if (message?.mentions?.users?.size > 0 && (metin.includes('güçlü') || metin.includes('kıyas') || metin.includes('dövebilir') || metin.includes('zengin'))) {
    duygu = 'savas';
    const rakipUser = message.mentions.users.first();
    const rakipBakiye = bakiyeGetir(rakipUser.id);
    const rakipKilic = rakipBakiye.kilic || KILIC_SEVIYELERI[0];

    baslik = '⚔️ SAMURAY GÜÇ & SICIL KARŞILAŞTIRMASI';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;

    const senSkor = (kilic.bonus || 0) + (duelloZafer * 2) + (zindanZafer * 3);
    const rakipSkor = (rakipKilic.bonus || 0) + (rakipBakiye.duelloZafer * 2) + (rakipBakiye.zindanZafer * 3);

    let tahmin = '';
    if (senSkor > rakipSkor) {
      tahmin = `🔥 **Zafer İbresi Senden Yana!** Katanan ve savaş tecrüben ${rakipUser.username}'i gölgede bırakıyor. Bir **/duello @${rakipUser.username}** atsan parasını alırsın!`;
    } else if (rakipSkor > senSkor) {
      tahmin = `⚠️ **Tehlikeli Rakip!** ${rakipUser.username} [${rakipKilic.ad}] ile senden daha tecrübeli görünüyor. Önce demircide kılıcını dövdür!`;
    } else {
      tahmin = `⚖️ **Eşit Güçler!** İkinizin de kılıç hüneri birbirine denk. Bu dövüş nefesleri keser!`;
    }

    aciklama = `İki savaşçının sicilini tarttım:\n\n` +
      `👤 **${userName} (Sen):**\n` +
      `• Kılıç: ${kilic.ad} (+%${kilic.bonus} Hasar)\n` +
      `• Zindan: \`${zindanZafer} Zafer\` | Düello: \`${duelloZafer} Galibiyet\` | Cüzdan: \`${ryo} Ryo\`\n\n` +
      `👤 **${rakipUser.username} (Rakip):**\n` +
      `• Kılıç: ${rakipKilic.ad} (+%${rakipKilic.bonus} Hasar)\n` +
      `• Zindan: \`${rakipBakiye.zindanZafer} Zafer\` | Düello: \`${rakipBakiye.duelloZafer} Galibiyet\` | Cüzdan: \`${rakipBakiye.ryo} Ryo\`\n\n` +
      `🔮 **Kage Analizi:**\n${tahmin}`;
  }

  // =========================================================================
  // 4. KULLANICI RÖNTGENİ: "BENİ TANIYOR MUSUN? / BEN KİMİM?"
  // =========================================================================
  else if (iceriyorMu(metin, BENI_TANIYOR_MUSUN)) {
    duygu = 'zafer';
    baslik = `🕵️‍♂️ İSTİHBARAT RAPORU • ${userName.toUpperCase()}`;
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    const boosterMi = member?.premiumSince ? '⭐ **KALE BOOSTÇUSU (Nitro Destekçisi)**' : 'Klanın Sadık Neferi';
    const envanterOzet = envanter.length > 0 ? envanter.join(', ') : '*Çantan şu an bomboş, zindandan eşya düşür!*';

    aciklama = `Seni tanımaz mıyım **${userName}**? Kage İstihbarat Arşivlerini açtım, işte senin samuray sicilin:\n\n` +
      `🏰 **Kaledeki Kıdemin:** ${katilimMetni} (${boosterMi})\n` +
      `🏷️ **Rütbelerin:** \`${rollerMetni}\`\n` +
      `🥋 **Unvanın:** **${unvan}**\n` +
      (sesDurumu ? `${sesDurumu}\n` : '') +
      `\n⚔️ **Savaş ve Silah Karnen:**\n` +
      `• Kuşanılan Katana: **${kilic.ad}** (+%${kilic.bonus} Hasar Bonusu)\n` +
      `• Zindan Zaferleri: **${zindanZafer} Fetih**\n` +
      `• Düello Sicili: **${duelloZafer} Zafer** / **${duelloMaglubiyet} Mağlubiyet**\n\n` +
      `💰 **Finansal Durumun:**\n` +
      `• Cüzdan: \`${ryo} Ryo\` | Banka: \`${banka} Ryo\` | Maaş Serisi: \`${streak} Gün\`\n\n` +
      `🎒 **Çandaki Eşyalar:**\n${envanterOzet}`;
  }

  // =========================================================================
  // 5. KLAN LİDERLİK SIRALAMASI: "EN ZENGİN KİM?"
  // =========================================================================
  else if (iceriyorMu(metin, EN_ZENGIN_KIM)) {
    duygu = 'para';
    baslik = '👑 KLANIN EN ZENGİN SAMURAYLARI';
    renk = TEMA.RENKLER.BASARI;
    const liderler = liderlikListesi(3);
    const madalyalar = ['🥇', '🥈', '🥉'];

    const siralamaMetni = liderler.map((l, i) => 
      `${madalyalar[i]} **<@${l.userId}>** — \`${l.toplam} Ryo\` *(Unvan: ${l.unvan})*`
    ).join('\n');

    aciklama = `Kage Kalesi Hazine Dairesi kayıtlarına baktım:\n\n` +
      `${siralamaMetni}\n\n` +
      `🪙 **Senin Durumun:** Kesendeki **${ryo} Ryo** ile sıralamayı zorluyorsun **${userName}**! Biraz daha zindan temizlersen zirveye oturursun.`;
  }

  // =========================================================================
  // 6. CANLI SİTEDEN BELİRLİ BİR MANGA ARAMASI (Örn: "kage dxd var mı")
  // =========================================================================
  else if (metin.includes('var mı') || metin.includes('oku') || metin.includes('hakkında')) {
    duygu = 'cay';
    const temizlenen = metin.replace(/kage|var mı|oku|hakkında|bölümleri|mangası/gi, '').trim();
    if (temizlenen.length >= 2) {
      try {
        const sonuclar = await mangaAra(temizlenen);
        if (sonuclar.length > 0) {
          const m = sonuclar[0];
          baslik = `📖 SİTEDEN BULUNDU • ${m.mangaAdi.toUpperCase()}`;
          renk = TEMA.RENKLER.BASARI;
          const kisaOzet = m.aciklama ? m.aciklama.slice(0, 250) + '...' : 'Harika bir seri!';
          aciklama = `Evet! Aradığın **${m.mangaAdi}** serisi resmi sitemiz **[kage95.com](${siteUrl})** kütüphanesinde yayında!\n\n` +
            `🏷️ **Tür:** *${(m.kategoriler || []).join(', ') || 'Genel'}*\n` +
            `✍️ **Yazar:** \`${m.yazar || 'Kage Ekibi'}\` | 👁️ **Okunma:** \`${m.okunmaSayisi || 0}\`\n\n` +
            `📜 **Konu:**\n*"${kisaOzet}"*\n\n` +
            `👉 **[Buraya Tıklayarak Sitede Hemen Oku](${siteUrl}/manga/${m.id})** veya Discord'da \`/manga ${m.mangaAdi}\` yaz!`;
        }
      } catch {}
    }
  }

  // =========================================================================
  // 7. CANLI SİTE ARŞİVİ: "SİTEDE NE VAR?"
  // =========================================================================
  if (!aciklama && iceriyorMu(metin, SITEDE_NE_VAR)) {
    duygu = 'cay';
    baslik = '📖 KAGE95.COM CANLI KÜTÜPHANE VERİSİ';
    renk = TEMA.RENKLER.BILGI;
    try {
      const mangalar = await tumMangalariGetir();
      if (mangalar.length > 0) {
        const sonUc = mangalar.slice(0, 4);
        const listeMetni = sonUc.map((m, i) => 
          `**${i + 1}. [${m.mangaAdi}](${siteUrl}/manga/${m.id})**\n` +
          `🏷️ Tür: *${(m.kategoriler || []).slice(0, 3).join(', ') || 'Genel'}* | 👁️ Okunma: \`${m.okunmaSayisi || 0}\``
        ).join('\n\n');

        aciklama = `Canlı **[kage95.com](${siteUrl})** sunucularına bağlandım! Şu an kütüphanemizde toplam **${mangalar.length} manga serisi** yayında.\n\n` +
          `🔥 **Öne Çıkan & Son Eklenen Seriler:**\n\n${listeMetni}\n\n` +
          `*İstediğin manganın detayını görmek için Discord'da \`/manga <isim>\` yazabilirsin!*`;
      }
    } catch {
      aciklama = `Sitemiz **[kage95.com](${siteUrl})** üzerinden onlarca seriyi okuyabilirsin!`;
    }
  }

  // =========================================================================
  // 8. CANLI VERİDEN KİŞİYE ÖZEL MANGA TAVSİYESİ
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, MANGA_ONERI)) {
    duygu = 'cay';
    baslik = '📚 SENİN İÇİN ÖZEL SEÇİLEN MANGA';
    renk = TEMA.RENKLER.BASARI;
    try {
      const mangalar = await tumMangalariGetir();
      if (mangalar.length > 0) {
        const secilen = mangalar[Math.floor(Math.random() * mangalar.length)];
        const kategoriStr = (secilen.kategoriler || []).join(', ') || 'Aksiyon, Samuray';
        const aciklamaKisa = secilen.aciklama ? secilen.aciklama.slice(0, 220) + '...' : 'Efsanevi sürükleyici bir macera!';

        aciklama = `Senin için kage95.com kütüphanesinden özel bir seri seçtim **${userName}**:\n\n` +
          `📖 **[${secilen.mangaAdi}](${siteUrl}/manga/${secilen.id})**\n` +
          `🏷️ **Tür:** *${kategoriStr}*\n` +
          `✍️ **Yazar/Çizer:** \`${secilen.yazar || 'Kage Ekibi'}\`\n\n` +
          `📜 **Özet:**\n*"${aciklamaKisa}"*\n\n` +
          `👉 **[Buraya Tıklayarak Sitede Hemen Oku](${siteUrl}/manga/${secilen.id})** ya da Discord'da \`/manga ${secilen.mangaAdi}\` yaz!`;
      }
    } catch {}
  }

  // =========================================================================
  // 9. KİŞİYE ÖZEL GÜNLÜK SAMURAY GÖREV ÇİZELGESİ
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, GOREV_BUGUN)) {
    duygu = 'savas';
    baslik = `📜 GÜNLÜK SAMURAY EMRİ • ${userName.toUpperCase()}`;
    renk = TEMA.RENKLER.BASARI;

    aciklama = `Kılıcını kınında paslandırma **${userName}**! Bugün kalede yapman gereken 4 onurlu görev:\n\n` +
      `1. 🪙 **Maaşını Al:** Henüz almadıysan **/gunluk** yazıp Ryo keseni doldur.\n` +
      `2. ⚔️ **Katananı Bile:** **/demirci**'ye git ve kılıcını bir üst kademeye yükseltmek için hedefini koy.\n` +
      `3. 🏰 **Zindan Akını:** **/zindan**'a in, 3 kapıdan birini seç ve iblis avlayıp çantanı ganimetle doldur!\n` +
      `4. 📖 **Zihnini Dinlendir:** Akşam olunca **[kage95.com](${siteUrl})**'a girip yeni bir manga bölümü oku!`;
  }

  // =========================================================================
  // 10. MİNİ OYUNLAR: ZAR, YAZI TURA, BİLMECE
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, MINI_ZAR)) {
    duygu = 'para';
    baslik = '🎲 SAMURAY KEMİK ZARI';
    renk = TEMA.RENKLER.BILGI;
    const zar = Math.floor(Math.random() * 100) + 1;
    const yorum = zar >= 80 ? '🌟 Efsanevi şans! Kılıcın zırh delecek güçte!' : (zar <= 25 ? '💀 Lanetli bir atış... Bugün kumardan uzak dur!' : '⚔️ Dengeli ve sağlam bir atış.');
    aciklama = `Kemik zarlar fildişi tepsiye fırlatıldı ve durdu:\n\n` +
      `╔═══════════════╗\n` +
      `║      **[ ${zar} ]**      ║\n` +
      `╚═══════════════╝\n\n` +
      `*${yorum}*`;
  }
  else if (!aciklama && iceriyorMu(metin, MINI_YAZITURA)) {
    duygu = 'para';
    baslik = '🪙 BOZUK PARA ATIŞI';
    renk = TEMA.RENKLER.BILGI;
    const sonuc = Math.random() < 0.5 ? '🪙 YAZI' : '🪙 TURA';
    aciklama = `Kızıl para başparmağının darbesiyle havaya fırladı, taklalar atarak katananın kabzasına düştü:\n\n` +
      `👉 **${sonuc}**!\n\n` +
      `*Ryo ile gerçek bahis oynamak istersen \`/yazitura [bahis]\` yazabilirsin!*`;
  }
  else if (!aciklama && iceriyorMu(metin, MINI_BILMECE)) {
    duygu = 'dusunce';
    baslik = '🏮 KAGE GÖLGE BİLMECESİ';
    renk = TEMA.RENKLER.BILGI;
    const bilmece = BILMECELER[Math.floor(Math.random() * BILMECELER.length)];
    aciklama = `Zihnini kılıcın kadar keskin tutabilecek misin **${userName}**?\n\n` +
      `❓ **Soru:**\n*"${bilmece.soru}"*\n\n` +
      `||${bilmece.cevap}|| *(Cevabı görmek için kutuya tıkla)*`;
  }

  // =========================================================================
  // 11. ANİME TARTIŞMALARI
  // =========================================================================
  if (!aciklama) {
    for (const debat of ANIME_DEBATELERI) {
      if (debat.anahtar.some(k => metin.includes(k))) {
        duygu = 'savas';
        baslik = '🍿 ANİME DÜELLO TARTIŞMASI';
        renk = TEMA.RENKLER.BILGI;
        aciklama = debat.cevap;
        break;
      }
    }
  }

  // =========================================================================
  // 12. KILIÇ ANALİZİ: "KILIÇLAR / DEMİRCİ / GÜÇLENDİREYİM Mİ?"
  // =========================================================================
  if (!aciklama && iceriyorMu(metin, KILIC_DEMIRCI_DURUM)) {
    duygu = 'savas';
    baslik = '⚔️ DEMİRCİ & KATANA EKSPERTİZ RAPORU';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    const mevcutSeviye = kilic.seviye || 1;
    const sonraki = KILIC_SEVIYELERI.find(k => k.seviye === mevcutSeviye + 1);

    if (!sonraki) {
      aciklama = `👑 **MUHTEŞEM!** Zaten elinde kaledeki en yüksek silah olan **${kilic.ad}** bulunuyor!\n` +
        `Kılıcın savaşlarda ve zindanda sana **+%50 Nihai Hasar Bonusu** sağlıyor. Şogun seviyesindesin!`;
    } else {
      const fark = sonraki.maliyet - ryo;
      const durumMesaji = fark <= 0
        ? `🎉 **MÜJDE!** Kesende tam **${ryo} Ryo** var, yani demirciye verecek paran FAZLASIYLA YETİYOR!\n` +
          `Hemen **/demirci** komutunu yaz ve katananı dövdür!`
        : `⚠️ Bir sonraki seviye için henüz paran yetmiyor. **${fark} Ryo** daha biriktirmelisin!\n` +
          `Para kasmak için hemen **/zindan** fethine çık ya da **/gunluk** maaşını al!`;

      aciklama = `Katananı inceledim **${userName}**:\n\n` +
        `🗡️ **Mevcut Silahın:** **${kilic.ad}** (+%${kilic.bonus} Hasar)\n` +
        `⬆️ **Sıradaki Kademe:** **${sonraki.ad}** (+%${sonraki.bonus} Hasar)\n` +
        `💰 **Demircinin İstediği Ücret:** \`${sonraki.maliyet} Ryo\`\n` +
        `🪙 **Senin Cüzdanın:** \`${ryo} Ryo\`\n\n` +
        `${durumMesaji}`;
    }
  }

  // =========================================================================
  // 13. ZİNDAN SİMÜLASYONU: "ZİNDANA GİREYİM Mİ? / GEÇER MİYİM?"
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, ZINDAN_SIMULASYON)) {
    duygu = 'savas';
    baslik = '🏰 ZİNDAN SEFERİ SİMÜLASYONU & TAKTİKLER';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    const iksirVar = envanter.some(e => e.toLowerCase().includes('iksir'));
    const iksirUyarisi = iksirVar 
      ? '🧪 Çantanda can iksiri var, kritik anlarda hayatını kurtarabilir!' 
      : '⚠️ Çantanda can iksiri YOK! Savaşta acil can basmak için en az 50 Ryo bulundur.';

    aciklama = `Karakterini ve zindan tehlikelerini tarttım **${userName}**:\n\n` +
      `🗡️ **Silah Gücün:** ${kilic.ad} (+%${kilic.bonus})\n` +
      `🏆 **Geçmiş Zaferlerin:** ${zindanZafer} zindan fethi\n` +
      `${iksirUyarisi}\n\n` +
      `🎯 **Derece Tahmini:**\n` +
      `• 🟢 **D & C Rank (Torii Geçidi, Bambu Ormanı):** Bu yaratıkları rahatlıkla devirirsin.\n` +
      `• 🟠 **B-Rank (Harabe Şogun Kalesi):** Oni iblisi çok sert vurur. Canavar sana hamle yaptığında mutlaka **🛡️ Savun/Blok** yap!\n` +
      `• 🔴 **A-Rank (Magma Tapınağı):** Çok riskli! Ama kazanırsan 2000 Ryo kaparsın.\n\n` +
      `⚠️ **Unutma:** Karşına 3 kapı açıldığında **30 saniye** içinde seçmezsen portal çöker ve kesenden 50 Ryo ceza gider!\n` +
      `Hazırsan hemen **/zindan** yaz ve savaşı başlat!`;
  }

  // =========================================================================
  // 14. GÜNLÜK SAMURAY FALI & ŞANS ANALİZİ
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, FAL_SANS)) {
    duygu = 'dusunce';
    baslik = `🔮 GÖLGE ASTROLOJİSİ • ${userName.toUpperCase()} FALI`;
    renk = TEMA.RENKLER.BILGI;
    const { sansYuzde, ruh } = gunlukFalUret(user.id);

    aciklama = `Kadim gölge aynasına baktım ve senin bugünkü yıldız haritanı çıkardım **${userName}**:\n\n` +
      `✨ **Bugünkü Samuray Ruhun:** ${ruh.ad}\n` +
      `📜 *"${ruh.desc}"*\n\n` +
      `📊 **Günün Şans Skoru:** \`%${sansYuzde}\`\n\n` +
      (sansYuzde >= 70
        ? `🔥 **Şans Tavan Yapmış!** Kumarda krupiyeyi batıracak bir el yakalayabilirsin, hemen **/blackjack** veya **/slot** dene!`
        : `🍵 **Temkinli Ol!** Bugün açgözlülük yapma, zindana inerken dikkatli ol ve katananı demircide döv!`);
  }

  // =========================================================================
  // 15. SUNUCU & KLAN BİLGİSİ
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, SUNUCU_DURUMU)) {
    duygu = 'zafer';
    baslik = `🏯 KLAN RAPORU • ${guildName.toUpperCase()} KALESİ`;
    renk = TEMA.RENKLER.BILGI;
    const kanalSayisi = guild?.channels?.cache?.size || 15;
    const boostSayisi = guild?.premiumSubscriptionCount || 0;
    const kurucuEtiket = guild?.ownerId ? `<@${guild.ownerId}>` : 'Jagwey';
    // Yapay zekayla aynı canlı sunucu bilgisi (yeni gelenler, kanallar, roller, stickerlar).
    let ayrinti = '';
    try { if (guild) ayrinti = sunucuOzetiMetni(guild, { ayrintili: true }); } catch { /* özet yoksa sade rapor */ }

    aciklama = `Kaledeki nöbet kulesinden tüm sunucuyu taradım **${userName}**:\n\n` +
      `👥 **Nöbetteki Samuray Sayısı:** **${memberCount} klan üyesi**\n` +
      `🏮 **Kale Odaları & Kanallar:** \`${kanalSayisi} aktif kanal\`\n` +
      `💎 **Klan Gücü (Boost):** \`${boostSayisi} Takviye\`\n` +
      `👑 **Kalenin Yüce Şogun'u:** ${kurucuEtiket}\n\n` +
      (ayrinti ? `${ayrinti}\n\n` : '') +
      `Kalede asayiş berkemal, gölge veziri nöbette ve manga kütüphanemiz 7/24 hizmetinizde!`;
  }

  // =========================================================================
  // 16. DİĞER SABİT TEMATİK NİYETLER
  // =========================================================================
  else if (!aciklama && iceriyorMu(metin, BUSHIDO_FELSEFE)) {
    duygu = 'cay';
    baslik = '⛩️ BUSHIDO • SAMURAYIN KADİM YOLU';
    renk = TEMA.RENKLER.BILGI;
    const ozluSoz = SAMURAY_SOZLERI[Math.floor(Math.random() * SAMURAY_SOZLERI.length)];
    aciklama = `Bir samurayın en büyük savaşı kendi zihnindedir **${userName}**.\n\n${ozluSoz}`;
  }
  else if (!aciklama && iceriyorMu(metin, HAVA_DURUMU)) {
    duygu = 'cay';
    baslik = '🌸 KAGE KALESİ HAVA RAPORU';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Kalenin surlarına çıkıp rüzgarı dinledim **${userName}**:\n\n` +
      `Gökyüzü hafif sisli, rüzgar kiraz çiçeği yapraklarını savuruyor ve hava tam katanayı kınından çıkarmalık 18 derece! Zindana inip iblis avlamak için harika bir an!`;
  }
  else if (!aciklama && iceriyorMu(metin, TROLL_SEVGI)) {
    duygu = 'sevgi';
    baslik = '🌸 SAMURAY AŞKI';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `**${userName}**, kalbimin kını sadece katanama ve kage95 mangalarına aittir! Ama seni klanımızın sadık bir neferi olarak yürekten takdir ediyorum. Gel zindana inelim, duygusallığı bırak!`;
  }
  else if (!aciklama && iceriyorMu(metin, TROLL_ESPRI)) {
    duygu = 'zafer';
    baslik = '🎭 KAGE KOMEDİ KÖŞESİ';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Kılıç ustasına sormuşlar: 'Neden sürekli katananı biliyorsun?'\nUsta cevap vermiş: 'Zamanı kesmek için!' 🗡️\n\n*Kılıç gibi soğuk bir espriydi, gölgelerde üşümeyesin samuray!*`;
  }
  else if (!aciklama && iceriyorMu(metin, RAKIP_BOTLAR)) {
    duygu = 'ofke';
    baslik = '🗑️ ÇÖP BOTLARA GEÇİT YOK';
    renk = TEMA.RENKLER.UYARI_SARI;
    aciklama = `MEE6 veya yabancı tüccar botları mı? Onları Kage Kalesi'nin kapısından içeri bile sokmuyoruz! Biz yerli, katanalı, RPG zindanlı ve yapay zeka destekli tek başımıza koca bir orduyuz!`;
  }
  else if (!aciklama && iceriyorMu(metin, KUFUR_HAKARET) && (!argoModuMu(user.id) || saygiIhlaliVarMi(mesajMetni))) {
    duygu = 'ofke';
    baslik = '🥋 TERBİYE VE ONUR DERSİ';
    renk = TEMA.RENKLER.UYARI_SARI;
    aciklama = `Sakin ol **${userName}**! Bir samurayın dili, kılıcından önce terbiye edilmelidir. Kaba sözler katananı köreltir, ruhunu lekeleme. Saygını koru ve kılıcını kınına sok.`;
  }
  else if (!aciklama && iceriyorMu(metin, OVGU)) {
    duygu = 'sevgi';
    baslik = '🥋 ONUR DUYDUM!';
    renk = TEMA.RENKLER.BASARI;
    aciklama = `Eyvallah **${userName}**, onur duydum kılıç kardeşim! Kage klanı her zaman arkanda. Katanan asla körelmesin!`;
  }
  else if (!aciklama && iceriyorMu(metin, YARDIM)) {
    duygu = 'cay';
    baslik = '📜 KAGE YARDIM PARŞÖMENİ';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Tüm sistemlerimi, RPG komutlarımı, manga kütüphanesini ve moderasyon araçlarını görmek için **/yardim** yazman yeterli!`;
  }
  else if (!aciklama && iceriyorMu(metin, HAL_HATIR)) {
    duygu = 'cay';
    aciklama = `🗡️ İyiyim çok şükür **${userName}**! Katanayı biledim, yeşil çayımı yudumluyorum, sen nasılsın?\n\n` +
      `**${guildName}** semalarında hava sakin, zindanlar ise kan ağlıyor! Kesende **${ryo} Ryo** ve elinde **${kilic.ad}** görüyorum.\n` +
      `Bugün zindana inip birkaç iblis kellesi uçurdun mu bakalım?`;
  }
  else if (!aciklama && iceriyorMu(metin, KULLANICI_IYI)) {
    duygu = 'zafer';
    aciklama = isFemale
      ? `🌸 Harika haber tatlı kunoichi **${userName}**! Kılıcın gibi enerjin de pırıl pırıl parlıyor.\n\n` +
        `Bu yüksek moralle **/zindan**'a girsen iblislere tek atarsın! Ya da **/blackjack** masasına oturup krupiyeyi terletmeye ne dersin? ✨`
      : `🔥 Harika haber **${userName}**! Kılıcın gibi enerjin de pırıl pırıl parlıyor.\n\n` +
        `Bu yüksek moralle **/zindan**'a girsen iblislere tek atarsın! Ya da **/blackjack** masasına oturup krupiyeyi terletmeye ne dersin?`;
  }
  else if (!aciklama && iceriyorMu(metin, KULLANICI_KOTU)) {
    duygu = 'cay';
    aciklama = isFemale
      ? `🍵 Ah be zarif kunoichi **${userName}**... Bazen en sert fırtınalar bile diner, geriye sadece kökleri sağlam kiraz ağaçları kalır. 🌸\n\n` +
        `Kılıcını bir kenara bırak, derin bir nefes al ve **[kage95.com](${siteUrl})** kütüphanemizden kafa dağıtacak güzel bir manga oku.\n` +
        `Moralini sakın bozma, Kage Klanı ve gölge kardeşlerin her zaman seninle!`
      : `🍵 Ah be samuray **${userName}**... Bazen en sert fırtınalar bile diner, geriye sadece kökleri sağlam ağaçlar kalır.\n\n` +
        `Kılıcını bir kenara bırak, derin bir nefes al ve **[kage95.com](${siteUrl})** kütüphanemizden kafa dağıtacak güzel bir manga oku.\n` +
        `Moralini bozma, Kage klanı her zaman seninle!`;
  }
  else if (!aciklama && iceriyorMu(metin, SELAMLAR)) {
    duygu = 'cay';
    aciklama = isFemale
      ? `🌸 Selamlar zarif kunoichi **${userName}**! **${guildName}** kalesine hoş geldin. ⛩️\n\n` +
        `Kılıcın keskin, bahtın açık olsun. Zindan seferi, manga arama veya kumarcı köşesi için hazırım!`
      : `⛩️ Selamlar samuray **${userName}**! **${guildName}** kalesine hoş geldin.\n\n` +
        `Kılıcın keskin, bahtın açık olsun. Zindan seferi, manga arama veya kumarcı köşesi için hazırım!`;
  }
  else if (!aciklama && iceriyorMu(metin, KIMLIK)) {
    duygu = 'zafer';
    aciklama = isFemale
      ? `🏮 Ben **Kage-95** (ve bu kalenin gölge kunoichi muhafızı)!\n\n` +
        `**[kage95.com](${siteUrl})** manga platformunun resmi gölge bekçisi, samuray rehberi ve topluluk asistanıyım.\n` +
        `Sunucuda manga arar, zindan savaşlarını yönetir, kumar masalarını kurar ve seni korurum zarif savaşçı! 🌸`
      : `🏮 Ben **Kage-95**!\n\n` +
        `**[kage95.com](${siteUrl})** manga platformunun resmi gölge bekçisi, samuray rehberi ve topluluk asistanıyım.\n` +
        `Sunucuda manga arar, zindan savaşlarını yönetir, kumar masalarını kurar ve klan üyelerini korurum!`;
  }
  else if (!aciklama && (!metin || metin === 'kage')) {
    duygu = 'cay';
    aciklama = isFemale
      ? `Selam tatlı **${userName}**! Buyur zarif kunoichim, beni mi çağırdın? 🌸\n\n` +
        `Şu an **${guildName}** kalesinde ${memberCount} samurayla birlikte nöbetteyim. Kesende **${ryo} Ryo** bulunuyor.\n` +
        `Bana merak ettiğin bir şeyi sorabilir veya **/yardim** yazarak tüm komutlarımı görebilirsin!`
      : `Selam **${userName}**! Buyur kılıç kardeşim, beni mi çağırdın?\n\n` +
        `Şu an **${guildName}** kalesinde ${memberCount} samurayla birlikte nöbetteyim. Kesende **${ryo} Ryo** bulunuyor.\n` +
        `Bana merak ettiğin bir şeyi sorabilir veya **/yardim** yazarak tüm komutlarımı görebilirsin!`;
  }

  // =========================================================================
  // 17. DOĞRUDAN HAFIZAYA KAYDETME TALEBİ ("Kage bunu aklında tut / unutma")
  // =========================================================================
  else if (!aciklama && (metin.includes('aklında tut') || metin.includes('unutma') || metin.includes('hafızana yaz') || metin.includes('bunu kaydet'))) {
    const notIcerik = mesajMetni.replace(/kage|aklında tut|unutma|hafızana yaz|bunu kaydet|lütfen|şunu|bunu/gi, '').trim();
    if (notIcerik.length > 3) {
      kullaniciNotuEkle(user.id, userName, notIcerik);
      duygu = 'zafer';
      baslik = isFemale ? '🧠 KUNOICHI HAFIZASI • KALBİME KAZINDI' : '🧠 KAGE HAFIZASI • AKLIMDA TUTTUM';
      renk = TEMA.RENKLER.BASARI;
      aciklama = `Bunu derin hafıza bankama (\`data/kage_hafiza.json\`) kalıcı olarak kaydettim **${userName}**!\n\n` +
        `📝 **Kayıt:** *"${notIcerik}"*\n\n` +
        `*Artık bana ne zaman sorsan veya kalede sohbet etsek bunu asla unutmayacağım!*`;
    }
  }

  // =========================================================================
  // 18. AÇIK UÇLU YAPAY ZEKA KATMANI (GEMINI PERSONA FALLBACK!)
  // =========================================================================
  if (!aciklama && metin.length > 3) {
    try {
      const aiCevap = await geminiPersonaSohbet(mesajMetni, {
        guildId: guild?.id ?? null,
        userId: user.id,
        userName,
        katilimMetni,
        kilicAd: kilic.ad,
        ryo
      });

      if (aiCevap) {
        duygu = 'dusunce';
        baslik = isFemale ? '🌸 GÖLGE BİLGELİĞİ • Kunoichi Kage' : '⛩️ GÖLGE BİLGELİĞİ • Kage-95';
        renk = isFemale ? 0xFF66B2 : TEMA.RENKLER.BILGI;
        aciklama = aiCevap;
      }
    } catch {}
  }

  // Nihai Fallback
  if (!aciklama) {
    duygu = 'cay';
    const soz = SAMURAY_SOZLERI[Math.floor(Math.random() * SAMURAY_SOZLERI.length)];
    aciklama = isFemale
      ? `${soz}\n\n` +
        `*${userName}, elindeki **${kilic.ad}** ve cüzdanındaki **${ryo} Ryo** ile Kage Kalesi'nin en zarif kunoichisisin. Bana soru sorabilir veya \`/yardim\` yazabilirsin! 🌸*`
      : `${soz}\n\n` +
        `*${userName}, elindeki **${kilic.ad}** ve cüzdanındaki **${ryo} Ryo** ile Kage Kalesi'nde yolunu bulabilirsin. Bana soru sorabilir veya \`/yardim\` yazabilirsin.*`;
  }

  const embed = kageEmbed({
    baslik,
    renk,
    aciklama,
    footer: `Kage-95 Canlı İstihbarat & Chat Bot • ${guildName}`
  });

  // =========================================================================
  // PİKSEL STİCKER ENTEGRASYONU (O ANKİ RUH HALİNE VE CİNSİYETE GÖRE)
  // =========================================================================
  const stickerHaritasi = isFemale ? STICKER_DOSYALARI_KUNOICHI : STICKER_DOSYALARI_ERKEK;
  const stickerDosyaAdi = isFemale ? 'kunoichi_sticker.png' : 'kage_sticker.png';
  const ogretilenDuygu = stickerKurali(guild?.id ?? null, user.id, mesajMetni);
  // Ogretilen sticker her zaman onde; yoksa kullanicinin hissettigi duygu, o da yoksa kural dalinin duygusu.
  const algilananDuygu = duyguTespit(mesajMetni);
  const stickerPath = stickerHaritasi[ogretilenDuygu]
    || (algilananDuygu.yogunluk >= 2 && stickerHaritasi[algilananDuygu.sticker])
    || stickerHaritasi[duygu] || stickerHaritasi.cay;
  const files = [];

  if (fs.existsSync(stickerPath)) {
    const attachment = new AttachmentBuilder(stickerPath, { name: stickerDosyaAdi });
    files.push(attachment);

    const attRef = `attachment://${stickerDosyaAdi}`;
    if (stickerTamBoy) {
      embed.setImage(attRef);
    } else {
      embed.setThumbnail(attRef);
    }
  }

  return { embed, files };
}
