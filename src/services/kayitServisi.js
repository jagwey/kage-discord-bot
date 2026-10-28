import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle, bakiyeGetir } from './ekonomiServisi.js';
import { kullaniciNotuEkle, kullaniciHafizasiGetir, profilGuncelle } from './kageHafizaServisi.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';
import { akilliAiUret } from './aiRouterServisi.js';
import { sahibeBildir } from './golgeGozServisi.js';
import { kayitOlayiKaydet, yeniUyeyiTanistir, turListesi, dogumGunuGetir } from './toplulukServisi.js';

export const YAS_ARALIKLARI = ['13-15', '16-17', '18-20', '21-25', '26-30', '30+'];
export const MANGA_TURLERI = [
  { ad: 'Shonen', emoji: '🔥' },
  { ad: 'Seinen', emoji: '🗡️' },
  { ad: 'Romantizm', emoji: '💞' },
  { ad: 'Isekai', emoji: '🌀' },
  { ad: 'Psikolojik', emoji: '🧠' },
  { ad: 'Aksiyon', emoji: '💥' },
  { ad: 'Komedi', emoji: '😂' },
  { ad: 'Korku', emoji: '👻' },
  { ad: 'Spor', emoji: '🏀' },
  { ad: 'Slice of Life', emoji: '🍵' },
  { ad: 'Fantastik', emoji: '🐉' },
  { ad: 'Gizem', emoji: '🔍' }
];
const AI_SURE_SINIRI_MS = 12_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STICKERS_DIR = path.join(__dirname, '../../assets/stickers');

function findInCache(cache, predicate) {
  if (!cache) return null;
  if (typeof cache.find === 'function') return cache.find(predicate);
  const items = cache.values ? Array.from(cache.values()) : Array.isArray(cache) ? cache : [];
  return items.find(predicate) || null;
}

// /sunucu-kur'un kaydettiği kimlik önce denenir; eski sunucularda isim eşleşmesine düşülür.
function ayarliVeyaBul(cache, id, predicate) {
  const kayitli = id && cache?.get ? cache.get(id) : null;
  return kayitli || findInCache(cache, predicate);
}

function hasInCache(cache, id) {
  if (!cache) return false;
  if (typeof cache.has === 'function') return cache.has(id);
  const items = cache.values ? Array.from(cache.values()) : Array.isArray(cache) ? cache : [];
  return items.some(item => item?.id === id);
}

/**
 * Cinsiyet metninden kız/kunoichi olup olmadığını tespit eder
 * @param {string} metin 
 * @returns {boolean}
 */
export function cinsiyetKizMi(metin = '') {
  const m = (metin || '').toLowerCase().trim();
  const kizKelimeleri = ['kız', 'kiz', 'kunoichi', 'kadın', 'kadin', 'bayan', 'prenses', 'female', 'girl', 'she', 'waifu', 'hanım', 'hanim'];
  return kizKelimeleri.some(k => m.includes(k));
}

/**
 * Kullanıcının mevcut hafıza veya rollerinden profil taslağını çıkarır
 * @param {string} userId 
 * @param {import('discord.js').GuildMember|null} member 
 * @returns {Object}
 */
export function kullaniciKayitBilgileriniGetir(userId, member = null) {
  const varsayilanlar = {
    isim: member?.displayName?.replace(/[🌸🗡️]/g, '').trim() || '',
    cinsiyet: '',
    yas: '',
    mangaTuru: '',
    karakter: '',
    yemin: '',
    hakkinda: ''
  };

  const hafiza = kullaniciHafizasiGetir(userId);
  if (hafiza?.notlar && Array.isArray(hafiza.notlar)) {
    for (const not of hafiza.notlar) {
      // Yalnız kayıt notları okunur; Gölge Göz'ün serbest notları cinsiyeti bozmasın.
      if (typeof not !== 'string' || !not.startsWith('Karakter Yolu:')) continue;
      if (not.includes('Kız') || not.includes('Kunoichi')) {
        varsayilanlar.cinsiyet = 'Kız (Kunoichi)';
      } else if (not.includes('Erkek') || not.includes('Samuray')) {
        varsayilanlar.cinsiyet = 'Erkek (Samuray)';
      }

      // Eski notlarda "Kenji / 19", yenilerinde "Kenji (18-20)" biçimi vardır.
      const adMatch = not.match(/İsim\/Yaş:\s*([^,]+)/i);
      if (adMatch && adMatch[1]) {
        varsayilanlar.isim = adMatch[1].replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\/\s*\d+\s*$/, '').trim();
      }

      const yasMatch = not.match(/(?:^|,\s*)Yaş:\s*([^,]+)/);
      if (yasMatch && yasMatch[1]) varsayilanlar.yas = yasMatch[1].trim();

      const hakkindaMatch = not.match(/Hakkında:\s*"([^"]+)"/);
      if (hakkindaMatch && hakkindaMatch[1]) varsayilanlar.hakkinda = hakkindaMatch[1].trim();

      const turMatch = not.match(/Favori Türü:\s*([^,]+)/i);
      if (turMatch && turMatch[1]) varsayilanlar.mangaTuru = turMatch[1].trim();

      const karMatch = not.match(/Ruh Karakteri:\s*([^,]+)/i);
      if (karMatch && karMatch[1]) varsayilanlar.karakter = karMatch[1].trim();

      const yeminMatch = not.match(/Yemin:\s*"([^"]+)"/i);
      if (yeminMatch && yeminMatch[1]) varsayilanlar.yemin = yeminMatch[1].trim();
    }
  }

  // Eğer hafızada cinsiyet yoksa rollere ve takma ad sembollerine bak
  if (!varsayilanlar.cinsiyet && member) {
    if (member.displayName?.startsWith('🌸') || member.roles?.cache?.some?.(r => r.name.includes('Kunoichi'))) {
      varsayilanlar.cinsiyet = 'Kız (Kunoichi)';
    } else if (member.displayName?.startsWith('🗡️') || member.roles?.cache?.some?.(r => r.name.includes('Samuray'))) {
      varsayilanlar.cinsiyet = 'Erkek (Samuray)';
    }
  }

  return varsayilanlar;
}

/**
 * Kayıt modalı: ad yazılır, yol ve yaş seçilir, türler işaretlenir,
 * gerisini kullanıcı kendi cümleleriyle anlatır ve yapay zeka ayıklar.
 * @param {Object} varsayilanlar kullaniciKayitBilgileriniGetir çıktısı
 * @returns {ModalBuilder}
 */
export function kayitModaliOlustur(varsayilanlar = {}) {
  const kizMi = varsayilanlar.cinsiyet ? cinsiyetKizMi(varsayilanlar.cinsiyet) : null;
  const seciliTurler = String(varsayilanlar.mangaTuru || '')
    .split(/[\/,]/).map(t => t.trim().toLowerCase()).filter(Boolean);

  const isimInput = new TextInputBuilder()
    .setCustomId('kayit_isim')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Kenji, Alya, Zoro... ne denmesini istersen')
    .setMinLength(2)
    .setMaxLength(24)
    .setRequired(true);
  if (varsayilanlar.isim) isimInput.setValue(varsayilanlar.isim.slice(0, 24));

  const yolSecim = new StringSelectMenuBuilder()
    .setCustomId('kayit_cinsiyet')
    .setPlaceholder('Yolunu seç')
    .setRequired(true)
    .addOptions(
      { label: 'Samuray', description: 'Erkek • Gölge Samurayı rolü', value: 'Erkek (Samuray)', emoji: '🗡️', default: kizMi === false },
      { label: 'Kunoichi', description: 'Kız • Gölge Kunoichisi rolü', value: 'Kız (Kunoichi)', emoji: '🌸', default: kizMi === true }
    );

  const yasSecim = new StringSelectMenuBuilder()
    .setCustomId('kayit_yas')
    .setPlaceholder('Yaş aralığın (istersen boş bırak)')
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions(YAS_ARALIKLARI.map(y => ({ label: y, value: y, default: varsayilanlar.yas === y })));

  const turSecim = new StringSelectMenuBuilder()
    .setCustomId('kayit_turler')
    .setPlaceholder('Sevdiğin türler (en fazla 4)')
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(4)
    .addOptions(MANGA_TURLERI.map(t => ({
      label: t.ad, value: t.ad, emoji: t.emoji, default: seciliTurler.includes(t.ad.toLowerCase())
    })));

  const hakkindaInput = new TextInputBuilder()
    .setCustomId('kayit_hakkinda')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Örn: İzmir\'denim, Berserk okurum, Guts benim adamım. Çizim yaparım, oyun severim.')
    .setMaxLength(400)
    .setRequired(false);
  if (varsayilanlar.hakkinda) hakkindaInput.setValue(varsayilanlar.hakkinda.slice(0, 400));

  return new ModalBuilder()
    .setCustomId('kage_kayit_modal')
    .setTitle('⛩️ Kage Kalesi • Kimlik Mührü')
    .addLabelComponents(
      new LabelBuilder().setLabel('Sana ne diyelim?').setTextInputComponent(isimInput),
      new LabelBuilder().setLabel('Yolun').setDescription('Rolün ve takma adının simgesi buna göre verilir.').setStringSelectMenuComponent(yolSecim),
      new LabelBuilder().setLabel('Yaşın').setStringSelectMenuComponent(yasSecim),
      new LabelBuilder().setLabel('Sevdiğin manga / anime türleri').setStringSelectMenuComponent(turSecim),
      new LabelBuilder()
        .setLabel('Kendinden biraz bahset')
        .setDescription('Ne okursun, kimi seversin, neyle uğraşırsın... Kage okur ve seni tanır.')
        .setTextInputComponent(hakkindaInput)
    );
}

function secimDegerleri(fields, customId) {
  try { return fields.getStringSelectValues(customId) || []; } catch { return []; }
}

function metinDegeri(fields, customId) {
  try { return (fields.getTextInputValue(customId) || '').trim(); } catch { return ''; }
}

/**
 * Kayıt modalının gönderimini kayitIsleminiTamamla'nın beklediği biçime çevirir.
 * Eski beş kutulu modal hâlâ açık kalmış biri gönderirse onun alanları da okunur.
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
export function kayitModalVerileriniOku(interaction) {
  const f = interaction.fields;
  const yolSecimi = secimDegerleri(f, 'kayit_cinsiyet')[0];
  return {
    isim: metinDegeri(f, 'kayit_isim') || metinDegeri(f, 'kayit_isim_yas'),
    cinsiyet: yolSecimi || metinDegeri(f, 'kayit_cinsiyet'),
    yas: secimDegerleri(f, 'kayit_yas')[0] || '',
    mangaTuru: secimDegerleri(f, 'kayit_turler').join(' / ') || metinDegeri(f, 'kayit_manga_turu'),
    hakkinda: metinDegeri(f, 'kayit_hakkinda'),
    karakter: metinDegeri(f, 'kayit_karakter'),
    yemin: metinDegeri(f, 'kayit_yemin')
  };
}

function jsonAyikla(metin) {
  const parca = String(metin || '').match(/\{[\s\S]*\}/);
  if (!parca) return null;
  try { return JSON.parse(parca[0]); } catch { return null; }
}

/**
 * "Kendinden bahset" metnini yapay zekaya okutur: ruh karakteri, motto, ilgi alanları,
 * kısa özet, kişiye özel karşılama ve sunucu sahibinin bilmesi gereken bir şey varsa o.
 * Yapay zeka cevap vermezse kayıt yine tamamlanır, yalnız bu alanlar boş kalır.
 */
async function hakkindaYorumla(hakkinda, { isim, yolAdi, yas, mangaTuru, userId }) {
  const prompt =
    `Yeni üye kaydı. Ad: ${isim}. Yol: ${yolAdi}. Yaş aralığı: ${yas || 'belirtmedi'}. Sevdiği türler: ${mangaTuru || 'belirtmedi'}.\n` +
    `Kendini şöyle anlattı:\n"""${hakkinda}"""\n\n` +
    'Sadece şu JSON\'u döndür:\n' +
    '{"karakter":"anlattığından çıkan, onu en iyi yansıtan tek bir anime/manga karakteri (kendisi söylediyse o)",' +
    '"motto":"ona yakışan, en fazla 8 kelimelik kısa bir samuray mottosu",' +
    '"ilgiAlanlari":["en fazla 5 kısa ilgi alanı"],' +
    '"favoriMangalar":["adını andığı manga/animeler"],' +
    '"ozet":"onu tanıtan tek cümle, üçüncü şahıs",' +
    '"selam":"ona doğrudan hitap eden, anlattığı bir ayrıntıya değinen 1-2 cümlelik sıcak karşılama",' +
    '"sahibeNot":"sunucu sahibinin bilmesi işine yarayacak bir şey varsa (çizer, yazılımcı, çevirmen, mod olmak istiyor, iş birliği, şikayet, yardım ihtiyacı) tek cümle; yoksa boş string"}';

  const istek = akilliAiUret({
    prompt,
    system: 'Kage-95 sunucusunun kayıt görevlisi Kage\'sin. Kısa, samimi ve saygılı yazarsın. Aile, din, dil veya ırk hakkında asla aşağılayıcı bir şey söylemezsin. Sadece istenen JSON\'u döndürürsün.',
    gorevTipi: 'ozel_baglam',
    userId,
    userName: isim
  });
  const zamanAsimi = new Promise(resolve => setTimeout(() => resolve(null), AI_SURE_SINIRI_MS));
  const sonuc = await Promise.race([istek.catch(() => null), zamanAsimi]);
  const veri = jsonAyikla(sonuc?.metin);
  if (!veri) return null;

  const kisa = (deger, sinir) => (typeof deger === 'string' ? deger.replace(/["\n]/g, ' ').trim().slice(0, sinir) : '');
  const liste = deger => (Array.isArray(deger) ? deger.map(x => kisa(x, 40)).filter(Boolean).slice(0, 5) : []);
  return {
    karakter: kisa(veri.karakter, 50),
    motto: kisa(veri.motto, 100),
    ilgiAlanlari: liste(veri.ilgiAlanlari),
    favoriMangalar: liste(veri.favoriMangalar),
    ozet: kisa(veri.ozet, 250),
    selam: kisa(veri.selam, 300),
    sahibeNot: kisa(veri.sahibeNot, 250)
  };
}
/**
 * Kayıt kapısı kanallarına kurulacak butonlu görsel paneli hazırlar
 * @returns {{ embed: import('discord.js').EmbedBuilder, row: ActionRowBuilder }}
 */
export function kayitPaneliKartiOlustur() {
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';

  const embed = kageEmbed({
    baslik: '⛩️ KAGE KALESİ • OTOMATİK GİRİŞ & KAYIT KAPISI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**Kage-95** manga, anime ve bağımsız oyun kalesine hoş geldiniz!\n\n` +
      `Kalenin iç odalarına, anime/manga tartışmalarına, ses meclislerine ve klan yapay zekasına katılmak için aşağıdaki **Mührü Bas & Kayıt Ol** butonuna basarak karakter kaydınızı tamamlayın.\n\n` +
      `🎎 **Kayıt Sistemi Neleri Belirler?**\n` +
      `• 🌸 **Kız Üyeler İçin:** \`Gölge Kunoichisi\` rütbesi, pembe tema ve özel kunoichi çıkartmaları.\n` +
      `• 🗡️ **Erkek Üyeler İçin:** \`Gölge Samurayı\` rütbesi, mavi tema ve samuray onur çıkartmaları.\n` +
      `• 📖 **Ortak Ayrıcalıklar:** \`⚔️ Shinobi\` klan rütbesi ve \`📖 Manga Okuru\` erişimi.\n` +
      `• 🥷 **Ruh Karakteri:** Seni yansıtan anime kahramanı Kage AI hafızasına işlenir!\n` +
      `• 💰 **Hoş Geldin Ödülü:** Her kayıt ve profil yenilemede cüzdanına \`+150 Ryo\` aktarılır!\n\n` +
      `*Mührünü bas, karakter yolunu seç ve gölgelerin arasındaki yerini al!*`,
    footer: `Kage Otomatik Kayıt Motoru • kage95.com`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kage_kayit_ol_btn')
      .setLabel('Mührü Bas & Kayıt Ol')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setCustomId('kage_profil_guncelle_btn')
      .setLabel('Profilimi Yenile')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('kage_kurallar_btn')
      .setLabel('Klan Kuralları')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📜'),
    new ButtonBuilder()
      .setLabel('Manga Oku')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN)
  );

  return { embed, row };
}

/**
 * Kayıt veya profil güncelleme işlemini eksiksiz şekilde yürütür
 * @param {import('discord.js').ModalSubmitInteraction|import('discord.js').ChatInputCommandInteraction} interaction 
 * @param {Object} veriler { isim, yas, hakkinda, isimYas, cinsiyet, mangaTuru, karakter, yemin, hedefUye }
 */
export async function kayitIsleminiTamamla(interaction, veriler) {
  const guild = interaction.guild;
  const member = veriler.hedefUye || interaction.member;

  const isim = (veriler.isim || veriler.isimYas || member.displayName).trim();
  const yas = (veriler.yas || '').trim();
  const hakkinda = (veriler.hakkinda || '').replace(/"/g, "'").replace(/\s+/g, ' ').trim();
  const rawIsimYas = yas ? `${isim} (${yas})` : isim;
  const rawCinsiyet = (veriler.cinsiyet || 'Erkek').trim();
  const mangaTuru = (veriler.mangaTuru || 'Genel').trim();

  const isFemale = cinsiyetKizMi(rawCinsiyet);
  const yolAdi = isFemale ? 'Gölge Kunoichisi' : 'Gölge Samurayı';
  const prefix = isFemale ? '🌸 ' : '🗡️ ';

  // Kullanıcı kendinden bahsettiyse boş kalan karakter ve yemini yapay zeka doldurur.
  const yorum = hakkinda
    ? await hakkindaYorumla(hakkinda, { isim, yolAdi, yas, mangaTuru, userId: member.id })
    : null;
  const karakter = (veriler.karakter || yorum?.karakter || 'Gölge Savaşçısı').trim();
  const yemin = (veriler.yemin || yorum?.motto || 'Kılıcım klanıma emanettir').trim();

  // 1. Yeni Takma Adı Biçimlendir
  let temizIsim = isim.replace(/[🌸🗡️]/g, '').trim();
  let yeniNick = `${prefix}${temizIsim}`;
  if (yeniNick.length > 32) yeniNick = yeniNick.slice(0, 32);

  try {
    await member.setNickname(yeniNick).catch(() => {});
  } catch {}

  // 2. Rolleri Bul veya Otomatik İnşa Et
  const botMember = await guild.members.fetchMe().catch(() => null);
  const botCanManageRoles = botMember?.permissions?.has?.('ManageRoles');

  let genderRole = null;
  let opposingRole = null;
  const ayar = sunucuAyarGetir(guild.id) || {};
  const roller = guild.roles.cache;
  let shinobiRole = ayarliVeyaBul(roller, ayar.shinobiRolId, r => r.name.includes('Shinobi') || r.name.includes('Kayıtlı'));
  let mangaRole = ayarliVeyaBul(roller, ayar.mangaOkuruRolId, r => r.name.includes('Manga Okuru'));
  let roninRole = ayarliVeyaBul(roller, ayar.roninRolId || ayar.otoRolId, r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));
  const kunoichiRole = ayarliVeyaBul(roller, ayar.kunoichiRolId, r => r.name.includes('Kunoichi'));
  const samurayRole = ayarliVeyaBul(roller, ayar.samurayRolId, r => r.name.includes('Gölge Samurayı'));
  // Ryo ödülü yalnız ilk kayıtta verilir; profil yenilemek para kazandırmaz.
  const zatenKayitli = !!(shinobiRole && hasInCache(member.roles.cache, shinobiRole.id));

  if (isFemale) {
    genderRole = kunoichiRole;
    opposingRole = samurayRole;

    // Rol yoksa otomatik oluştur
    if (!genderRole && botCanManageRoles) {
      try {
        genderRole = await guild.roles.create({
          name: '🌸 Gölge Kunoichisi',
          color: 0xff66b2,
          hoist: true,
          mentionable: true,
          reason: 'Kage Otomatik Kayıt Motoru'
        });
      } catch {}
    }
  } else {
    genderRole = samurayRole;
    opposingRole = kunoichiRole;

    // Rol yoksa otomatik oluştur
    if (!genderRole && botCanManageRoles) {
      try {
        genderRole = await guild.roles.create({
          name: '🗡️ Gölge Samurayı',
          color: 0x5c6bc0,
          hoist: true,
          mentionable: true,
          reason: 'Kage Otomatik Kayıt Motoru'
        });
      } catch {}
    }
  }

  // Rol Atamaları
  try {
    if (genderRole) await member.roles.add(genderRole).catch(() => {});
    if (opposingRole && hasInCache(member.roles.cache, opposingRole.id)) {
      await member.roles.remove(opposingRole).catch(() => {});
    }
    if (shinobiRole) await member.roles.add(shinobiRole).catch(() => {});
    if (mangaRole) await member.roles.add(mangaRole).catch(() => {});
    if (roninRole && hasInCache(member.roles.cache, roninRole.id)) {
      await member.roles.remove(roninRole).catch(() => {});
    }
  } catch (err) {
    console.warn('[KayitServisi] Rol atama uyarısı:', err.message);
  }

  // 3. Ekonomi Başlangıç / Yenileme Bonusu (+150 Ryo)
  const odul = zatenKayitli ? 0 : 150;
  const yeniRyo = odul ? ryoEkle(member.id, odul, 'kayıt ödülü') : bakiyeGetir(member.id).ryo;

  // 4. Kage AI Derin Hafızasına Kalıcı Olarak Kaydet!
  const hafizaNotu = `Karakter Yolu: ${yolAdi} (${isFemale ? 'Kız' : 'Erkek'}), İsim/Yaş: ${rawIsimYas}` +
    (yas ? `, Yaş: ${yas}` : '') +
    `, Favori Türü: ${mangaTuru}, Ruh Karakteri: ${karakter}, Yemin: "${yemin}"` +
    (hakkinda ? `, Hakkında: "${hakkinda}"` : '');
  kullaniciNotuEkle(member.id, member.displayName, hafizaNotu);
  if (yorum) {
    profilGuncelle(member.id, {
      kisaOzet: yorum.ozet || undefined,
      ilgiAlanlari: yorum.ilgiAlanlari,
      favoriMangalar: yorum.favoriMangalar
    });
    if (yorum.sahibeNot) {
      sahibeBildir(guild, `📝 kayıttan not • ${member} (${isim})\n> ${yorum.sahibeNot}`).catch(() => {});
    }
  }

  // 5. Uygun Piksel Çıkartmasını Hazırla
  const stickerPath = isFemale
    ? path.join(STICKERS_DIR, 'kunoichi/kage_zafer.png')
    : path.join(STICKERS_DIR, 'kage_zafer.png');

  const files = [];
  const stickerVar = fs.existsSync(stickerPath);
  if (stickerVar) {
    files.push(new AttachmentBuilder(stickerPath, { name: 'kayit_zafer.png' }));
  }

  // 6. Kimlik Kartı: önce Kage'nin kişiye özel selamı, altında kısa künye
  const kunye = [
    `${isFemale ? '🌸' : '🗡️'} **${yolAdi}** • \`${yeniNick}\`${yas ? ` • ${yas}` : ''}`,
    `📖 ${mangaTuru}`,
    `🥷 ${karakter}`,
    `📜 *${yemin}*`,
    odul ? `💰 +${odul} Ryo • bakiye ${yeniRyo}` : `💰 bakiye ${yeniRyo}`,
    dogumGunuGetir(member.id) ? null : '-# 🎂 `/dogum-gunu ayarla` yaz, o gün Kage seni kutlasın ve Ryo hediye etsin'
  ].filter(Boolean).join('\n');
  const embed = kageEmbed({
    baslik: isFemale ? '🌸 Kunoichi mührü basıldı' : '🗡️ Samuray mührü basıldı',
    renk: isFemale ? 0xff66b2 : TEMA.RENKLER.BASARI,
    aciklama: `${yorum?.selam || `Hoş geldin ${isim}. Kale seni tanıdı.`}\n\n${kunye}` +
      (yorum?.ilgiAlanlari?.length ? `\n\n-# Kage seni şöyle tanıdı: ${yorum.ilgiAlanlari.join(' • ')}` : ''),
    thumbnail: stickerVar ? 'attachment://kayit_zafer.png' : member.user.displayAvatarURL({ dynamic: true }),
    footer: `Kage-95 Kayıt • ${guild.name}`
  });

  // Hızlı Aksiyon Butonları
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kage_profil_guncelle_btn')
      .setLabel('Bilgileri Güncelle')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('kage_kurallar_btn')
      .setLabel('Klan Kuralları')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📜'),
    new ButtonBuilder()
      .setLabel('Manga Oku')
      .setURL(process.env.SITE_URL || 'https://kage95.com')
      .setStyle(ButtonStyle.Link)
      .setEmoji('📖')
  );

  // 7. Kayıt Log Kanalına Bildir
  const logKanal = ayarliVeyaBul(guild.channels.cache, ayar.kayitLogKanalId || ayar.modLogKanalId, c => (c.isTextBased ? c.isTextBased() : true) && (c.name.includes('kayıt-log') || c.name.includes('kayit-log') || c.name.includes('mod-log')));
  if (logKanal) {
    logKanal.send({
      content: `📝 **[KAYIT/GÜNCELLEME]** ${member.user.tag} (${member.id}) -> **${yolAdi}** olarak kaydedildi. [Ad/Yaş: ${rawIsimYas} | Tür: ${mangaTuru} | Karakter: ${karakter}]`
    }).catch(() => {});
  }

  // 8. Hoş Geldin Kanalında Coşkulu Anons
  const hosgeldinKanal = ayarliVeyaBul(guild.channels.cache, ayar.hosgeldinKanalId, c => (c.isTextBased ? c.isTextBased() : true) && (c.name.includes('yeni-savaşçılar') || c.name.includes('yeni-savascilar') || c.name.includes('hoş-geldin') || c.name.includes('hos-geldin')));
  if (hosgeldinKanal && !zatenKayitli) {
    const anonsEmbed = kageEmbed({
      baslik: isFemale ? '🌸 YENİ BİR KUNOICHI KLANIMIZA KATILDI!' : '🗡️ YENİ BİR SAMURAY KLANIMIZA KATILDI!',
      renk: isFemale ? 0xff66b2 : TEMA.RENKLER.BILGI,
      aciklama: `Kage Kalesi kapıları ardına kadar açıldı! Hoş geldin **${member}**!\n\n` +
        `🥷 **Karakter:** ${yolAdi}\n` +
        `⚔️ **Ruh Karakteri:** ${karakter}\n` +
        `📜 **Klan Yemini:** *" ${yemin} "*\n\n` +
        `Kılıcın keskin, bahtın açık olsun!`,
      thumbnail: member.user.displayAvatarURL({ dynamic: true })
    });
    // Anons gittikten sonra aynı türleri seven eski bir üyeyle tanıştırılır.
    hosgeldinKanal.send({ embeds: [anonsEmbed] })
      .then(() => yeniUyeyiTanistir(guild, member, turListesi(mangaTuru), hosgeldinKanal))
      .catch(() => {});
  }
  if (!zatenKayitli) kayitOlayiKaydet(guild.id, member.id, turListesi(mangaTuru));

  return { embed, files, row };
}
