import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle } from './ekonomiServisi.js';
import { kullaniciNotuEkle, kullaniciHafizasiGetir } from './kageHafizaServisi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STICKERS_DIR = path.join(__dirname, '../../assets/stickers');

function findInCache(cache, predicate) {
  if (!cache) return null;
  if (typeof cache.find === 'function') return cache.find(predicate);
  const items = cache.values ? Array.from(cache.values()) : Array.isArray(cache) ? cache : [];
  return items.find(predicate) || null;
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
    mangaTuru: '',
    karakter: '',
    yemin: ''
  };

  const hafiza = kullaniciHafizasiGetir(userId);
  if (hafiza?.notlar && Array.isArray(hafiza.notlar)) {
    for (const not of hafiza.notlar) {
      if (not.includes('Kız') || not.includes('Kunoichi')) {
        varsayilanlar.cinsiyet = 'Kız (Kunoichi)';
      } else if (not.includes('Erkek') || not.includes('Samuray')) {
        varsayilanlar.cinsiyet = 'Erkek (Samuray)';
      }

      const adMatch = not.match(/İsim\/Yaş:\s*([^,]+)/i);
      if (adMatch && adMatch[1]) varsayilanlar.isim = adMatch[1].trim();

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
 * Kullanıcıya gösterilecek şık, samuray ve kunoichi temalı detaylı kayıt modalını üretir (5 soru)
 * @param {Object} varsayilanlar 
 * @returns {ModalBuilder}
 */
export function kayitModaliOlustur(varsayilanlar = {}) {
  const modal = new ModalBuilder()
    .setCustomId('kage_kayit_modal')
    .setTitle('⛩️ Kage Kalesi Kayıt & Kimlik Mührü');

  // 1. Soru: Ad & Yaş
  const isimInput = new TextInputBuilder()
    .setCustomId('kayit_isim_yas')
    .setLabel('👤 Adınız / Takma Adınız & Yaşınız')
    .setPlaceholder('Örn: Kenji / 19 (veya Alya / 18, sadece isim de olur)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(32)
    .setRequired(true);

  if (varsayilanlar.isim) isimInput.setValue(varsayilanlar.isim);

  // 2. Soru: Cinsiyet & Karakter Yolu
  const cinsiyetInput = new TextInputBuilder()
    .setCustomId('kayit_cinsiyet')
    .setLabel('🎎 Cinsiyet / Yolunuz (Kız veya Erkek)')
    .setPlaceholder('🌸 Kız (Kunoichi) VEYA 🗡️ Erkek (Samuray)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(25)
    .setRequired(true);

  if (varsayilanlar.cinsiyet) cinsiyetInput.setValue(varsayilanlar.cinsiyet);

  // 3. Soru: Favori Manga/Anime Türü
  const mangaInput = new TextInputBuilder()
    .setCustomId('kayit_manga_turu')
    .setLabel('📖 En Sevdiğiniz Manga / Anime Türü')
    .setPlaceholder('Örn: Shonen, Romantizm, Seinen, Isekai, Psikolojik, Gizem')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(40)
    .setRequired(false);

  if (varsayilanlar.mangaTuru) mangaInput.setValue(varsayilanlar.mangaTuru);

  // 4. Soru: Ruh Karakteri / Usta (Waifu / Husbando)
  const karakterInput = new TextInputBuilder()
    .setCustomId('kayit_karakter')
    .setLabel('🥷 Seni En Çok Yansıtan Karakter / Ustan')
    .setPlaceholder('Örn: Zoro, Mikasa, Guts, Gojo, Frieren, Itachi, Luffy')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(false);

  if (varsayilanlar.karakter) karakterInput.setValue(varsayilanlar.karakter);

  // 5. Soru: Samuray Yemini / Mottosu
  const yeminInput = new TextInputBuilder()
    .setCustomId('kayit_yemin')
    .setLabel('📜 Klan Mottosu / Samuray Yemini')
    .setPlaceholder('Örn: Gölgelerde yürür, klanım için kılıç bilerim!')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(120)
    .setRequired(false);

  if (varsayilanlar.yemin) yeminInput.setValue(varsayilanlar.yemin);

  modal.addComponents(
    new ActionRowBuilder().addComponents(isimInput),
    new ActionRowBuilder().addComponents(cinsiyetInput),
    new ActionRowBuilder().addComponents(mangaInput),
    new ActionRowBuilder().addComponents(karakterInput),
    new ActionRowBuilder().addComponents(yeminInput)
  );

  return modal;
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
 * @param {Object} veriler { isimYas, cinsiyet, mangaTuru, karakter, yemin, hedefUye }
 */
export async function kayitIsleminiTamamla(interaction, veriler) {
  const guild = interaction.guild;
  const member = veriler.hedefUye || interaction.member;

  const rawIsimYas = (veriler.isimYas || member.displayName).trim();
  const rawCinsiyet = (veriler.cinsiyet || 'Erkek').trim();
  const mangaTuru = (veriler.mangaTuru || 'Genel').trim();
  const karakter = (veriler.karakter || 'Gölge Savaşçısı').trim();
  const yemin = (veriler.yemin || 'Kılıcım klanıma emanettir').trim();

  const isFemale = cinsiyetKizMi(rawCinsiyet);
  const yolAdi = isFemale ? 'Gölge Kunoichisi' : 'Gölge Samurayı';
  const prefix = isFemale ? '🌸 ' : '🗡️ ';

  // 1. Yeni Takma Adı Biçimlendir
  let temizIsim = rawIsimYas.replace(/[🌸🗡️]/g, '').trim();
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
  let shinobiRole = findInCache(guild.roles.cache, r => r.name.includes('Shinobi') || r.name.includes('Kayıtlı'));
  let mangaRole = findInCache(guild.roles.cache, r => r.name.includes('Manga Okuru'));
  let roninRole = findInCache(guild.roles.cache, r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));

  if (isFemale) {
    genderRole = findInCache(guild.roles.cache, r => r.name.includes('Kunoichi'));
    opposingRole = findInCache(guild.roles.cache, r => r.name.includes('Samurayı') && !r.name.includes('Kunoichi'));

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
    genderRole = findInCache(guild.roles.cache, r => r.name.includes('Gölge Samurayı') || (r.name.includes('Samuray') && !r.name.includes('Kunoichi')));
    opposingRole = findInCache(guild.roles.cache, r => r.name.includes('Kunoichi'));

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
  const yeniRyo = ryoEkle(member.id, 150);

  // 4. Kage AI Derin Hafızasına Kalıcı Olarak Kaydet!
  const hafizaNotu = `Karakter Yolu: ${yolAdi} (${isFemale ? 'Kız' : 'Erkek'}), İsim/Yaş: ${rawIsimYas}, Favori Türü: ${mangaTuru}, Ruh Karakteri: ${karakter}, Yemin: "${yemin}"`;
  kullaniciNotuEkle(member.id, member.displayName, hafizaNotu);

  // 5. Uygun Piksel Çıkartmasını Hazırla
  const stickerPath = isFemale
    ? path.join(STICKERS_DIR, 'kunoichi/kage_zafer.png')
    : path.join(STICKERS_DIR, 'kage_zafer.png');

  const files = [];
  const stickerVar = fs.existsSync(stickerPath);
  if (stickerVar) {
    files.push(new AttachmentBuilder(stickerPath, { name: 'kayit_zafer.png' }));
  }

  // 6. Şık ve Detaylı Samuray / Kunoichi Kimlik Kartı
  const embed = kageEmbed({
    baslik: isFemale ? '🌸 KUNOICHI MÜHRÜ VE KİMLİK KARTI ONAYLANDI!' : '🗡️ SAMURAY MÜHRÜ VE KİMLİK KARTI ONAYLANDI!',
    renk: isFemale ? 0xff66b2 : TEMA.RENKLER.BASARI,
    aciklama: `Tebrikler **${member}**! Kage Kalesi'ne kaydın başarıyla onaylandı ve mühürlendi!\n\n` +
      `🎎 **Karakter Yolu:** **${yolAdi}** (${isFemale ? 'Kız' : 'Erkek'})\n` +
      `👤 **Sunucu Kimliği:** \`${yeniNick}\`\n` +
      `🥷 **Ruh Karakteri / Usta:** \`${karakter}\`\n` +
      `📖 **Favori Manga Türü:** \`${mangaTuru}\`\n` +
      `📜 **Klan Mottosu:** *" ${yemin} "*\n\n` +
      `🛡️ **Bahşedilen Roller:** ${genderRole || '`' + yolAdi + '`'}, ${shinobiRole || '`Shinobi`'}, ${mangaRole || '`Manga Okuru`'}\n` +
      `💰 **Kese Ödülü:** \`+150 Ryo\` cüzdanına aktarıldı! (Toplam Bakiye: \`${yeniRyo} Ryo\`)\n` +
      `🧠 **Kage AI Entegrasyonu:** Bot ve yapay zeka veziri seni artık bu kimliğinle tanıdı!`,
    thumbnail: stickerVar ? 'attachment://kayit_zafer.png' : member.user.displayAvatarURL({ dynamic: true }),
    footer: `Kage-95 Kayıt ve Kimlik Sistemi • ${guild.name}`
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
  const logKanal = findInCache(guild.channels.cache, c => (c.isTextBased ? c.isTextBased() : true) && (c.name.includes('kayıt-log') || c.name.includes('kayit-log') || c.name.includes('mod-log')));
  if (logKanal) {
    logKanal.send({
      content: `📝 **[KAYIT/GÜNCELLEME]** ${member.user.tag} (${member.id}) -> **${yolAdi}** olarak kaydedildi. [Ad/Yaş: ${rawIsimYas} | Tür: ${mangaTuru} | Karakter: ${karakter}]`
    }).catch(() => {});
  }

  // 8. Hoş Geldin Kanalında Coşkulu Anons
  const hosgeldinKanal = findInCache(guild.channels.cache, c => (c.isTextBased ? c.isTextBased() : true) && (c.name.includes('yeni-savaşçılar') || c.name.includes('yeni-savascilar') || c.name.includes('hoş-geldin') || c.name.includes('hos-geldin')));
  if (hosgeldinKanal) {
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
    hosgeldinKanal.send({ embeds: [anonsEmbed] }).catch(() => {});
  }

  return { embed, files, row };
}
