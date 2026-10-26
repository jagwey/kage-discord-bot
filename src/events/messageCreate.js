import { Events, PermissionFlagsBits } from 'discord.js';
import { chatBotYanitla } from '../services/chatBotServisi.js';
import { sunucuAyarGetir } from '../services/veritabaniServisi.js';
import { yardimKartiOlustur } from '../commands/yardim.js';
import { kageyeSor } from '../services/ai/kageBeyin.js';
import { gecmiseEkle } from '../services/ai/konusmaGecmisi.js';
import { otomodKontrol } from '../services/otomodServisi.js';
import { mesajXpEkle } from '../services/seviyeServisi.js';
import { duyguEmojisi } from '../services/duyguServisi.js';

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
    } catch (err) {
      console.error('[MessageCreate AraGirme] Hata:', err.message);
    }
    return;
  }

  if (!metin) metin = '(Seni çağırdı ama bir şey yazmadı)';

  const yetkiliMi =
    message.guild.ownerId === message.author.id ||
    message.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    message.client.application?.owner?.id === message.author.id ||
    (process.env.OWNER_ID && message.author.id === process.env.OWNER_ID);

  await message.channel.sendTyping().catch(() => null);

  try {
    const sonuc = await kageyeSor({
      metin, yazarAdi, userId: message.author.id,
      guild: message.guild, channel: message.channel, member: message.member, client: message.client,
      yonetici: !!yetkiliMi
    });

    if (sonuc.hata === 'anahtar_yok' || (sonuc.hata && !sonuc.cevap)) {
      // Eski sohbet motoruna düş
      const { embed, files } = await chatBotYanitla(metin, message.author, message.guild, message.member, message);
      return message.reply({ embeds: [embed], files: files || [], allowedMentions: { repliedUser: false } })
        .catch((err) => console.error('[MessageCreate ChatBot Hatası]:', err));
    }

    await cevabiGonder(message, sonuc);
  } catch (err) {
    console.error('[MessageCreate AI] Hata:', err.message);
    await message.reply({
      content: `❌ Kage şu an cevap veremiyor: ${err.message}`,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }
}
