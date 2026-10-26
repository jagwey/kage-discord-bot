import { yuklemeDurumu } from './stickerServisi.js';

// Sohbet botu ve yapay zeka (Veziri) aynı canlı sunucu bilgisini bu servisten okur.
// Böylece iki taraf birbirine bilgi aktarabilir: biri neyi biliyorsa diğeri de bilir.

const ETIKET = { savas: 'Savaş', cay: 'Çay', ofke: 'Öfke', zafer: 'Zafer', para: 'Para', sevgi: 'Sevgi', dusunce: 'Düşünce' };

function gunOnce(ts) {
  if (!ts) return '?';
  const gun = Math.floor((Date.now() - ts) / 86_400_000);
  return gun <= 0 ? 'bugün' : `${gun} gün önce`;
}

/** Kage'nin sunucuya yüklediği sticker/emoji kayıtları, okunur adlarla. */
export function kayitliKageStickerlari(guild) {
  const kayit = yuklemeDurumu(guild.id);
  const liste = [];
  for (const [anahtar, v] of Object.entries(kayit)) {
    const [tur, duygu] = anahtar.split('_');
    const ad = `${tur === 'kunoichi' ? 'Kunoichi' : 'Kage'} ${ETIKET[duygu] || duygu}`;
    if (v.stickerId && guild.stickers?.cache?.has(v.stickerId)) liste.push({ ad, tur: 'sticker' });
    else if (v.emojiId) liste.push({ ad, tur: 'emoji' });
  }
  return liste;
}

/** Yapılandırılmış sunucu verisi (araçlar ve sohbet botu için). */
export function sunucuOzetiVeri(guild, { yeniUye = 5 } = {}) {
  const uyeler = guild.members?.cache ? [...guild.members.cache.values()] : [];
  const gercekUyeler = uyeler.filter(m => !m.user.bot);
  const yeniler = [...gercekUyeler]
    .filter(m => m.joinedTimestamp)
    .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
    .slice(0, yeniUye)
    .map(m => ({ ad: m.displayName, katildi: gunOnce(m.joinedTimestamp) }));

  const yoneticiler = gercekUyeler
    .filter(m => m.permissions?.has('Administrator'))
    .map(m => m.displayName)
    .slice(0, 8);

  const kanallar = guild.channels?.cache ? [...guild.channels.cache.values()] : [];
  const metinKanallari = kanallar.filter(c => c.isTextBased?.() && !c.isThread?.()).map(c => c.name);
  const sesKanallari = kanallar.filter(c => c.isVoiceBased?.()).map(c => c.name);
  const roller = guild.roles?.cache
    ? [...guild.roles.cache.values()].filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).map(r => r.name)
    : [];

  return {
    ad: guild.name,
    uyeSayisi: guild.memberCount,
    cevrimici: uyeler.filter(m => m.presence && m.presence.status !== 'offline').length,
    yeniUyeler: yeniler,
    sahip: guild.members?.cache?.get(guild.ownerId)?.displayName || null,
    yoneticiler,
    metinKanallari,
    sesKanallari,
    roller,
    boost: { seviye: guild.premiumTier || 0, sayi: guild.premiumSubscriptionCount || 0 },
    sunucuStickerlari: guild.stickers?.cache ? [...guild.stickers.cache.values()].map(s => s.name) : [],
    sunucuEmojileri: guild.emojis?.cache ? [...guild.emojis.cache.values()].map(e => e.name) : [],
    kageStickerlari: kayitliKageStickerlari(guild)
  };
}

/** Kısa, tek parça metin: sistem istemine ve sohbet botuna konur. */
export function sunucuOzetiMetni(guild, { ayrintili = false } = {}) {
  const v = sunucuOzetiVeri(guild, { yeniUye: ayrintili ? 8 : 4 });
  const satirlar = [
    `Sunucu: ${v.ad}, ${v.uyeSayisi} üye${v.cevrimici ? ` (${v.cevrimici} çevrimiçi)` : ''}, boost seviye ${v.boost.seviye}.`
  ];
  if (v.sahip) satirlar.push(`Sahip: ${v.sahip}.`);
  if (v.yeniUyeler.length) satirlar.push(`Yeni gelenler: ${v.yeniUyeler.map(u => `${u.ad} (${u.katildi})`).join(', ')}.`);
  if (ayrintili) {
    if (v.yoneticiler.length) satirlar.push(`Yöneticiler: ${v.yoneticiler.join(', ')}.`);
    satirlar.push(`Metin kanalları: ${v.metinKanallari.slice(0, 40).join(', ')}.`);
    if (v.sesKanallari.length) satirlar.push(`Ses kanalları: ${v.sesKanallari.slice(0, 15).join(', ')}.`);
    satirlar.push(`Roller: ${v.roller.slice(0, 30).join(', ')}.`);
    if (v.sunucuEmojileri.length) satirlar.push(`Emojiler: ${v.sunucuEmojileri.slice(0, 40).join(', ')}.`);
  } else {
    satirlar.push(`${v.metinKanallari.length} metin, ${v.sesKanallari.length} ses kanalı, ${v.roller.length} rol.`);
  }
  const stickerlar = [...v.kageStickerlari.map(s => `${s.ad} (${s.tur})`), ...v.sunucuStickerlari.filter(n => !/^(Kage|Kunoichi) /.test(n))];
  satirlar.push(`Atabileceğin stickerlar: ${stickerlar.length ? stickerlar.join(', ') : 'sunucuya yüklenmemiş; sticker_gonder dosya olarak atar'}.`);
  return satirlar.join('\n');
}
