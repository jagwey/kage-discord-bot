import { jsonDepo } from './jsonDepo.js';
import { ryoEkle } from './ekonomiServisi.js';
import { profilGetir } from './kageHafizaServisi.js';
import { akilliAiUret } from './aiRouterServisi.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';
import { golgeGozAyarGetir } from './golgeGozServisi.js';
import { kullaniciKayitBilgileriniGetir } from './kayitServisi.js';

// Doğum günleri, haftalık sahip raporu, yeni üye tanıştırma ve kayıtsız hatırlatma.
const depo = jsonDepo('topluluk.json', () => ({}));

const KONTROL_ARALIGI_MS = 10 * 60 * 1000;
const TR_OFSET_MS = 3 * 60 * 60 * 1000;     // Türkiye saati (UTC+3, yaz saati yok)
const DOGUM_GUNU_SAATI = 10;                 // kutlama bu saatten sonra yapılır
const RAPOR_GUNU = 0;                        // pazar
const RAPOR_SAATI = 20;
const DOGUM_GUNU_ODULU = 500;
const HATIRLATMA_MIN_MS = 24 * 60 * 60 * 1000;
const HATIRLATMA_MAKS_MS = 7 * 24 * 60 * 60 * 1000;
const UYE_CEKME_ARALIGI_MS = 6 * 60 * 60 * 1000;
const ESLESME_BEKLEME_MS = 3 * 24 * 60 * 60 * 1000; // eski bir üye en sık bu aralıkla tanıştırılır
const HAFTA_MS = 7 * 24 * 60 * 60 * 1000;
const AI_SURE_SINIRI_MS = 12_000;

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

let veri = null;
let kaydetZamanlayici = null;
const sonUyeCekme = new Map();

function yukle() {
  if (veri) return veri;
  veri = depo.oku();
  veri.dogumGunleri ??= {};      // userId -> { gun, ay }
  veri.kutlananYil ??= {};       // userId -> yıl (ödül yılda bir)
  veri.kutlananGun ??= {};       // guildId -> 'yyyy-mm-dd'
  veri.kayitlar ??= [];          // { guildId, userId, zaman, turler }
  veri.sahipNotlari ??= [];      // { guildId, zaman, metin }
  veri.mesajSayilari ??= {};     // guildId -> { userId: sayı } (bu hafta)
  veri.katilimlar ??= [];        // { guildId, zaman }
  veri.hatirlatilanlar ??= {};   // `${guildId}:${userId}` -> zaman
  veri.sonEslesme ??= {};        // userId -> zaman
  veri.sonRapor ??= {};          // guildId -> hafta anahtarı
  return veri;
}

function kaydet() {
  if (veri) depo.yaz(veri);
}

// Mesaj sayacı gibi sık değişen veriler 30 sn içinde toplanıp tek seferde yazılır.
function kaydetPlanla() {
  if (kaydetZamanlayici) return;
  kaydetZamanlayici = setTimeout(() => {
    kaydetZamanlayici = null;
    kaydet();
  }, 30_000);
}

function trSimdi() {
  const d = new Date(Date.now() + TR_OFSET_MS);
  return {
    yil: d.getUTCFullYear(), ay: d.getUTCMonth() + 1, gun: d.getUTCDate(),
    saat: d.getUTCHours(), haftaGunu: d.getUTCDay(),
    anahtar: d.toISOString().slice(0, 10)
  };
}

function artikYil(yil) {
  return (yil % 4 === 0 && yil % 100 !== 0) || yil % 400 === 0;
}

function aydakiGun(ay, yil = 2024) {
  return new Date(Date.UTC(yil, ay, 0)).getUTCDate();
}

function zamanAsimli(istek) {
  const zamanAsimi = new Promise(resolve => setTimeout(() => resolve(null), AI_SURE_SINIRI_MS));
  return Promise.race([istek.catch(() => null), zamanAsimi]);
}

function metinKanaliBul(guild, id, adlar) {
  const kayitli = id ? guild.channels.cache.get(id) : null;
  if (kayitli?.isTextBased()) return kayitli;
  return guild.channels.cache.find(c => c.isTextBased() && !c.isThread?.() && adlar.some(a => c.name.includes(a))) || null;
}

function sohbetKanaliBul(guild) {
  const ayar = sunucuAyarGetir(guild.id);
  return metinKanaliBul(guild, ayar.dogumGunuKanalId, ['genel-sohbet', 'sohbet', 'genel', 'chat'])
    || metinKanaliBul(guild, ayar.hosgeldinKanalId, ['yeni-savaşçılar', 'yeni-savascilar', 'hoş-geldin', 'hos-geldin']);
}

// ---------- Doğum günü ----------

export function dogumGunuAyarla(userId, gun, ay) {
  if (!Number.isInteger(ay) || ay < 1 || ay > 12) return { basarili: false, hata: 'Ay 1 ile 12 arasında olmalı.' };
  if (!Number.isInteger(gun) || gun < 1 || gun > aydakiGun(ay)) {
    return { basarili: false, hata: `${AYLAR[ay - 1]} ayında ${gun}. gün yok.` };
  }
  const v = yukle();
  v.dogumGunleri[userId] = { gun, ay };
  kaydet();
  return { basarili: true };
}

export function dogumGunuSil(userId) {
  const v = yukle();
  const vardi = !!v.dogumGunleri[userId];
  delete v.dogumGunleri[userId];
  kaydet();
  return vardi;
}

export function dogumGunuGetir(userId) {
  return yukle().dogumGunleri[userId] || null;
}

// 29 Şubat doğumlular artık olmayan yıllarda 28 Şubat'ta kutlanır.
function bugunDogduMu(dg, simdi) {
  if (dg.ay !== simdi.ay) return false;
  if (dg.gun === simdi.gun) return true;
  return dg.ay === 2 && dg.gun === 29 && simdi.gun === 28 && !artikYil(simdi.yil);
}

function kalanGun(dg, simdi) {
  const bugun = Date.UTC(simdi.yil, simdi.ay - 1, simdi.gun);
  let hedef = Date.UTC(simdi.yil, dg.ay - 1, Math.min(dg.gun, aydakiGun(dg.ay, simdi.yil)));
  if (hedef < bugun) hedef = Date.UTC(simdi.yil + 1, dg.ay - 1, Math.min(dg.gun, aydakiGun(dg.ay, simdi.yil + 1)));
  return Math.round((hedef - bugun) / 86_400_000);
}

/** Sunucuda olan üyelerin yaklaşan doğum günleri, en yakından uzağa. */
export function yaklasanDogumGunleri(guild, gunSiniri = 366, limit = 10) {
  const simdi = trSimdi();
  return Object.entries(yukle().dogumGunleri)
    .filter(([userId]) => guild.members.cache.has(userId))
    .map(([userId, dg]) => ({ userId, ...dg, kalan: kalanGun(dg, simdi) }))
    .filter(x => x.kalan <= gunSiniri)
    .sort((a, b) => a.kalan - b.kalan)
    .slice(0, limit);
}

async function dogumGunuMesaji(member) {
  const profil = profilGetir(member.id);
  const ipucu = [profil?.kisaOzet, profil?.favoriMangalar?.length ? `sevdiği seriler: ${profil.favoriMangalar.join(', ')}` : '']
    .filter(Boolean).join('. ');
  const sonuc = await zamanAsimli(akilliAiUret({
    prompt: `Bugün ${member.displayName} adlı üyenin doğum günü. ${ipucu ? `Onun hakkında bildiklerin: ${ipucu}.` : ''}\n` +
      'Ona sunucu sohbetinde yazılacak 1-2 cümlelik sıcak, esprili bir kutlama yaz. Bildiğin bir ayrıntıya değin. ' +
      'Başlık, emoji yığını, tırnak kullanma. Sadece mesajı yaz.',
    system: 'Kage-95 sunucusunun samuray ruhlu botu Kage\'sin. Samimi ve kısa yazarsın. Aile, din, dil veya ırk hakkında asla aşağılayıcı bir şey söylemezsin.',
    gorevTipi: 'hizli_sohbet',
    userId: member.id,
    userName: member.displayName
  }));
  const metin = String(sonuc?.metin || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim().slice(0, 400);
  return metin || 'Bir yaş daha büyüdün, kılıcın daha da keskinleşsin. Bugün kale senin.';
}

async function dogumGunleriniKutla(client, simdi) {
  if (simdi.saat < DOGUM_GUNU_SAATI) return;
  const v = yukle();
  const bugunkuler = Object.entries(v.dogumGunleri).filter(([, dg]) => bugunDogduMu(dg, simdi)).map(([id]) => id);

  for (const guild of client.guilds.cache.values()) {
    if (v.kutlananGun[guild.id] === simdi.anahtar) continue;
    v.kutlananGun[guild.id] = simdi.anahtar;
    kaydet();

    const kanal = sohbetKanaliBul(guild);
    if (!kanal) continue;
    for (const userId of bugunkuler) {
      const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      // Ödül kullanıcı başına yılda bir; birden çok sunucuda olsa da tek kez verilir.
      let odulSatiri = '';
      if (v.kutlananYil[userId] !== simdi.yil) {
        v.kutlananYil[userId] = simdi.yil;
        kaydet();
        ryoEkle(userId, DOGUM_GUNU_ODULU, 'doğum günü hediyesi');
        odulSatiri = `\n-# 🎁 +${DOGUM_GUNU_ODULU} Ryo cüzdanına kondu`;
      }
      const mesaj = await dogumGunuMesaji(member);
      await kanal.send({
        content: `🎂 ${member} ${mesaj}${odulSatiri}`,
        allowedMentions: { users: [userId] }
      }).then(m => m.react('🎉').catch(() => null)).catch(() => null);
    }
  }
}

// ---------- Kayıt kaydı ve tanıştırma ----------

/** Haftalık rapor için kaydı not eder. */
export function kayitOlayiKaydet(guildId, userId, turler = []) {
  const v = yukle();
  v.kayitlar.push({ guildId, userId, zaman: Date.now(), turler });
  if (v.kayitlar.length > 1000) v.kayitlar.splice(0, v.kayitlar.length - 1000);
  kaydet();
}

export function turListesi(metin) {
  return String(metin || '').split(/[\/,]/).map(t => t.trim()).filter(t => t && t.toLowerCase() !== 'genel');
}

/**
 * Yeni üyeyle aynı türleri seven, kayıtlı bir eski üye bulur.
 * Ortak tür sayısı en yüksek olanlar arasından rastgele biri seçilir.
 * @returns {{ member: import('discord.js').GuildMember, ortak: string[] }|null}
 */
export function tanisacakUyeBul(guild, yeniUyeId, turler) {
  const yeniTurler = turler.map(t => t.toLowerCase());
  if (!yeniTurler.length) return null;
  const v = yukle();
  const simdi = Date.now();
  const kayitliRolId = sunucuAyarGetir(guild.id).shinobiRolId;

  let enIyi = [];
  let enIyiPuan = 0;
  let bakilan = 0;
  for (const member of guild.members.cache.values()) {
    if (member.user.bot || member.id === yeniUyeId) continue;
    if (kayitliRolId && !member.roles.cache.has(kayitliRolId)) continue;
    if (simdi - (v.sonEslesme[member.id] || 0) < ESLESME_BEKLEME_MS) continue;
    if (++bakilan > 800) break;

    const onunTurleri = turListesi(kullaniciKayitBilgileriniGetir(member.id).mangaTuru);
    const ortak = onunTurleri.filter(t => yeniTurler.includes(t.toLowerCase()));
    if (!ortak.length) continue;
    if (ortak.length > enIyiPuan) {
      enIyiPuan = ortak.length;
      enIyi = [{ member, ortak }];
    } else if (ortak.length === enIyiPuan) {
      enIyi.push({ member, ortak });
    }
  }
  if (!enIyi.length) return null;
  return enIyi[Math.floor(Math.random() * enIyi.length)];
}

/** Yeni kayıt olan üyeyi ortak zevkli biriyle hoş geldin kanalında tanıştırır. */
export async function yeniUyeyiTanistir(guild, member, turler, kanal) {
  if (!kanal || !golgeGozAyarGetir(guild.id).tanistir) return false;
  const eslesme = tanisacakUyeBul(guild, member.id, turler);
  if (!eslesme) return false;

  const v = yukle();
  v.sonEslesme[eslesme.member.id] = Date.now();
  v.sonEslesme[member.id] = Date.now();
  kaydet();

  const ortakMetin = eslesme.ortak.length > 1
    ? `${eslesme.ortak.slice(0, -1).join(', ')} ve ${eslesme.ortak.at(-1)}`
    : eslesme.ortak[0];
  await kanal.send({
    content: `🤝 ${member} ile ${eslesme.member}, ikiniz de ${ortakMetin} seviyorsunuz. ` +
      `${eslesme.member.displayName}, yeni gelene bir seri önermek senden.`,
    allowedMentions: { users: [member.id, eslesme.member.id] }
  }).catch(() => null);
  return true;
}

// ---------- Kayıtsız hatırlatma ----------

async function kayitsizlariHatirlat(client) {
  const v = yukle();
  const simdi = Date.now();
  for (const guild of client.guilds.cache.values()) {
    if (!golgeGozAyarGetir(guild.id).kayitHatirlat) continue;
    const ayar = sunucuAyarGetir(guild.id);
    const roninRol = (ayar.roninRolId || ayar.otoRolId) ? guild.roles.cache.get(ayar.roninRolId || ayar.otoRolId) : null;
    const kayitsizRol = roninRol || guild.roles.cache.find(r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));
    if (!kayitsizRol) continue;

    // Önbellek eksik olabilir; üye listesi birkaç saatte bir tazelenir.
    if (simdi - (sonUyeCekme.get(guild.id) || 0) > UYE_CEKME_ARALIGI_MS) {
      sonUyeCekme.set(guild.id, simdi);
      await guild.members.fetch().catch(() => null);
    }

    const kayitKanali = metinKanaliBul(guild, ayar.kayitKanalId, ['kayıt', 'kayit']);
    for (const member of kayitsizRol.members.values()) {
      const gecen = simdi - (member.joinedTimestamp || simdi);
      if (member.user.bot || gecen < HATIRLATMA_MIN_MS || gecen > HATIRLATMA_MAKS_MS) continue;
      const anahtar = `${guild.id}:${member.id}`;
      if (v.hatirlatilanlar[anahtar]) continue;
      v.hatirlatilanlar[anahtar] = simdi;
      kaydet();

      await member.send(
        `selam ${member.displayName}, **${guild.name}** kapısından girdin ama mührünü basmadın.\n` +
        `${kayitKanali && !kayitKanali.name.includes('log') ? `${kayitKanali.url} kanalında` : 'kayıt kanalında'} butona bas, yarım dakika sürer. ` +
        'Odalar açılır, cüzdanına 150 Ryo düşer.\n-# Kage'
      ).catch(() => null);
    }
  }

  // Bir aydan eski hatırlatma kayıtları silinir.
  for (const [anahtar, zaman] of Object.entries(v.hatirlatilanlar)) {
    if (simdi - zaman > 30 * 24 * 60 * 60 * 1000) delete v.hatirlatilanlar[anahtar];
  }
}

// ---------- Haftalık sahip raporu ----------

export function mesajSay(message) {
  const v = yukle();
  const sayac = (v.mesajSayilari[message.guild.id] ??= {});
  sayac[message.author.id] = (sayac[message.author.id] || 0) + 1;
  kaydetPlanla();
}

export function katilimKaydet(guildId) {
  const v = yukle();
  v.katilimlar.push({ guildId, zaman: Date.now() });
  if (v.katilimlar.length > 2000) v.katilimlar.splice(0, v.katilimlar.length - 2000);
  kaydet();
}

export function sahipNotuKaydet(guildId, metin) {
  const v = yukle();
  v.sahipNotlari.push({ guildId, zaman: Date.now(), metin: String(metin).replace(/<@!?\d+>/g, '').trim().slice(0, 160) });
  if (v.sahipNotlari.length > 300) v.sahipNotlari.splice(0, v.sahipNotlari.length - 300);
  kaydetPlanla();
}

function haftaAnahtari(simdi) {
  // Pazartesi başlangıçlı hafta: raporun haftada bir gittiğini garanti etmek için yeterli.
  const gunNo = Math.floor(Date.UTC(simdi.yil, simdi.ay - 1, simdi.gun) / 86_400_000);
  return String(Math.floor((gunNo + 3) / 7));
}

/** Son 7 günün özetini düz metin olarak hazırlar. */
export async function haftalikRaporOlustur(guild) {
  const v = yukle();
  const sinir = Date.now() - HAFTA_MS;
  const ad = id => guild.members.cache.get(id)?.displayName || 'ayrılmış üye';

  const kayitlar = v.kayitlar.filter(k => k.guildId === guild.id && k.zaman > sinir);
  const katilan = v.katilimlar.filter(k => k.guildId === guild.id && k.zaman > sinir).length;
  const turSayaci = {};
  for (const k of kayitlar) for (const t of k.turler || []) turSayaci[t] = (turSayaci[t] || 0) + 1;
  const enSevilenTurler = Object.entries(turSayaci).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} (${n})`);

  const sayac = v.mesajSayilari[guild.id] || {};
  const toplamMesaj = Object.values(sayac).reduce((a, b) => a + b, 0);
  const enAktifler = Object.entries(sayac).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n], i) => `${i + 1}. ${ad(id)} • ${n}`);

  const notlar = v.sahipNotlari.filter(n => n.guildId === guild.id && n.zaman > sinir);
  const dogumGunleri = yaklasanDogumGunleri(guild, 7, 5).map(d => `${ad(d.userId)} • ${d.gun} ${AYLAR[d.ay - 1]}`);

  const satirlar = [
    `📊 **${guild.name}** • haftalık rapor`,
    `👥 ${guild.memberCount} üye • bu hafta ${katilan} katılım, ${kayitlar.length} kayıt`,
    enSevilenTurler.length ? `📖 yeni gelenler en çok: ${enSevilenTurler.join(', ')}` : null,
    `💬 ${toplamMesaj.toLocaleString('tr-TR')} mesaj`,
    enAktifler.length ? `🔥 en aktifler\n${enAktifler.join('\n')}` : null,
    notlar.length ? `💡 sana gelen ${notlar.length} not, son 5:\n${notlar.slice(-5).map(n => `• ${n.metin.split('\n')[0].slice(0, 110)}`).join('\n')}` : '💡 bu hafta sana not düşmedi',
    dogumGunleri.length ? `🎂 önümüzdeki 7 gün: ${dogumGunleri.join(', ')}` : null
  ].filter(Boolean);

  // Yapay zeka sayılara bakıp tek cümlelik yorum ekler; gelmezse rapor yine gider.
  const yorum = await zamanAsimli(akilliAiUret({
    prompt: `Discord sunucusunun haftalık verisi:\n${satirlar.join('\n')}\n\n` +
      'Sunucu sahibine bu haftayla ilgili tek cümlelik, işine yarar bir gözlem ya da öneri yaz. Sadece cümleyi yaz.',
    system: 'Kage-95 sunucusunun danışmanı Kage\'sin. Kısa, net ve dürüst yazarsın.',
    gorevTipi: 'hizli_sohbet',
    userId: guild.ownerId,
    userName: 'sahip'
  }));
  const yorumMetni = String(yorum?.metin || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim().slice(0, 300);
  if (yorumMetni) satirlar.push(`\n🧭 ${yorumMetni}`);

  return `${satirlar.join('\n')}\n-# Kage haftalık rapor`.slice(0, 1990);
}

async function haftalikRaporlariGonder(client, simdi) {
  if (simdi.haftaGunu !== RAPOR_GUNU || simdi.saat < RAPOR_SAATI) return;
  const v = yukle();
  const hafta = haftaAnahtari(simdi);
  for (const guild of client.guilds.cache.values()) {
    if (v.sonRapor[guild.id] === hafta) continue;
    v.sonRapor[guild.id] = hafta;
    kaydet();
    if (!golgeGozAyarGetir(guild.id).haftalikRapor) continue;

    const rapor = await haftalikRaporOlustur(guild);
    const sahip = await guild.fetchOwner().catch(() => null);
    await sahip?.send(rapor).catch(() => null);
    // Yeni hafta sayacı sıfırdan başlar.
    v.mesajSayilari[guild.id] = {};
    kaydet();
  }
}

/**
 * Doğum günü, haftalık rapor ve kayıtsız hatırlatma için periyodik kontrolü kurar.
 * @param {import('discord.js').Client} client
 */
export function toplulukServisiniBaslat(client) {
  yukle();
  const tur = async () => {
    const simdi = trSimdi();
    await dogumGunleriniKutla(client, simdi).catch(err => console.error('[Topluluk] doğum günü:', err.message));
    await haftalikRaporlariGonder(client, simdi).catch(err => console.error('[Topluluk] rapor:', err.message));
    await kayitsizlariHatirlat(client).catch(err => console.error('[Topluluk] hatırlatma:', err.message));
    kaydet();
  };
  setTimeout(tur, 30_000);
  setInterval(tur, KONTROL_ARALIGI_MS);
  console.log('[Topluluk] doğum günü, haftalık rapor ve kayıt hatırlatma devrede.');
}
