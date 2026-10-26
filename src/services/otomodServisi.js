import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PermissionFlagsBits } from 'discord.js';
import { TEMA } from '../config/tema.js';
import { uyariEkle } from './veritabaniServisi.js';
import { modLogGonder } from './modLogServisi.js';
import { denetimKaydet } from './ai/denetim.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSYA = path.resolve(__dirname, '../../data/otomod.json');

// İhlal sayacı bu sürede bir puan azalır (zamanla affetme).
const AZALMA_MS = 6 * 60 * 60 * 1000;
// Timeout süreleri (dk): eşik aşıldıkça kademeli artar.
const TIMEOUT_KADEME_DK = [10, 60, 360, 1440];

const VARSAYILAN_AYAR = { acik: false, ozelKelimeler: [], timeoutEsik: 3 };

// Tam eşleşen kısa küfürler (ünlü düşürülmüş/normalleştirilmiş biçimde yazılır).
const TAM_KELIMELER = ['amk', 'aq', 'mk', 'sik', 'got', 'pic', 'oc', 'amina', 'amini'];
// Kök olarak aranan küfürler: kelime bu köklerden biriyle başlıyorsa eşleşir.
const KOKLER = [
  'orospu', 'siktir', 'sikeyim', 'sikik', 'sikis', 'yarrak', 'yarak', 'amcik', 'pezevenk',
  'gavat', 'kahpe', 'ibne', 'puşt', 'gotveren', 'gotun', 'ananı', 'anani', 'amına', 'amina',
  'serefsiz', 'şerefsiz', 'piclik'
];

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '€': 'e' };
const ACCENT = { 'ı': 'i', 'İ': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u' };

/** Aynı harfin art arda tekrarını teke indirir (siiiktir → siktir). */
function tekrariKapat(s) {
  return s.replace(/(.)\1+/g, '$1');
}

/** Türkçe aksanları, leetspeak'i ve büyük/küçük farkını ortadan kaldırır. */
function sadelestir(s) {
  let sonuc = '';
  for (const ch of s.normalize('NFKC').toLocaleLowerCase('tr')) {
    sonuc += LEET[ch] ?? ACCENT[ch] ?? ch;
  }
  return sonuc;
}

const KOK_SET = KOKLER.map(k => tekrariKapat(sadelestir(k)).replace(/\s+/g, ''));
const TAM_SET = new Set(TAM_KELIMELER.map(k => tekrariKapat(sadelestir(k))));

/**
 * Metindeki yasaklı kelimeyi bulur, yoksa null döner.
 * `ozel` sunucuya özel kelimelerdir.
 */
export function yasakliBul(metin, ozel = []) {
  const duz = sadelestir(metin || '');
  // Tokenlar: harf dizileri. Tek harflerden oluşan ardışık diziler (s i k t i r) birleştirilir.
  const tokenlar = duz.split(/[^a-z]+/).filter(Boolean);
  const adaylar = [];
  let tekHarfler = '';
  for (const t of tokenlar) {
    if (t.length === 1) {
      tekHarfler += t;
      continue;
    }
    if (tekHarfler.length > 1) adaylar.push(tekHarfler);
    tekHarfler = '';
    adaylar.push(t);
  }
  if (tekHarfler.length > 1) adaylar.push(tekHarfler);

  // Ayırıcıyla bölünmüş yazımlar (s.i.k.t.i.r) için ayırıcısız tek parça da denenir.
  const bitisik = duz.replace(/[^a-z]+/g, '');

  const ozelSet = ozel.map(k => tekrariKapat(sadelestir(k)).replace(/[^a-z]+/g, '')).filter(Boolean);

  for (const aday of adaylar) {
    const k = tekrariKapat(aday);
    if (TAM_SET.has(k)) return k;
    const kok = KOK_SET.find(x => k.startsWith(x));
    if (kok) return kok;
    if (ozelSet.includes(k)) return k;
  }
  // Özel kelimeler bitişik metinde de aranır (ayırıcı ile bölünmüş kaçamaklar için).
  const bitisikTekrarsiz = tekrariKapat(bitisik);
  for (const o of ozelSet) {
    if (o.length >= 4 && bitisikTekrarsiz.includes(o)) return o;
  }
  // Uzun kök küfürler ayırıcıyla bölünmüş olsa da yakalanır.
  for (const kok of KOK_SET) {
    if (kok.length >= 6 && bitisikTekrarsiz.includes(kok)) return kok;
  }
  return null;
}

function oku() {
  try {
    return JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  } catch {
    return { sunucular: {}, ihlaller: {} };
  }
}

function yaz(db) {
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(db, null, 2), 'utf8');
}

export function otomodAyarGetir(guildId) {
  const db = oku();
  return { ...VARSAYILAN_AYAR, ...(db.sunucular?.[guildId] || {}) };
}

export function otomodAyarGuncelle(guildId, degisim) {
  const db = oku();
  db.sunucular ??= {};
  db.sunucular[guildId] = { ...VARSAYILAN_AYAR, ...(db.sunucular[guildId] || {}), ...degisim };
  yaz(db);
  return db.sunucular[guildId];
}

/** Zamanla azalan ihlal puanını döndürür (kayıt değiştirmez). */
export function ihlalGetir(guildId, userId) {
  const kayit = oku().ihlaller?.[`${guildId}:${userId}`];
  if (!kayit) return 0;
  return Math.max(0, kayit.sayi - Math.floor((Date.now() - kayit.son) / AZALMA_MS));
}

function ihlalArtir(guildId, userId) {
  const db = oku();
  db.ihlaller ??= {};
  const anahtar = `${guildId}:${userId}`;
  const mevcut = ihlalGetir(guildId, userId);
  db.ihlaller[anahtar] = { sayi: mevcut + 1, son: Date.now() };
  yaz(db);
  return mevcut + 1;
}

export function ihlalSifirla(guildId, userId) {
  const db = oku();
  delete db.ihlaller?.[`${guildId}:${userId}`];
  yaz(db);
}

/** AI ve yönetici komutları için özet durum. */
export function otomodDurumu(guildId) {
  const ayar = otomodAyarGetir(guildId);
  const db = oku();
  const onek = `${guildId}:`;
  const ihlalliler = Object.keys(db.ihlaller || {})
    .filter(k => k.startsWith(onek))
    .map(k => ({ userId: k.slice(onek.length), puan: ihlalGetir(guildId, k.slice(onek.length)) }))
    .filter(x => x.puan > 0)
    .sort((a, b) => b.puan - a.puan);
  return { ...ayar, ihlalliler };
}

const UYARI_SOZLERI = [
  'Ağzını topla. Gölgeler her şeyi duyar.',
  'Bu dil burada kabul görmez. Bir daha olmasın.',
  'Kelimelerine dikkat et, yoksa sessizliğe gömülürsün.',
  'Kage küfrü sevmez. Mesajın silindi.'
];

function yetkiliMi(member, guild) {
  if (!member) return false;
  return guild.ownerId === member.id ||
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

/**
 * Mesajı otomatik moderasyondan geçirir.
 * @returns {Promise<boolean>} Mesaj işlendiyse (silindiyse) true.
 */
export async function otomodKontrol(message) {
  const guild = message.guild;
  if (!guild || !message.content) return false;

  const ayar = otomodAyarGetir(guild.id);
  if (!ayar.acik) return false;
  if (yetkiliMi(message.member, guild)) return false;

  const bulunan = yasakliBul(message.content, ayar.ozelKelimeler);
  if (!bulunan) return false;

  const silindi = await message.delete().then(() => true).catch(() => false);
  const puan = ihlalArtir(guild.id, message.author.id);

  let sonucMetni = 'Mesaj silindi, uyarıldı.';
  let uyariMetni = UYARI_SOZLERI[Math.floor(Math.random() * UYARI_SOZLERI.length)];

  if (puan === 2) uyariEkle(guild.id, message.author.id, 'Otomod: yasaklı kelime (tekrar)', message.client.user.id);

  if (puan >= ayar.timeoutEsik && message.member?.moderatable) {
    const kademe = Math.min(puan - ayar.timeoutEsik, TIMEOUT_KADEME_DK.length - 1);
    const dk = TIMEOUT_KADEME_DK[kademe];
    try {
      await message.member.timeout(dk * 60 * 1000, 'Otomod: tekrarlayan yasaklı kelime');
      sonucMetni = `Mesaj silindi, ${dk} dk timeout.`;
      uyariMetni = `${uyariMetni} **${dk} dakika** susturuldun.`;
    } catch (err) {
      sonucMetni = `Mesaj silindi, timeout verilemedi: ${err.message}`;
    }
  }

  const uyari = await message.channel
    .send({ content: `🛡️ ${message.author}, ${uyariMetni}`, allowedMentions: { users: [message.author.id] } })
    .catch(() => null);
  if (uyari) setTimeout(() => uyari.delete().catch(() => null), 15000);

  denetimKaydet({
    guildId: guild.id,
    userId: message.author.id,
    userTag: message.author.tag,
    eylem: 'otomod',
    parametreler: { kanal: message.channel.id, kelime: bulunan, puan, silindi },
    sonuc: { basarili: true, detay: sonucMetni }
  });

  await Promise.resolve(modLogGonder(guild, {
    baslik: '🛡️ Otomod',
    renk: TEMA.RENKLER.HATA,
    aciklama: `${message.author} (${message.author.tag}) yasaklı kelime kullandı.\n` +
      `Kanal: ${message.channel} • İhlal puanı: **${puan}**\nİşlem: ${sonucMetni}`,
    hedefAvatar: message.author.displayAvatarURL()
  })).catch(() => null);

  return true;
}
