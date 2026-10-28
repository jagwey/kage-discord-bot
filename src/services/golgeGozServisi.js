import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { kullaniciNotuEkle, profilGuncelle, bilgiOgren, hafizaKaydet } from './kageHafizaServisi.js';
import { akilliAiUret, motorEtiketi, AI_TOPLAM_BUTCE_MS } from './aiRouterServisi.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';
import { yasakliBul, otomodAyarGetir, yetkiliMi } from './otomodServisi.js';
import { sahipNotuKaydet } from './toplulukServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const GOZ_DOSYASI = path.join(DATA_DIR, 'golge_goz_istatistik.json');

const VARSAYILAN_GOZ = {
  toplamIncelenenMesaj: 0,
  ogrenilenBilgiSayisi: 0,
  onlenenIhlalSayisi: 0,
  sonTaramaZamani: null,
  sonOgrenilenler: [],
  sonIhlaller: []
};

// Sunucu başına Gölge Göz ayarları (/golge-goz ayar ile değişir).
export const VARSAYILAN_AYAR = {
  acik: true,
  uyari: true,            // küfür edene kanalda anında uyarı
  yetkilileriUyar: true,  // yönetici ve sunucu sahibi de uyarılır
  hakimModu: true,        // kavga çıkınca Yargıç Kage devreye girer
  yetkiliRolId: null,     // kavgada etiketlenecek mod rolü; yoksa sunucu sahibi etiketlenir
  sahibeBildir: true,     // sahipten bahsedilince ya da işine yarar bilgi geçince sahip etiketlenir
  haftalikRapor: true,    // pazar akşamı sahibe haftalık özet DM'i
  kayitHatirlat: true,    // 24 saattir kayıt olmayana nazik DM
  tanistir: true          // yeni kayıt olanı aynı türleri seven eski üyeyle tanıştır
};

const SAHIP_ANMA_ARALIK_MS = 5 * 60 * 1000; // aynı sunucuda "senden bahsedildi" en sık bu aralıkla
const SAHIP_GENEL_KELIMELER = ['jagwey', 'kurucu', 'owner'];
const sahipAnmaZamani = new Map();

const KUFUR_PENCERE_MS = 10 * 60 * 1000;   // tekrar eden küfür bu sürede sayılır
const UYARI_ARALIK_MS = 20 * 1000;         // aynı kişiye iki uyarı arası en az bu kadar
const GERILIM_PENCERE_MS = 3 * 60 * 1000;  // kavga puanı bu süre içindeki mesajlardan hesaplanır
const ANALIZ_ARALIK_MS = 2 * 60 * 1000;    // aynı kanal için iki yapay zeka analizi arası
const GERILIM_ESIGI = 7;
const DAVA_SURESI_MS = 2 * 60 * 1000;
const DAVA_SON_SOZ_MS = 15 * 1000;         // herkes konuştuktan sonra ek mesaj için beklenen süre

let gozVerisi = null;
let kayitZamanlayici = null;
const mesajHavuzu = [];
let taramaSuruyor = false;

// Kanal başına son mesajlar ve gerilim puanları (yalnızca bellekte).
const kanallar = new Map();
// `${guildId}:${userId}` -> küfür zamanları ve son uyarı zamanı
const kufurGecmisi = new Map();
// kanalId -> açık Yargıç davası
const davalar = new Map();

function gozYukle() {
  if (gozVerisi) return gozVerisi;
  try {
    if (fs.existsSync(GOZ_DOSYASI)) {
      gozVerisi = { ...VARSAYILAN_GOZ, sunucular: {}, ...JSON.parse(fs.readFileSync(GOZ_DOSYASI, 'utf8')) };
      return gozVerisi;
    }
  } catch {}
  gozVerisi = { ...VARSAYILAN_GOZ, sunucular: {}, sonOgrenilenler: [], sonIhlaller: [] };
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

// Her mesajda diske yazmamak için kayıtlar 5 sn içinde toplanıp tek seferde yazılır.
function kaydetPlanla() {
  if (kayitZamanlayici) return;
  kayitZamanlayici = setTimeout(() => {
    kayitZamanlayici = null;
    gozKaydet();
  }, 5000);
}

export function golgeGozDurumu() {
  return gozYukle();
}

export function golgeGozAyarGetir(guildId) {
  return { ...VARSAYILAN_AYAR, ...(gozYukle().sunucular?.[guildId] || {}) };
}

export function golgeGozAyarGuncelle(guildId, degisim) {
  const v = gozYukle();
  v.sunucular ??= {};
  v.sunucular[guildId] = { ...golgeGozAyarGetir(guildId), ...degisim };
  gozKaydet();
  return v.sunucular[guildId];
}

export function aktifDavalar() {
  return [...davalar.entries()].map(([kanalId, d]) => ({ kanalId, taraflar: d.taraflar.map(t => t.ad) }));
}

// Reklam ve davet linki regex'i
const REKLAM_LINK_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9]+/i;

// Kavga sezgisi için sert söz ve tehdit kökleri (Türkçe karakterleri sadeleştirilmiş metinde aranır).
const SERT_TAM = new Set(['lan', 'ulan', 'mal', 'defol', 'ezik', 'salak', 'aptal', 'bok', 'dangalak', 'hiyar', 'okuz', 'esek', 'gerzek', 'sus']);
const SERT_KOK = ['gerizekal', 'salakl', 'aptall', 'haysiyetsiz', 'karaktersiz', 'yavsak', 'kesyesini', 'beyinsiz', 'zavalli', 'soytari'];
const TEHDIT_KOK = ['oldururum', 'olduruyum', 'doverim', 'doverim', 'gebertir', 'kafanikir', 'agzinikir', 'bulurumseni', 'adresinibul', 'evinibil'];

const UYARI_SOZLERI = [
  'ağzını topla, burada küfür yok.',
  'dilini tut. gölgeler her şeyi duyar.',
  'bu dil bu kalede geçmez, bir daha olmasın.',
  'kelimelerini seç samuray, küfre yer yok.',
  'küfür yasak. uyarıyorum.'
];

function sadelestir(metin = '') {
  return String(metin).toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

function rastgele(dizi) {
  return dizi[Math.floor(Math.random() * dizi.length)];
}

function ihlalKaydet(message, tip) {
  const v = gozYukle();
  v.onlenenIhlalSayisi += 1;
  v.sonIhlaller.unshift({
    kullanici: message.author.tag,
    kullaniciId: message.author.id,
    kanal: message.channel.name,
    tip,
    zaman: new Date().toISOString()
  });
  if (v.sonIhlaller.length > 20) v.sonIhlaller.length = 20;
  kaydetPlanla();
}

/** Kavgada çağrılacak yetkilinin etiketi ve mention izni. */
function yetkiliEtiketi(guild, ayar) {
  if (ayar.yetkiliRolId && guild.roles.cache.has(ayar.yetkiliRolId)) {
    return { metin: `<@&${ayar.yetkiliRolId}>`, izin: { roles: [ayar.yetkiliRolId] } };
  }
  return { metin: `<@${guild.ownerId}>`, izin: { users: [guild.ownerId] } };
}

function kanalDurumu(kanalId) {
  let k = kanallar.get(kanalId);
  if (!k) {
    k = { mesajlar: [], gerilim: [], sonAnaliz: 0, analizSuruyor: false };
    kanallar.set(kanalId, k);
  }
  return k;
}

/** Mesajın kime yöneldiğini bulur: cevaplanan ya da etiketlenen ilk insan üye. */
function hedefBul(message) {
  const yanitlanan = message.mentions?.repliedUser;
  if (yanitlanan && !yanitlanan.bot && yanitlanan.id !== message.author.id) return yanitlanan;
  return message.mentions?.users?.find(u => !u.bot && u.id !== message.author.id) || null;
}

/** Tek mesajın kavga puanı: küfür, sert söz, tehdit, büyük harfle bağırma. */
function gerilimPuani(metin, kufur, hedef) {
  const duz = sadelestir(metin);
  const kelimeler = duz.split(/[^a-z]+/).filter(Boolean);
  const bitisik = kelimeler.join('');
  let puan = kufur ? 3 : 0;
  let sert = 0;
  for (const k of kelimeler) {
    if (SERT_TAM.has(k) || SERT_KOK.some(x => k.startsWith(x))) sert++;
  }
  puan += Math.min(sert, 2) * 2;
  const tehdit = TEHDIT_KOK.some(x => bitisik.includes(x));
  if (tehdit) puan += 4;

  const harf = (metin.match(/[a-zA-ZğüşıöçĞÜŞİÖÇ]/g) || []).length;
  const buyuk = (metin.match(/[A-ZĞÜŞİÖÇ]/g) || []).length;
  if (harf >= 10 && buyuk / harf > 0.7) puan += 1;
  if (puan > 0 && hedef) puan += 1;
  return { puan, tehdit };
}

/**
 * Gelen her mesajı anında süzer: küfür uyarısı, reklam, kavga sezgisi,
 * açık Yargıç davasına ifade toplama ve öğrenme havuzu.
 * @param {import('discord.js').Message} message
 */
export async function golgeGozMesajIsle(message) {
  if (!message || message.author?.bot || !message.guild) return;
  const ayar = golgeGozAyarGetir(message.guild.id);
  if (!ayar.acik) return;

  const v = gozYukle();
  v.toplamIncelenenMesaj += 1;
  kaydetPlanla();

  const metin = (message.content || '').trim();
  if (!metin) return;

  const yetkili = yetkiliMi(message.member, message.guild);
  const otomod = otomodAyarGetir(message.guild.id);
  const kufur = yasakliBul(metin, otomod.ozelKelimeler);
  const hedef = hedefBul(message);

  // Kanalın son mesajları: kavga analizi ve Yargıç kararı için bağlam.
  const kanal = kanalDurumu(message.channel.id);
  kanal.mesajlar.push({
    userId: message.author.id,
    ad: message.member?.displayName || message.author.username,
    hedefAd: hedef ? (message.guild.members.cache.get(hedef.id)?.displayName || hedef.username) : null,
    hedefId: hedef?.id || null,
    metin: metin.slice(0, 220),
    zaman: Date.now()
  });
  if (kanal.mesajlar.length > 20) kanal.mesajlar.shift();

  // 1. Reklam / davet linki: yetkili olmayanlar için admin kanalına bildirim
  if (REKLAM_LINK_REGEX.test(metin) && !yetkili) {
    ihlalKaydet(message, 'İzinsiz Discord Davet Linki');
    adminIhlalBildir(message, 'İzinsiz Discord Davet Linki', metin);
  }

  // 2. Küfür: kanalda anında uyarı. Otomod açıksa ve kişi yetkili değilse
  // mesajı otomod siler ve uyarır, burada ikinci uyarı gönderilmez.
  if (kufur) {
    ihlalKaydet(message, 'Küfür / Hakaret');
    if (!yetkili) adminIhlalBildir(message, 'Küfür / Hakaret', metin);
    const otomodHalleder = otomod.acik && !yetkili;
    if (ayar.uyari && !otomodHalleder && (!yetkili || ayar.yetkilileriUyar)) {
      kufurUyar(message, ayar, yetkili).catch(() => null);
    }
  }

  // 3. Açık Yargıç davası varsa tarafların ifadesi toplanır
  const dava = davalar.get(message.channel.id);
  if (dava) davaIfadesiAl(dava, message, metin);

  // 4. Kavga sezgisi: puan eşiği aşılırsa yapay zeka kanalı inceler
  const { puan, tehdit } = gerilimPuani(metin, kufur, hedef);
  if (puan > 0) {
    kanal.gerilim.push({ userId: message.author.id, hedefId: hedef?.id || null, puan, zaman: Date.now() });
  }
  const simdi = Date.now();
  kanal.gerilim = kanal.gerilim.filter(g => simdi - g.zaman < GERILIM_PENCERE_MS);
  const toplam = kanal.gerilim.reduce((t, g) => t + g.puan, 0);
  const kisiler = new Set(kanal.gerilim.flatMap(g => [g.userId, g.hedefId]).filter(Boolean));
  const kavgaKokusu = tehdit || (toplam >= GERILIM_ESIGI && kisiler.size >= 2);
  if (kavgaKokusu && !dava && !kanal.analizSuruyor && simdi - kanal.sonAnaliz > ANALIZ_ARALIK_MS) {
    kavgaAnalizEt(message.channel, ayar).catch(err => console.warn('[GolgeGoz] Kavga analizi:', err.message));
  }

  // 5. Sunucu sahibinden bahsediliyorsa sahibe haber verilir
  if (ayar.sahibeBildir) sahipAnildiMi(message, metin);

  // 6. Bilgi taşıyan mesajlar öğrenme havuzuna (kısa selamlar API'ye gitmez)
  if (!kufur && metin.length >= 15 && !metin.startsWith('/') && !metin.startsWith('!')) {
    mesajHavuzu.push({
      guildId: message.guild.id,
      userId: message.author.id,
      userName: message.member?.displayName || message.author.username,
      kanal: message.channel.name,
      metin: metin.slice(0, 300),
      tarih: Date.now()
    });
    if (mesajHavuzu.length > 50) mesajHavuzu.shift();
    if (mesajHavuzu.length >= 8 && !taramaSuruyor) {
      setImmediate(() => golgeGozTopluAnaliz(message.client).catch(() => null));
    }
  }
}

/** Küfür edene kısa uyarı; 10 dk içinde 3. küfürde yetkili çağrılır. */
async function kufurUyar(message, ayar, yetkili) {
  const anahtar = `${message.guild.id}:${message.author.id}`;
  const simdi = Date.now();
  const kayit = kufurGecmisi.get(anahtar) || { zamanlar: [], sonUyari: 0 };
  kayit.zamanlar = kayit.zamanlar.filter(z => simdi - z < KUFUR_PENCERE_MS);
  kayit.zamanlar.push(simdi);
  kufurGecmisi.set(anahtar, kayit);
  if (simdi - kayit.sonUyari < UYARI_ARALIK_MS) return;
  kayit.sonUyari = simdi;

  const kacinci = kayit.zamanlar.length;
  let metin = `${message.author} ${rastgele(UYARI_SOZLERI)}`;
  const izin = { users: [message.author.id], roles: [] };
  if (kacinci >= 3 && !yetkili) {
    const etiket = yetkiliEtiketi(message.guild, ayar);
    metin += `\n${etiket.metin} ${kacinci}. küfrü, bakar mısınız`;
    if (etiket.izin.users) izin.users.push(...etiket.izin.users);
    if (etiket.izin.roles) izin.roles.push(...etiket.izin.roles);
  } else if (kacinci >= 2) {
    metin += ` (${kacinci}. uyarı)`;
  }

  await message.channel.send({ content: `${metin}\n-# Gölge Göz`, allowedMentions: izin });
}

/** Admin kanalına ihlal bildirimi. */
function adminIhlalBildir(message, ihlalTipi, icerik) {
  try {
    const ayarlar = sunucuAyarGetir(message.guild.id);
    const hedefKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;
    if (!hedefKanalId) return;
    const adminKanal = message.guild.channels.cache.get(hedefKanalId);
    if (adminKanal?.isTextBased()) {
      adminKanal.send({
        content: `👁️ ${message.author} • <#${message.channel.id}> • ${ihlalTipi}\n||${icerik.slice(0, 150)}||`,
        allowedMentions: { parse: [] }
      }).catch(() => null);
    }
  } catch (err) {
    console.warn('[GolgeGoz AdminLog]', err.message);
  }
}

function adminKanalaYaz(guild, icerik) {
  const hedefKanalId = sunucuAyarGetir(guild.id).aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;
  const adminKanal = hedefKanalId && guild.channels.cache.get(hedefKanalId);
  if (adminKanal?.isTextBased()) adminKanal.send({ content: icerik, allowedMentions: { parse: [] } }).catch(() => null);
}

/**
 * Sunucu sahibinin bilmesi gereken bir şeyi admin AI kanalına sahibi etiketleyerek yazar.
 * Admin kanalı yoksa sahibe DM atılır. /golge-goz ayar sahibe-bildir ile kapatılabilir.
 * @param {import('discord.js').Guild} guild
 * @param {string} metin
 * @returns {Promise<boolean>} bildirim gitti mi
 */
export async function sahibeBildir(guild, metin) {
  if (!guild?.ownerId || !golgeGozAyarGetir(guild.id).sahibeBildir) return false;
  sahipNotuKaydet(guild.id, metin);
  const icerik = `<@${guild.ownerId}> ${metin}`.slice(0, 1900) + '\n-# Gölge Göz';
  const hedefKanalId = sunucuAyarGetir(guild.id).aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;
  const adminKanal = hedefKanalId && guild.channels.cache.get(hedefKanalId);
  if (adminKanal?.isTextBased()) {
    const gitti = await adminKanal.send({ content: icerik, allowedMentions: { users: [guild.ownerId] } }).catch(() => null);
    if (gitti) return true;
  }
  const sahip = await guild.fetchOwner().catch(() => null);
  const dm = await sahip?.send({ content: `${guild.name} • ${metin}`.slice(0, 1900) + '\n-# Gölge Göz' }).catch(() => null);
  return !!dm;
}

/** Sahibin adı, "kurucu", "owner" gibi bir anma geçiyorsa (ve sahip zaten etiketlenmemişse) haber verir. */
function sahipAnildiMi(message, metin) {
  const guild = message.guild;
  if (message.author.id === guild.ownerId || message.mentions?.users?.has(guild.ownerId)) return;
  if (message.mentions?.repliedUser?.id === guild.ownerId) return;

  const sahip = guild.members.cache.get(guild.ownerId);
  const adlar = [sahip?.user?.username, sahip?.displayName, sahip?.user?.globalName]
    .map(a => sadelestir(a || '').replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/)[0])
    .filter(a => a && a.length >= 3 && a !== 'kage');
  const aranan = [...new Set([...adlar, ...SAHIP_GENEL_KELIMELER])];

  const duz = sadelestir(metin);
  const kelimeler = duz.split(/[^a-z0-9]+/).filter(Boolean);
  const anildi = kelimeler.some(k => aranan.some(a => k === a || (a.length >= 5 && k.startsWith(a))))
    || duz.includes('sunucu sahibi') || duz.includes('sunucunun sahibi');
  if (!anildi) return;

  const simdi = Date.now();
  if (simdi - (sahipAnmaZamani.get(guild.id) || 0) < SAHIP_ANMA_ARALIK_MS) return;
  sahipAnmaZamani.set(guild.id, simdi);

  const yazan = message.member?.displayName || message.author.username;
  sahibeBildir(guild, `senden bahsedildi • <#${message.channel.id}> • ${yazan}\n> ${metin.slice(0, 300).replace(/\n/g, '\n> ')}\n${message.url}`)
    .catch(() => null);
}

function sohbetDokumu(kanalId, adet = 15) {
  return kanalDurumu(kanalId).mesajlar.slice(-adet)
    .map(m => `${m.ad} (id:${m.userId})${m.hedefAd ? ` → ${m.hedefAd}` : ''}: ${m.metin}`)
    .join('\n');
}

function jsonCoz(metin) {
  const parca = String(metin || '').match(/\{[\s\S]*\}/);
  if (!parca) return null;
  try { return JSON.parse(parca[0]); } catch { return null; }
}

const ANALIZ_WATCHDOG_MS = AI_TOPLAM_BUTCE_MS + 5_000;

/**
 * Gerilim eşiği aşılan kanalı yapay zekaya okutur: şaka mı kavga mı?
 * Hafif gerginlikte sakinleştirir, gerçek kavgada yetkiliyi çağırır ve Yargıç modunu açar.
 */
async function kavgaAnalizEt(kanal, ayar) {
  const durum = kanalDurumu(kanal.id);
  const nesil = (durum.analizNesil || 0) + 1;
  durum.analizNesil = nesil;
  durum.analizSuruyor = true;
  durum.sonAnaliz = Date.now();
  // Toplam AI bütçesi + pay: takılan çağrı bayrağı sonsuza dek kilitlemesin.
  const watchdog = setTimeout(() => {
    if (durum.analizNesil !== nesil || !durum.analizSuruyor) return;
    durum.analizSuruyor = false;
    console.warn(`[GolgeGoz] analizSuruyor zaman aşımıyla temizlendi (${ANALIZ_WATCHDOG_MS}ms, kanal=${kanal.id}).`);
  }, ANALIZ_WATCHDOG_MS);
  try {
    const { metin, saglayici } = await akilliAiUret({
      system: 'Şu an Gölge Göz olarak bir Discord kanalındaki gerilimi değerlendiriyorsun. Sadece JSON döndür, başka hiçbir şey yazma.',
      prompt: `Kanaldaki son mesajlar:\n${sohbetDokumu(kanal.id)}\n\n` +
        'Bunu değerlendir ve şu JSON\'u döndür:\n' +
        '{"seviye":0,"taraflar":["kullanıcı id"],"ozet":"tek cümle ne oluyor","mesaj":"kanala yazılacak 1-2 kısa cümle"}\n' +
        'seviye: 0 = şaka, arkadaşça atışma veya kavga yok; 1 = hafif gerginlik; 2 = gerçek kavga, karşılıklı hakaret; 3 = tehdit, nefret söylemi veya ağır taciz.\n' +
        'Arkadaşlar arası şakalaşma ve tek başına küfür kavga sayılmaz. taraflar sadece kavgaya karışanların id\'leri.\n' +
        'mesaj: Kage ağzından, sakin, kısa, düz yazı. Kimsenin ailesine, dinine, diline, ırkına laf etme.',
      gorevTipi: 'hizli_sohbet',
      userId: 'golge_goz_sistemi',
      userName: 'Gölge Gözü'
    });

    const sonuc = jsonCoz(metin);
    const seviye = Number(sonuc?.seviye) || 0;
    if (!sonuc || seviye <= 0) return;

    const bilinen = new Map(durum.mesajlar.map(m => [m.userId, m.ad]));
    const taraflar = [...new Set((sonuc.taraflar || []).map(String))]
      .filter(id => bilinen.has(id))
      .map(id => ({ id, ad: bilinen.get(id) }));
    const ozet = String(sonuc.ozet || '').slice(0, 300);
    const motor = motorEtiketi(saglayici);

    adminKanalaYaz(kanal.guild, `👁️ <#${kanal.id}> gerilim seviye ${seviye}: ${ozet}`);

    if (seviye >= 2 && ayar.hakimModu && taraflar.length >= 2) {
      await hakimDavasiBaslat(kanal, taraflar, { ozet, yetkiliCagir: seviye >= 3 });
      return;
    }

    const satirlar = [String(sonuc.mesaj || 'sakin olun, burada kavga yok.').slice(0, 400)];
    const izin = { users: [], roles: [] };
    if (seviye >= 2) {
      const etiket = yetkiliEtiketi(kanal.guild, ayar);
      satirlar.push(`${etiket.metin} burada kavga var, bakar mısınız`);
      if (etiket.izin.users) izin.users.push(...etiket.izin.users);
      if (etiket.izin.roles) izin.roles.push(...etiket.izin.roles);
    }
    await kanal.send({ content: `${satirlar.join('\n')}\n-# Gölge Göz • ${motor}`, allowedMentions: izin });
    durum.gerilim = [];
  } finally {
    clearTimeout(watchdog);
    if (durum.analizNesil === nesil) durum.analizSuruyor = false;
  }
}

/**
 * Yargıç Kage davası açar: tarafları çağırır, ifadelerini toplar ve
 * süre dolunca ya da herkes konuşunca yapay zekayla tarafsız karar verir.
 * @param {import('discord.js').TextChannel} kanal
 * @param {{id: string, ad: string}[]} taraflar
 * @param {{ozet?: string, baslatan?: string, yetkiliCagir?: boolean}} [secenekler]
 * @returns {Promise<boolean>} Dava açıldıysa true.
 */
export async function hakimDavasiBaslat(kanal, taraflar, { ozet = '', baslatan = null, yetkiliCagir = false } = {}) {
  if (davalar.has(kanal.id)) return false;
  const benzersiz = [...new Map(taraflar.map(t => [t.id, t])).values()].slice(0, 4);
  if (benzersiz.length < 2) return false;

  const dava = {
    kanal,
    taraflar: benzersiz,
    ifadeler: new Map(benzersiz.map(t => [t.id, []])),
    ozet,
    baslatan,
    zamanlayici: null,
    sonSozBekleniyor: false
  };
  davalar.set(kanal.id, dava);
  dava.zamanlayici = setTimeout(() => davaKarari(kanal.id).catch(() => null), DAVA_SURESI_MS);

  const etiketler = benzersiz.map(t => `<@${t.id}>`).join(' ');
  const izin = { users: benzersiz.map(t => t.id), roles: [] };
  const satirlar = [
    '⚖️ Yargıç Kage devrede.',
    `${etiketler} derdinizi tek mesajda anlatın, 2 dakikanız var. Bu sürede birbirinize laf atmayın.`
  ];
  if (yetkiliCagir) {
    const etiket = yetkiliEtiketi(kanal.guild, golgeGozAyarGetir(kanal.guild.id));
    satirlar.push(`${etiket.metin} durum ciddi, haberiniz olsun`);
    if (etiket.izin.users) izin.users.push(...etiket.izin.users);
    if (etiket.izin.roles) izin.roles.push(...etiket.izin.roles);
  }
  await kanal.send({ content: `${satirlar.join('\n')}\n-# Hakim modu`, allowedMentions: izin }).catch(() => null);
  kanalDurumu(kanal.id).gerilim = [];
  return true;
}

function davaIfadesiAl(dava, message, metin) {
  const liste = dava.ifadeler.get(message.author.id);
  if (!liste || liste.length >= 3) return;
  liste.push(metin.slice(0, 600));

  // Herkes konuştuysa kısa bir ek süreden sonra karar verilir.
  const hepsiKonustu = [...dava.ifadeler.values()].every(l => l.length > 0);
  if (hepsiKonustu && !dava.sonSozBekleniyor) {
    dava.sonSozBekleniyor = true;
    clearTimeout(dava.zamanlayici);
    dava.zamanlayici = setTimeout(() => davaKarari(dava.kanal.id).catch(() => null), DAVA_SON_SOZ_MS);
  }
}

async function davaKarari(kanalId) {
  const dava = davalar.get(kanalId);
  if (!dava) return;
  davalar.delete(kanalId);
  clearTimeout(dava.zamanlayici);
  const { kanal, taraflar } = dava;
  kanalDurumu(kanalId).sonAnaliz = Date.now();

  const ifadeler = taraflar.map(t => {
    const l = dava.ifadeler.get(t.id) || [];
    return `${t.ad}: ${l.length ? l.join(' / ') : '(ifade vermedi)'}`;
  }).join('\n');

  try {
    const { metin, saglayici } = await akilliAiUret({
      system: 'Şu an Yargıç Kage olarak üyeler arasındaki bir anlaşmazlıkta karar veriyorsun. ' +
        'Tarafsız ve adil ol, iki tarafı da dinle, kanıta bak, kimseyi kayırma. ' +
        'Kimsenin ailesine, dinine, diline, ırkına laf etme. Başlık, madde işareti, kalın yazı kullanma.',
      prompt: `Olay${dava.ozet ? ` (Gölge Göz özeti: ${dava.ozet})` : ''}.\n\n` +
        `Kanaldaki son mesajlar:\n${sohbetDokumu(kanalId, 20)}\n\nTarafların ifadeleri:\n${ifadeler}\n\n` +
        'En fazla 5 kısa satırla kararını yaz: kim nerede haklı ya da haksız, kim ne yapmalı, nasıl barışırlar. ' +
        'Son satır şöyle olsun: "Yaptırım önerisi: yok" ya da "Yaptırım önerisi: uyarı" ya da "Yaptırım önerisi: susturma (kim)".',
      gorevTipi: 'hizli_sohbet',
      userId: 'golge_goz_hakim',
      userName: 'Yargıç Kage'
    });

    const karar = String(metin || '').replace(/\*\*/g, '').replace(/\n{2,}/g, '\n').trim().slice(0, 1500);
    if (!karar) throw new Error('boş karar');
    const izin = { users: taraflar.map(t => t.id), roles: [] };
    const satirlar = [`⚖️ ${taraflar.map(t => `<@${t.id}>`).join(' ')}`, karar];
    if (/yapt[ıi]r[ıi]m [öo]nerisi:\s*(sustur|timeout|ban|at)/i.test(karar)) {
      const etiket = yetkiliEtiketi(kanal.guild, golgeGozAyarGetir(kanal.guild.id));
      satirlar.push(`${etiket.metin} yaptırım kararı sizde`);
      if (etiket.izin.users) izin.users.push(...etiket.izin.users);
      if (etiket.izin.roles) izin.roles.push(...etiket.izin.roles);
    }
    await kanal.send({ content: `${satirlar.join('\n')}\n-# Yargıç Kage • ${motorEtiketi(saglayici)}`, allowedMentions: izin });
    adminKanalaYaz(kanal.guild, `⚖️ <#${kanalId}> davası kapandı (${taraflar.map(t => t.ad).join(', ')}).\n${karar.slice(0, 1500)}`);
  } catch (err) {
    console.warn('[GolgeGoz] Hakim kararı verilemedi:', err.message);
    await kanal.send({ content: 'karar veremedim, yetkililer bakacak. şimdilik sakin olun.\n-# Yargıç Kage' }).catch(() => null);
  }
}

/**
 * Arka planda toplanan sohbet havuzunu TEK BİR API ÇAĞRISIYLA analiz eder.
 * Kullanıcıların ilgi alanlarını, favori mangalarını ve sunucu bilgilerini otonom öğrenir.
 * @param {import('discord.js').Client} client
 */
export async function golgeGozTopluAnaliz(client) {
  if (taramaSuruyor || mesajHavuzu.length < 2) return;
  taramaSuruyor = true;
  const v = gozYukle();

  try {
    const islenecekMesajlar = mesajHavuzu.splice(0, 15);
    const sohbetMetni = islenecekMesajlar.map(m => `[${m.userName} | #${m.kanal}]: ${m.metin}`).join('\n');

    const prompt = `Aşağıda Discord sunucusunda konuşulan son mesajlar yer alıyor:\n\n${sohbetMetni}\n\n` +
      `GÖREV:\n` +
      `1. Kullanıcıların kendileri hakkında paylaştığı önemli kişisel gerçekleri (örn: yaş, şehir, evcil hayvan, favori manga/anime, meslek vb.) tespit et.\n` +
      `Her tespit için format: [KULLANICI_BILGI: <KullanıcıAdı> | <Gerçek Bilgi>]\n` +
      `2. Sunucuya, kage95 platformuna veya topluluğa dair yeni bir genel kural/bilgi varsa çıkar: [GENEL_BILGI: <Kısa Başlık> | <İçerik>]\n` +
      `3. Sunucu sahibinin bilmesi işine yarayacak bir şey geçtiyse (hata/bug bildirimi, bot, site veya sunucu için öneri, yetkili şikayeti, iş birliği/sponsor teklifi, yardıma ihtiyacı olan biri, baskın/güvenlik tehdidi) ayrıca yaz: [SAHIBE_NOT: <KullanıcıAdı> | <sahip neden bilmeli, tek cümle>]\n` +
      `4. Eğer kayda değer yeni bir bilgi yoksa sadece [BİLGİ_YOK] yaz.\n` +
      `Cevabını sade ve sadece bu formatta ver.`;

    const sonuc = await akilliAiUret({
      prompt,
      gorevTipi: 'hizli_sohbet',
      userId: 'golge_goz_sistemi',
      userName: 'Gölge Gözü'
    });

    const cevap = sonuc.metin || '';

    // Kullanıcı bilgilerini işle; adı havuzdaki bir mesaj sahibine uymayan tespit atlanır.
    const uRegex = /\[KULLANICI_BILGI:\s*([^|]+)\|\s*([^\]]+)\]/gi;
    let uMatch;
    while ((uMatch = uRegex.exec(cevap)) !== null) {
      const uAd = uMatch[1].trim();
      const bilgi = uMatch[2].trim();
      const eslesen = islenecekMesajlar.find(m => sadelestir(m.userName) === sadelestir(uAd));
      if (!eslesen || bilgi.length < 4) continue;

      kullaniciNotuEkle(eslesen.userId, eslesen.userName, bilgi);
      profilGuncelle(eslesen.userId, { kisaOzet: bilgi });
      v.ogrenilenBilgiSayisi += 1;
      v.sonOgrenilenler.unshift({ kullanici: eslesen.userName, bilgi, zaman: new Date().toISOString() });
      if (v.sonOgrenilenler.length > 20) v.sonOgrenilenler.length = 20;
    }

    const gRegex = /\[GENEL_BILGI:\s*([^|]+)\|\s*([^\]]+)\]/gi;
    let gMatch;
    while ((gMatch = gRegex.exec(cevap)) !== null) {
      const baslik = gMatch[1].trim();
      const icerik = gMatch[2].trim();
      if (baslik && icerik) {
        bilgiOgren('otonom_goz', baslik, icerik, 'Gölge Gözü AI');
        v.ogrenilenBilgiSayisi += 1;
      }
    }

    // Sahibe notlar: tarama başına en fazla 3 bildirim, yalnız havuzdaki bir yazara uyanlar.
    const sRegex = /\[SAHIBE_NOT:\s*([^|]+)\|\s*([^\]]+)\]/gi;
    let sMatch;
    let sahibeGiden = 0;
    while ((sMatch = sRegex.exec(cevap)) !== null && sahibeGiden < 3) {
      const eslesen = islenecekMesajlar.find(m => sadelestir(m.userName) === sadelestir(sMatch[1].trim()));
      const guild = eslesen?.guildId && client?.guilds?.cache?.get(eslesen.guildId);
      const neden = sMatch[2].trim();
      if (!guild || neden.length < 6) continue;
      sahibeGiden++;
      sahibeBildir(guild, `💡 ${eslesen.userName} • #${eslesen.kanal}\n> ${neden}`).catch(() => null);
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

  setInterval(() => {
    golgeGozTopluAnaliz(client).catch(() => null);
    // Uzun süredir sessiz kanalların bellekteki kaydı temizlenir.
    const simdi = Date.now();
    for (const [id, k] of kanallar) {
      const son = k.mesajlar[k.mesajlar.length - 1];
      if (!son || simdi - son.zaman > 60 * 60 * 1000) kanallar.delete(id);
    }
    for (const [anahtar, kayit] of kufurGecmisi) {
      if (!kayit.zamanlar.some(z => simdi - z < KUFUR_PENCERE_MS)) kufurGecmisi.delete(anahtar);
    }
  }, 60 * 1000);
}
