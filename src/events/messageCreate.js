import { Events, PermissionFlagsBits } from 'discord.js';
import { chatBotYanitla, kullaniciKizMi } from '../services/chatBotServisi.js';
import { sunucuAyarGetir } from '../services/veritabaniServisi.js';
import { yardimKartiOlustur } from '../commands/yardim.js';
import { kageyeSor } from '../services/ai/kageBeyin.js';
import { gecmiseEkle } from '../services/ai/konusmaGecmisi.js';
import { otomodKontrol } from '../services/otomodServisi.js';
import { mesajXpEkle } from '../services/seviyeServisi.js';
import { gorevIlerlet } from '../services/gorevServisi.js';
import { duyguEmojisi } from '../services/duyguServisi.js';
import { stickerDuygusuSec, stickerMesajSecenegi } from '../services/stickerServisi.js';
import { aiErisimKontrol, aiSpamKontrol } from '../services/aiErisimServisi.js';
import { kullaniciModelSec, kullaniciModelGetir } from '../services/kageHafizaServisi.js';
import { modelKoduCozumle, DESTEKLENEN_MODELLER } from '../services/aiRouterServisi.js';

export const name = Events.MessageCreate;

// Spoiler anahtar kelimeleri
const SPOILER_IPUCLARI = [
  'öldü', 'ölüyor', 'hain çıktı', 'sonunda öldü', 'finalde', 'bölümün sonunda',
  'aslında hain', 'aslında babası', 'kurtarıyor ama ölüyor', 'kellesi kesiliyor'
];

// Araya girme ayarları
const ARAYA_GIRME_ACIK = (process.env.KAGE_ARAYA_GIRME || '').toLowerCase() !== 'kapali';
const ARAYA_GIRME_BEKLEME_MS = 90 * 1000;
const sonAraGirme = new Map(); // kanalId -> zaman
const DUYGU_TEPKI_BEKLEME_MS = 45 * 1000;
const sonDuyguTepkisi = new Map(); // kullaniciId -> zaman

function sohbetKanaliMi(kanalAdi = '') {
  const ad = kanalAdi.toLowerCase();
  return ad.includes('sohbet') || ad.includes('genel') || ad.includes('chat');
}

function aiKanaliMi(kanal, aiKanalId) {
  if (aiKanalId && kanal.id === aiKanalId) return true;
  const ad = kanal.name || '';
  return ['gölge-veziri', 'golge-veziri', 'kage-ai', 'ai-gölge-veziri', 'yapay-zeka'].some(k => ad.includes(k));
}

// Canlı Admin AI İzleme Bildirimi (Admin başka biri konuşurken de hangi motorun çalıştığını görür)
function adminAiLog(message, saglayici, isAi, soru) {
  try {
    const ayarlar = sunucuAyarGetir(message.guild.id);
    const hedefKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;
    if (!hedefKanalId) return;
    if (message.channel.id === hedefKanalId) return;

    const adminKanal = message.guild.channels.cache.get(hedefKanalId);
    if (adminKanal && adminKanal.isTextBased()) {
      const kisaSoru = soru.length > 90 ? soru.slice(0, 87) + '...' : soru;
      adminKanal.send({
        content: `📡 **[AI İZLEME]** <#${message.channel.id}> kanalında **${message.author.username}** konuştu.\n` +
          `↳ **Soru:** *"${kisaSoru}"*\n` +
          `↳ **Cevaplayan:** \`${saglayici}\` ${isAi ? '🤖 (Yapay Zeka)' : '📜 (Kural Tabanlı Bot)'}`,
        allowedMentions: { parse: [] }
      }).catch(() => null);
    }
  } catch (err) {
    console.warn('[AdminAiLog]', err.message);
  }
}

function arayaGirsinMi(message, metin) {
  if (!ARAYA_GIRME_ACIK || metin.length < 4) return false;
  if (!sohbetKanaliMi(message.channel.name)) return false;
  if (Date.now() - (sonAraGirme.get(message.channel.id) || 0) < ARAYA_GIRME_BEKLEME_MS) return false;

  let olasilik = 0.02;
  if (/kage/i.test(metin)) olasilik = 0.9;
  else if (metin.includes('?')) olasilik = 0.15;
  return Math.random() < olasilik;
}

function parcala(metin, limit = 1900) {
  const parcalar = [];
  let kalan = metin;
  while (kalan.length > limit) {
    let kes = kalan.lastIndexOf('\n', limit);
    if (kes < limit / 2) kes = kalan.lastIndexOf(' ', limit);
    if (kes < limit / 2) kes = limit;
    parcalar.push(kalan.slice(0, kes));
    kalan = kalan.slice(kes).trimStart();
  }
  if (kalan) parcalar.push(kalan);
  return parcalar;
}

async function cevabiGonder(message, sonuc, yanitla = true) {
  const parcalar = parcala(sonuc.cevap);
  let ilk = true;
  for (const p of parcalar) {
    const secenek = { content: p, allowedMentions: { parse: [], repliedUser: false } };
    if (ilk && yanitla) await message.reply(secenek).catch(() => message.channel.send(secenek).catch(() => null));
    else await message.channel.send(secenek).catch(() => null);
    ilk = false;
  }
  for (const o of sonuc.onaylar || []) {
    await message.channel.send({
      content: o.metin,
      components: [o.row],
      allowedMentions: { parse: [], repliedUser: false }
    }).catch(() => null);
  }
}

// Cevaptan sonra duyguya/öğretilen kurala uygun sticker gönderir (gerçek sunucu stickerı, yoksa dosya).
async function stickerGonder(message, metin, rastgele = 0.25) {
  try {
    const duygu = stickerDuygusuSec(message.guild.id, message.author.id, metin, { rastgele });
    const tur = kullaniciKizMi(message.author, message.member, metin) ? 'kunoichi' : 'erkek';
    const secenek = stickerMesajSecenegi(message.guild.id, tur, duygu);
    if (!secenek) return;
    await message.channel.send({ ...secenek, allowedMentions: { parse: [], repliedUser: false } }).catch(() => null);
  } catch (err) {
    console.warn('[Sticker]', err.message);
  }
}

// "stickerleri at", "eklediğin tüm çıkartmaları ver" gibi toplu istekler (yapay zeka kapalıyken de çalışır).
const TUM_STICKER_ISTEGI = /(sticker|çıkartma|cikartma)\p{L}*.*\b(at|ver|göster|gonder|gönder)|\b(tüm|hepsini|eklediğin)\b.*(sticker|çıkartma)/iu;

async function tumStickerlariGonder(message) {
  const tur = kullaniciKizMi(message.author, message.member, '') ? 'kunoichi' : 'erkek';
  for (const duygu of ['savas', 'cay', 'ofke', 'zafer', 'para', 'sevgi', 'dusunce']) {
    const secenek = stickerMesajSecenegi(message.guild.id, tur, duygu);
    if (secenek) await message.channel.send({ ...secenek, allowedMentions: { parse: [], repliedUser: false } }).catch(() => null);
  }
}

/**
 * Mesaj oluşturulduğunda tetiklenir (metin komutları, birleşik Kage yapay zekası)
 * @param {import('discord.js').Message} message
 */
export async function execute(message) {
  // Botları ve DM'leri yoksay
  if (message.author.bot || !message.guild) return;

  // Otomatik moderasyon: yasaklı kelime içeren mesaj silinir ve işlem burada biter.
  if (await otomodKontrol(message).catch(() => false)) return;

  // Sohbet XP'si: bekleme süresi ve kısa mesaj kontrolü serviste yapılır.
  try {
    const xp = mesajXpEkle(message.guild.id, message.author.id, message.content);
    if (xp) gorevIlerlet(message.author.id, 'mesaj');
    if (xp?.seviyeAtladi) {
      await message.channel.send({
        content: `⬆️ ${message.author} **Seviye ${xp.seviye}** oldu! Ödül: ${xp.odul} Ryo.`,
        allowedMentions: { users: [message.author.id] }
      }).catch(() => null);
    }
  } catch (err) {
    console.warn('[Seviye]', err.message);
  }

  // Duygu tepkisi: belirgin duygulu mesaja emoji birakir; kullanici basina bekleme ile spam onlenir.
  if (message.content.length >= 4 && Date.now() - (sonDuyguTepkisi.get(message.author.id) || 0) > DUYGU_TEPKI_BEKLEME_MS) {
    const emoji = duyguEmojisi(message.content);
    if (emoji && Math.random() < 0.6) {
      sonDuyguTepkisi.set(message.author.id, Date.now());
      message.react(emoji).catch(() => null);
    }
  }

  const contentLower = message.content.trim().toLowerCase();

  // 1. Akıllı Spoiler Koruması (#manga-tartışma kanalı için)
  if (message.channel.name && message.channel.name.includes('manga-tartışma')) {
    if (!message.content.includes('||')) {
      const spoilerMi = SPOILER_IPUCLARI.some(kelime => contentLower.includes(kelime));
      if (spoilerMi) {
        try {
          const orijinalMesaj = message.content;
          await message.delete();
          await message.channel.send({
            content: `🛡️ **[OTOMATİK SPOILER KORUMASI]** ${message.author} tarafından paylaşılan mesaj potansiyel spoiler içerdiği için korumaya alındı:\n\n||${orijinalMesaj}||`
          });
          return;
        } catch (err) {
          console.warn('[SpoilerKorumasi] Mesaj sansürlenemedi:', err.message);
        }
      }
    }
  }

  // 2. Klasik metin tabanlı yardım komutları
  if (['!help', '.help', './help', '!yardim', '.yardim', 'k!help'].includes(contentLower)) {
    const { embed, row } = yardimKartiOlustur();
    return message.reply({ embeds: [embed], components: [row] }).catch(() => null);
  }

  // 3. Sohbet Ryo Kazanımı
  if (Math.random() < 0.25) {
    try {
      const { ryoEkle, sohbetOdulUygunMu } = await import('../services/ekonomiServisi.js');
      // Kullanıcı başına 30 sn bekleme: spam ile Ryo çiftliği yapılamaz.
      if (sohbetOdulUygunMu(message.author.id)) ryoEkle(message.author.id, 1);
    } catch {}
  }

  const botUser = message.client.user;
  const ayarlar = sunucuAyarGetir(message.guild.id);
  const aiKanalId = ayarlar.aiYonetimKanalId || process.env.AI_ADMIN_CHANNEL_ID;

  // 4. Tetikleyiciler
  const botMention = new RegExp(`<@!?${botUser.id}>`, 'g');
  const kageMatch = message.content.match(/^kage([,\s:!]+(.*)|$)/i);
  const aiMatch = message.content.match(/^(ai|aı|aİ|Aİ)([,\s:!]+(.*)|$)/iu);
  const botEtiketlendi = message.mentions.has(botUser) && !message.mentions.everyone;
  const aiKanali = aiKanaliMi(message.channel, aiKanalId);

  let botaYanit = false;
  if (message.reference?.messageId) {
    const ref = await message.fetchReference().catch(() => null);
    botaYanit = ref?.author?.id === botUser.id;
  }

  let metin = message.content.replace(botMention, '').trim();
  if (kageMatch) metin = (kageMatch[2] || '').trim();
  else if (aiMatch) metin = (aiMatch[3] || '').trim();

  const cagrildi = !!kageMatch || !!aiMatch || botEtiketlendi || botaYanit || aiKanali;
  const yazarAdi = message.member?.displayName || message.author.username;

  if (!cagrildi) {
    // Çağrılmadı: sohbet kanallarında geçmişe not et, belki araya gir
    if (!sohbetKanaliMi(message.channel.name) || !message.content.trim()) return;
    gecmiseEkle(message.channel.id, 'user', yazarAdi, message.content.trim());
    if (!arayaGirsinMi(message, message.content.trim())) return;

    sonAraGirme.set(message.channel.id, Date.now());
    try {
      const sonuc = await kageyeSor({
        metin: message.content.trim(), yazarAdi, userId: message.author.id,
        guild: message.guild, channel: message.channel, member: message.member, client: message.client,
        yonetici: false, araGirme: true, gecmiseYaz: false
      });
      if (sonuc.sus || sonuc.hata || sonuc.kota || !sonuc.cevap) {
        sonAraGirme.delete(message.channel.id);
        return;
      }
      await cevabiGonder(message, sonuc, false);
      await stickerGonder(message, message.content.trim(), 0.1);
    } catch (err) {
      console.error('[MessageCreate AraGirme] Hata:', err.message);
    }
    return;
  }

  if (!metin) metin = '(Seni çağırdı ama bir şey yazmadı)';

  // 1. Yetki ve Rol Kontrolü (Yapay zekanın kötüye kullanımını ve yetkisiz erişimi engeller)
  const erisim = aiErisimKontrol(message.member, message.guild, message.client);
  if (!erisim.izin) {
    return message.reply({
      content: erisim.sebep,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }

  // 2. Kötüye Kullanım / Spam Kontrolü (Kullanıcı başına 8 saniye bekleme süresi)
  const spam = aiSpamKontrol(message.author.id, 8, erisim.yetkili);
  if (!spam.izin) {
    return message.reply({
      content: spam.sebep,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }

  const yetkiliMi = erisim.yetkili;

  // 3. Doğal Dille Model Geçişi Tespiti (Örn: "kage groq'a geç", "kage deepseek kullan", "kage otomatik moda geç")
  const modelGecisMatch = metin.match(/\b(groq|gemini|deepseek|openrouter|llama|qwen|pollinations|otomatik|oto|auto)\b.*(?:geç|kullan|ayarla|seç|yap|etkinleştir)/iu)
    || metin.match(/(?:modele|modeli)\s+(groq|gemini|deepseek|openrouter|llama|qwen|pollinations|otomatik|oto|auto)(?:\s+(?:yap|geç|ayarla|seç))?/iu);

  if (modelGecisMatch) {
    const hedefKelime = modelGecisMatch[1];
    const modelKodu = modelKoduCozumle(hedefKelime);
    kullaniciModelSec(message.author.id, modelKodu);
    const modelBilgi = DESTEKLENEN_MODELLER.find(m => m.id === modelKodu) || { ad: modelKodu, emoji: '⚡' };
    
    return message.reply({
      content: `${modelBilgi.emoji} **Zihnimi ${modelBilgi.ad} motoruna bağladım samurayım!**\n` +
        `Ortak hafızamız, hatıralarımız ve kaledeki tüm kayıtların baki kaldı. Artık seninle bu zeka motoru üzerinden konuşacağız. Komut ezberlemene gerek yok, bana ne istersen rahatça söyleyebilirsin!`,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }

  // 4. Anlık Model Belirteci (Örn: "kage [groq]: nasılsın", "kage [deepseek]: bu konuda ne düşünüyorsun")
  const anlikModelMatch = metin.match(/^\[([a-zA-Z0-9_\-]+)\]\s*:\s*(.*)/i);
  if (anlikModelMatch) {
    const anlikModel = modelKoduCozumle(anlikModelMatch[1]);
    metin = anlikModelMatch[2].trim();
    kullaniciModelSec(message.author.id, anlikModel);
  }

  await message.channel.sendTyping().catch(() => null);

  // 5. Doğal Eylem ve Komut Niyeti Tespiti (Komut kullanmayı zorunlu olmaktan çıkarır!)
  // Kullanıcı "şu adamı sustur", "mesajları sil", "bana 100 ryo ver", "kurallara şunu ekle" vb. dediğinde
  const EYLEM_NIYETI = /\b(sustur|mutele|banla|engelle|at\b|kickle|temizle|sil\b|rol ver|rol al|rol aç|kanal aç|kanal sil|kanal kapat|kural ekle|duyuru yap|bakiye|bakiyem|ryo ver|ryo gönder|yavaş mod|kilit|şunu yap|bunu yap)\b/iu;
  const eylemIstegi = EYLEM_NIYETI.test(metin);

  // Eylem istekleri, doğrudan "ai ..." çağrıları veya AI yönetim kanalındakiler -> Otonom Vezir (kageyeSor)
  const aiyeYonlendir = !!aiMatch || (aiKanali && !kageMatch) || eylemIstegi;

  if (aiyeYonlendir) {
    // 1. OTONOM YAPAY ZEKA VEZİRİ (Fonksiyon çağırma, sunucu yönetimi, analitik)
    try {
      const sonuc = await kageyeSor({
        metin, yazarAdi, userId: message.author.id,
        guild: message.guild, channel: message.channel, member: message.member, client: message.client,
        yonetici: !!yetkiliMi
      });

      if (sonuc.hata === 'anahtar_yok' || (sonuc.hata && !sonuc.cevap)) {
        // AI anahtarı yoksa veya hata verirse ChatBot motoruna düş
        const yanit = await chatBotYanitla(metin, message.author, message.guild, message.member, message);
        const { embed, files, saglayici = 'Kural Tabanlı ChatBot', isAi = false } = yanit;

        if (yetkiliMi) {
          const mevcutFooter = embed.data?.footer?.text || 'Kage-95';
          embed.setFooter({ text: `${mevcutFooter} • ⚙️ Motor: ${saglayici}` });
        }

        await message.reply({ embeds: [embed], files: files || [], allowedMentions: { repliedUser: false } })
          .catch((err) => console.error('[MessageCreate ChatBot Hatası]:', err));

        adminAiLog(message, saglayici, isAi, metin);
        return TUM_STICKER_ISTEGI.test(metin) ? tumStickerlariGonder(message) : stickerGonder(message, metin, 0);
      }

      // Yetkili/Admin ise yanıtın sonuna ince motor etiketini ekle
      if (yetkiliMi && sonuc.cevap) {
        sonuc.cevap += `\n\n-# ⛩️ [Motor: Gemini Otonom Vezir • Yapay Zeka]`;
      }

      await cevabiGonder(message, sonuc);
      await stickerGonder(message, metin, 0.3);

      adminAiLog(message, 'Gemini Otonom Vezir', true, metin);
    } catch (err) {
      console.error('[MessageCreate AI] Hata:', err.message);
      await message.reply({
        content: `❌ Kage Veziri şu an cevap veremiyor: ${err.message}`,
        allowedMentions: { repliedUser: false }
      }).catch(() => null);
    }
  } else {
    // 2. KAGE ETKİLEŞİMLİ CHAT BOT (Piksel Sticker, Hafıza, Profil, Kunoichi/Samuray Persona)
    try {
      const yanit = await chatBotYanitla(metin, message.author, message.guild, message.member, message);
      const { embed, files, saglayici = 'Kural Tabanlı ChatBot', isAi = false } = yanit;

      // Yetkili/Admin ise embed alt bilgisine motor etiketini iliştir
      if (yetkiliMi) {
        const mevcutFooter = embed.data?.footer?.text || 'Kage-95';
        embed.setFooter({ text: `${mevcutFooter} • ⚙️ Motor: ${saglayici}` });
      }

      await message.reply({ embeds: [embed], files: files || [], allowedMentions: { repliedUser: false } })
        .catch((err) => console.error('[MessageCreate ChatBot Hatası]:', err));

      adminAiLog(message, saglayici, isAi, metin);

      if (TUM_STICKER_ISTEGI.test(metin)) {
        await tumStickerlariGonder(message);
      }
    } catch (err) {
      console.error('[MessageCreate ChatBot Hatası]:', err);
      await message.reply({
        content: `⚠️ Kage katanasını kınına sokarken bir aksaklık yaşadı: ${err.message}`,
        allowedMentions: { repliedUser: false }
      }).catch(() => null);
    }
  }
}
