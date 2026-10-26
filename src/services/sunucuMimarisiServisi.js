import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGuncelle } from './veritabaniServisi.js';

const P = PermissionFlagsBits;
const SEBEP = 'Kage 95 Master Mimarisi';

const OKU = [P.ViewChannel, P.ReadMessageHistory];
const YAZ = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory];

/**
 * Sunucudaki tüm eski kanalları siler (Tam temizlik)
 * @param {import('discord.js').Guild} guild
 * @param {string} haricKanalId
 */
export async function eskiKanallariTemizle(guild, haricKanalId = null) {
  const kanallar = await guild.channels.fetch();
  for (const [id, kanal] of kanallar) {
    if (id === haricKanalId) continue;
    try {
      await kanal.delete('Kage 95 Mimarisi Sıfırlama');
    } catch (err) {
      console.warn(`[Kanal Silme Hatası] ${kanal?.name}:`, err.message);
    }
  }
}

/**
 * Sunucudaki eski silinebilir rolleri temizler
 * @param {import('discord.js').Guild} guild
 */
export async function eskiRolleriTemizle(guild) {
  const roller = await guild.roles.fetch();
  const botMember = await guild.members.fetchMe();
  const botTopRole = botMember.roles.highest;

  for (const [id, rol] of roller) {
    if (rol.name === '@everyone' || rol.managed || rol.comparePositionTo(botTopRole) >= 0) continue;
    try {
      await rol.delete('Kage 95 Rol Sıfırlama');
    } catch (err) {
      console.warn(`[Rol Silme Hatası] ${rol?.name}:`, err.message);
    }
  }
}

/**
 * Rolü anahtar ada göre arar (isim parçası); yoksa oluşturur. Diğer kod roller isim parçasıyla
 * bulunduğu için, eski "Lv. X+" sonekli roller de aynı rol sayılır.
 */
async function rolBulVeyaOlustur(guild, anahtar, ayar) {
  const var_ = guild.roles.cache.find(r => !r.managed && r.name.includes(anahtar));
  if (var_) return var_;
  return guild.roles.create({ ...ayar, reason: SEBEP });
}

/**
 * Kanalı isim parçası ve tipine göre arar; yoksa oluşturur.
 * @returns {Promise<{kanal: import('discord.js').GuildBasedChannel, yeni: boolean}>}
 */
async function kanalBulVeyaOlustur(guild, anahtar, ayar) {
  const tip = ayar.type ?? ChannelType.GuildText;
  const var_ = guild.channels.cache.find(c => c.type === tip && c.name.includes(anahtar));
  if (var_) return { kanal: var_, yeni: false };
  const kanal = await guild.channels.create({ ...ayar, reason: SEBEP });
  return { kanal, yeni: true };
}

/** Rolleri hiyerarşi sırasına dizer; botun en yüksek rolünün hemen altına yerleştirir. */
async function rolSirasiniKur(guild, sirali) {
  try {
    const botMember = await guild.members.fetchMe();
    const tavan = botMember.roles.highest.position;
    const liste = sirali.map((rol, i) => ({ role: rol.id, position: Math.max(1, tavan - 1 - i) }));
    await guild.roles.setPositions(liste);
  } catch (err) {
    console.warn('[Mimari] Rol sıralaması ayarlanamadı:', err.message);
  }
}

function tanitim(baslik, aciklama, renk = TEMA.RENKLER.KAN_KIRMIZISI) {
  return { embeds: [kageEmbed({ baslik, renk, aciklama })] };
}

/**
 * Ultra Kage 95 Punk-Manga & Samuray mimarisini kurar. Tekrar çalıştırılabilir: var olan rol ve
 * kanallar yeniden kullanılır, tanıtım mesajları yalnız yeni açılan kanala gönderilir.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').CommandInteraction} interaction
 */
export async function kageMimarisiInsaEt(guild, interaction = null) {
  const everyone = guild.roles.everyone;
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);

  // 1. ROLLER (üstten alta hiyerarşi)
  const roller = {};
  roller.kage = await rolBulVeyaOlustur(guild, 'Kage (Şogun)', {
    name: '👑 Kage (Şogun)', color: 0xe53935, hoist: true, permissions: [P.Administrator]
  });
  roller.daimyo = await rolBulVeyaOlustur(guild, 'Daimyo', {
    name: '🗡️ Daimyo (Yönetim)', color: 0xb71c1c, hoist: true,
    permissions: [P.ManageGuild, P.ManageChannels, P.ManageRoles, P.BanMembers, P.KickMembers, P.ManageMessages, P.ModerateMembers]
  });
  roller.hatamoto = await rolBulVeyaOlustur(guild, 'Hatamoto', {
    name: '🛡️ Hatamoto (Muhafız)', color: 0xd32f2f, hoist: true,
    permissions: [P.ManageMessages, P.KickMembers, P.ModerateMembers]
  });
  roller.bot = await rolBulVeyaOlustur(guild, 'Bot & Muhafızlar', {
    name: '🤖 Bot & Muhafızlar', color: 0x78909c, hoist: true
  });
  roller.efsane = await rolBulVeyaOlustur(guild, 'Kage Efsanesi', {
    name: '👑 Kage Efsanesi', color: 0xffd700, hoist: true
  });
  roller.jonin = await rolBulVeyaOlustur(guild, 'Jonin Komutanı', {
    name: '⚔️ Jonin Komutanı', color: 0xff7043, hoist: true
  });
  roller.chunin = await rolBulVeyaOlustur(guild, 'Chunin Kıdemlisi', {
    name: '⛩️ Chunin Kıdemlisi', color: 0x42a5f5, hoist: true
  });
  roller.genin = await rolBulVeyaOlustur(guild, 'Genin Savaşçısı', {
    name: '📜 Genin Savaşçısı', color: 0x66bb6a, hoist: true
  });
  roller.kunoichi = await rolBulVeyaOlustur(guild, 'Kunoichi', {
    name: '🌸 Gölge Kunoichisi', color: 0xff66b2, hoist: true, mentionable: true
  });
  roller.samuray = await rolBulVeyaOlustur(guild, 'Gölge Samurayı', {
    name: '🗡️ Gölge Samurayı', color: 0x5c6bc0, hoist: true, mentionable: true
  });
  roller.shinobi = await rolBulVeyaOlustur(guild, 'Shinobi', {
    name: '⚔️ Shinobi (Kayıtlı Üye)', color: 0xe0e0e0, hoist: true
  });
  roller.mangaOkuru = await rolBulVeyaOlustur(guild, 'Manga Okuru', {
    name: '📖 Manga Okuru', color: 0xff5252, mentionable: true
  });
  roller.oyuncu = await rolBulVeyaOlustur(guild, 'Gölge Oyuncusu', {
    name: '🎮 Gölge Oyuncusu', color: 0x7c4dff, mentionable: true
  });
  roller.ronin = await rolBulVeyaOlustur(guild, 'Ronin', {
    name: '📜 Ronin (Kayıtsız)', color: 0x424242
  });

  await rolSirasiniKur(guild, [
    roller.kage, roller.daimyo, roller.hatamoto, roller.bot,
    roller.efsane, roller.jonin, roller.chunin, roller.genin,
    roller.kunoichi, roller.samuray, roller.shinobi,
    roller.mangaOkuru, roller.oyuncu, roller.ronin
  ]);

  // Kurucuya Kage, bota Bot rolü
  const kurucuId = interaction?.user?.id || interaction?.author?.id;
  if (kurucuId) {
    try {
      const kurucuMember = await guild.members.fetch(kurucuId);
      await kurucuMember.roles.add(roller.kage);
    } catch {}
  }
  try {
    const botMember = await guild.members.fetchMe();
    await botMember.roles.add(roller.bot);
  } catch {}

  const yetkiliIzin = [
    { id: roller.hatamoto.id, allow: YAZ },
    { id: roller.daimyo.id, allow: YAZ },
    { id: roller.kage.id, allow: YAZ }
  ];
  const sadeceOkuma = { id: everyone.id, allow: OKU, deny: [P.SendMessages] };
  const uyeIzni = [
    { id: everyone.id, deny: [P.ViewChannel] },
    { id: roller.shinobi.id, allow: YAZ }
  ];

  const kategori = (ad, izinler) => kanalBulVeyaOlustur(guild, ad, {
    name: `╭━━━ ${ad} ━━━╮`, type: ChannelType.GuildCategory, permissionOverwrites: izinler
  }).then(s => s.kanal);

  const metin = (anahtar, ad, parent, topic, ekstra = {}) => kanalBulVeyaOlustur(guild, anahtar, {
    name: ad, type: ChannelType.GuildText, parent: parent.id, topic, ...ekstra
  });

  // 2. GİRİŞ & BİLGİ
  const katGiris = await kategori('⛩️ GİRİŞ & BİLGİ', []);
  const girisIzin = { permissionOverwrites: [sadeceOkuma] };

  const { kanal: kayitKapisi, yeni: kayitYeni } = await metin('kayıt-kapısı', '🚪・kayıt-kapısı', katGiris,
    'Mührünü bas, Shinobi ol. Butona tıkla ve kaydını tamamla.', {
      permissionOverwrites: [sadeceOkuma, { id: roller.shinobi.id, deny: [P.ViewChannel] }]
    });
  const { kanal: kurallar, yeni: kuralYeni } = await metin('kadim-kurallar', '📜・kadim-kurallar', katGiris,
    'Kale kanunları. Katılan herkes bunlara uymuş sayılır.', girisIzin);
  const { kanal: duyurular, yeni: duyuruYeni } = await metin('kage-duyuru', '📢・kage-duyuru', katGiris,
    'Resmi duyurular, etkinlikler ve çekilişler.', {
      permissionOverwrites: [sadeceOkuma, { id: roller.daimyo.id, allow: [P.SendMessages] }, { id: roller.kage.id, allow: [P.SendMessages] }]
    });
  const { kanal: mangaDuyuru, yeni: mangaYeni } = await metin('manga-yayınları', '📖・manga-yayınları', katGiris,
    'Yeni manga ve bölüm bildirimleri otomatik burada. Bildirim için Manga Okuru rolünü al.', girisIzin);
  const { kanal: hosgeldiniz, yeni: hosYeni } = await metin('yeni-savaşçılar', '🌸・yeni-savaşçılar', katGiris,
    'Kaleye yeni katılan savaşçılar karşılanır.', girisIzin);
  const { kanal: kageDev, yeni: devYeni } = await metin('kage-dev', '🛠️・kage-dev', katGiris,
    'Kage bot güncelleme notları ve geliştirici günlüğü.', girisIzin);

  // 3. GÖLGE TOPLULUĞU
  const katTopluluk = await kategori('💬 GÖLGE TOPLULUĞU', uyeIzni);
  const { kanal: sohbet, yeni: sohbetYeni } = await metin('meydan-sohbeti', '💬・meydan-sohbeti', katTopluluk,
    'Genel sohbet. Konuştukça XP kazanır, seviye atladıkça Ryo alırsın.');
  const { kanal: tartisma, yeni: tartismaYeni } = await metin('manga-tartışma', '🗡️・manga-tartışma', katTopluluk,
    'Manga tartışması. Yeni bölümlerde spoiler etiketini (||metin||) kullan.');
  await metin('anime-dünyası', '🎌・anime-dünyası', katTopluluk, 'Anime önerileri ve sezon sohbeti.');
  await metin('manga-panelleri', '🎨・manga-panelleri', katTopluluk, 'Favori panelleri, fan art ve çizimleri paylaş.');
  const { kanal: botKomut, yeni: botKomutYeni } = await metin('bot-komut', '🤖・bot-komut', katTopluluk,
    'Bot komutları buraya. Başlamak için /yardim yaz.');

  // 4. ARENA & RYO OYUNLARI
  const katArena = await kategori('⚔️ ARENA & RYO BAHİS', uyeIzni);
  const oyunlar = [
    ['samuray-düellosu', '⚔️・samuray-düellosu', 'Düello: /duello @rakip [bahis]. Katana seviyen hasarını artırır.',
      '⚔️ **SAMURAY DÜELLOSU**\n`/duello @rakip [bahis]` ile meydan oku. Kazanan bahsi alır, katana bonusu avantaj sağlar.\nGücünü `/demirci` ile artır.'],
    ['kumar-ve-zar', '🎲・kumar-ve-zar', 'Blackjack, slot ve yazı tura. Bahsini bil, şansını dene.',
      '🎲 **KUMAR VE ZAR**\n`/blackjack` • `/slot` • `/yazitura`\nUnutma: kasa uzun vadede kazanır. Cüzdanını `/bakiye` ile kontrol et.'],
    ['zindan-seferleri', '🏰・zindan-seferleri', 'Zindan: /zindan sefer. Rütbe aç, kalıntı topla, seri bonusu kazan.',
      '🏰 **ZİNDAN SEFERLERİ**\n`/zindan sefer` ile İblis zindanına in. Zaferle D→S rütbesini aç, kalıntı topla, serini koru.\n`/zindan profil` ve `/zindan siralama` ile durumuna bak.'],
    ['sessiz-göl', '🎣・sessiz-göl', 'Balık tut: /balik. Nadir balıkları yakala, koleksiyonu tamamla.',
      '🎣 **SESSİZ GÖL**\n`/balik` ile olta at. 9 balık türü, ilk keşif bonusu ve çanta satışı var. Oltanı geliştirdikçe nadir balık şansın artar.'],
    ['boss-arenası', '🐉・boss-arenası', 'Sunucu ortak bossu: /boss. Saatte bir saldır, ganimet hasar payına göre bölünür.',
      '🐉 **BOSS ARENASI**\n`/boss` ile ortak dünya bossuna saatte bir saldır. Boss ölünce ödül havuzu hasar payına göre dağıtılır, son vuruşa %20 ek.\n48 saatte öldürülmezse kaçar.'],
    ['gölge-kulesi', '🗼・gölge-kulesi', 'Gölge Kulesi: /kule. Günde 3 hak, kat kat tırman, ölmeden ödülü çek.',
      '🗼 **GÖLGE KULESİ**\n`/kule` ile tırman. Günde 3 hak, her 5. katta boss. Kat sonunda 3 güçlenmeden birini seç.\nÖlürsen birikmiş ödülün %50\'sini alırsın, çekilirsen tamamını.'],
    ['dojo', '🏯・dojo-kurulu', 'Kendi dojonu kur: /dojo. Sen yokken saat başı Ryo üretir.',
      '🏯 **DOJO KURULU**\n`/dojo` ile dojonu kur ve yükselt. Saat başı Ryo üretir, 12 saate kadar depolar. Düzenli uğra ve topla.'],
    ['çekiliş', '🎉・çekiliş-salonu', 'Çekilişler burada. Butona bas, katıl.',
      '🎉 **ÇEKİLİŞ SALONU**\nYetkililer `/cekilis baslat` ile çekiliş açar. Butona basarak katıl, kazanan otomatik seçilir.'],
    ['seviye-duyuru', '📈・seviye-duyuru', 'Seviye atlayanlar ve Ryo ödülleri.',
      '📈 **SEVİYE DUYURUSU**\nSohbet ettikçe XP kazanırsın (dakikada bir sayılır). Seviye atlayınca `seviye × 50 Ryo` ödül gelir.\n`/seviye bak` ve `/seviye siralama` ile ilerlemene bak.']
  ];
  const oyunKanallari = {};
  for (const [anahtar, ad, topic, giris] of oyunlar) {
    const { kanal, yeni } = await metin(anahtar, ad, katArena, topic);
    oyunKanallari[anahtar] = kanal;
    if (yeni) await kanal.send(tanitim(ad.split('・')[1].replace(/-/g, ' ').toUpperCase(), giris, TEMA.RENKLER.ALTIN)).catch(() => {});
  }
  const { kanal: oyunDevlog } = await metin('kage-oyun-devlog', '🎮・kage-oyun-devlog', katArena,
    'Kage indie oyununun geliştirme günlüğü.');

  // 5. YAPAY ZEKA MABEDİ
  const katAi = await kategori('🔮 YAPAY ZEKA MABEDİ', uyeIzni);
  const { kanal: aiKanal, yeni: aiYeni } = await metin('gölge-veziri', '🔮・gölge-veziri-ai', katAi,
    'Gölge Veziri ile sohbet et. Etiketlemeye gerek yok.');

  // 6. ŞOGUN KALESİ (gizli yetkili alanı)
  const katYonetim = await kategori('🔒 ŞOGUN KALESİ', [
    { id: everyone.id, deny: [P.ViewChannel] }, ...yetkiliIzin
  ]);
  const { kanal: meclis, yeni: meclisYeni } = await metin('şogun-meclisi', '🔒・şogun-meclisi', katYonetim,
    'Yetkili sohbeti.');
  const { kanal: modLogKanal, yeni: modYeni } = await metin('ceza-sicil-log', '📜・ceza-sicil-log', katYonetim,
    'Ban, kick, timeout, uyarı ve otomod kayıtları.');
  const { kanal: kayitLog } = await metin('kayıt-mühür-log', '📝・kayıt-mühür-log', katYonetim,
    'Kayıt işlemlerinin kaydı.');
  const { kanal: ekonomiLog, yeni: ekoYeni } = await metin('ekonomi-log', '💰・ekonomi-log', katYonetim,
    'Ryo hareketleri. Detay için /ekonomi-log.');
  const { kanal: biletLog } = await metin('bilet-log', '🎫・bilet-log', katYonetim,
    'Kapanan destek biletlerinin kaydı.');

  // 7. DESTEK
  const katDestek = await kategori('🎫 DESTEK', [sadeceOkuma]);
  const { kanal: destek, yeni: destekYeni } = await metin('destek-bileti', '🎫・destek-bileti', katDestek,
    'Sorun, şikayet veya öneri için bilet aç.');

  // 8. SES ODALARI
  const katSes = await kategori('🔊 SAMURAY SES ODALARI', [
    { id: everyone.id, deny: [P.ViewChannel] },
    { id: roller.shinobi.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
  ]);
  const ses = (ad, ekstra = {}) => kanalBulVeyaOlustur(guild, ad, {
    name: ad, type: ChannelType.GuildVoice, parent: katSes.id, ...ekstra
  });
  await ses('⛩️ Klan Meclisi #1');
  await ses('⛩️ Klan Meclisi #2');
  await ses('📖 Sessiz Manga Okuma');
  await ses('🎮 Kage Oyun Odası');
  await ses('👑 Şogun Özel Odası', {
    permissionOverwrites: [
      { id: everyone.id, deny: [P.ViewChannel, P.Connect] },
      { id: roller.daimyo.id, allow: [P.ViewChannel, P.Connect] },
      { id: roller.kage.id, allow: [P.ViewChannel, P.Connect] }
    ]
  });

  // 9. Sistem ayarları
  sunucuAyarGuncelle(guild.id, {
    modLogKanalId: modLogKanal.id,
    mangaDuyuruKanalId: mangaDuyuru.id,
    otoRolId: roller.ronin.id,
    hosgeldinKanalId: hosgeldiniz.id,
    aiYonetimKanalId: aiKanal.id,
    ticketKategoriId: katYonetim.id,
    ticketRolId: roller.hatamoto.id,
    ticketLogKanalId: biletLog.id
  });

  // 10. Tanıtım mesajları (yalnız yeni açılan kanallara)
  if (kayitYeni) {
    const kayitEmbed = kageEmbed({
      baslik: '⛩️ KAGE KALESİ • GİRİŞ VE KAYIT KAPISI',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `Kage 95 manga ve oyun kalesine hoş geldin!\n\n` +
        `Kalenin iç odalarına, anime/manga tartışmalarına, ses kanallarına, arenaya ve yapay zeka vezirine girmek için aşağıdaki butonla kaydını tamamla.\n\n` +
        `📜 **Kayıt olunca:**\n` +
        `• \`Shinobi (Kayıtlı Üye)\` rolü verilir ve kalenin kilitleri açılır.\n` +
        `• Cüzdanına \`+50 Ryo\` hoş geldin ödülü yatar.\n` +
        `• Sohbet ettikçe XP kazanır; manga okudukça Genin → Chunin → Jonin → Kage Efsanesi rütbelerine yükselirsin.\n\n` +
        `*Mührünü bas ve aramıza katıl.*`,
      footer: `Kage Otomatik Kayıt Kapısı • kage95.com`
    });
    const kayitRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kage_kayit_ol_btn')
        .setLabel('Mührü Bas & Kayıt Ol')
        .setStyle(ButtonStyle.Success)
        .setEmoji(TEMA.EMOJILER.TORII),
      new ButtonBuilder()
        .setLabel('Kage Web Sitesi')
        .setURL(process.env.SITE_URL || 'https://kage95.com')
        .setStyle(ButtonStyle.Link)
        .setEmoji(TEMA.EMOJILER.PARSOMEN)
    );
    await kayitKapisi.send({ embeds: [kayitEmbed], components: [kayitRow] });
  }

  if (kuralYeni) {
    await kurallar.send(tanitim('KALE KANUNLARI (KURALLAR)',
      `Kage kalesine adım atan her samuray bu kadim kanunlara uymakla yükümlüdür:\n\n` +
      `**1. Onur ve Saygı:** Üyelere hakaret, küfür, aşağılama ve nefret söylemi yasaktır.\n` +
      `**2. Gölgelerde Gizlilik (Spoiler):** Yeni bölümleri konuşurken spoiler etiketi kullan: ||metin||.\n` +
      `**3. Reklam ve Taciz Yasağı:** İzinsiz davet, reklam ve özelden rahatsızlık yasaktır.\n` +
      `**4. Adil Oyun:** Ryo sömürüsü, bug istismarı ve çoklu hesap yasaktır; ekonomi kayıtları denetlenir.\n` +
      `**5. Yetkililere İtaat:** Daimyo ve Hatamoto kararları nihaidir. İtiraz için bilet aç.\n\n` +
      `*Sessizce oku, derinlere in.*`));
  }

  if (aiYeni) {
    await aiKanal.send(tanitim('🔮 GÖLGE VEZİRİ HİZMETİNİZDE',
      `Selam samuraylar!\n\nBu kanalda dilediğini sorabilir, manga/anime tartışabilir veya sunucu hakkında yardım isteyebilirsin. Etiketlemene gerek yok; bu kanala yazılan her mesajı yanıtlarım.\n\n` +
      `Başka kanallarda \`kage\` diye seslenebilir ya da \`/ai\` kullanabilirsin.`));
  }

  if (duyuruYeni) {
    await duyurular.send(tanitim('📢 KAGE DUYURULARI', 'Resmi duyurular, etkinlikler ve çekilişler burada yayınlanır. Bildirimleri açık tut.'));
  }
  if (mangaYeni) {
    await mangaDuyuru.send(tanitim('📖 MANGA YAYINLARI',
      'Yeni seriler ve bölümler kage95.com\'dan otomatik buraya düşer. Anında haber için **Manga Okuru** rolünü al.'));
  }
  if (hosYeni) {
    await hosgeldiniz.send(tanitim('🌸 YENİ SAVAŞÇILAR', 'Kaydını tamamlayan her savaşçı burada karşılanır. Hoş geldin demeyi unutma.'));
  }
  if (devYeni) {
    await kageDev.send(tanitim('🛠️ KAGE DEV', 'Bot güncelleme notları ve sistem raporları burada yayınlanır.', TEMA.RENKLER.BILGI));
  }
  if (sohbetYeni) {
    await sohbet.send(tanitim('💬 MEYDAN SOHBETİ',
      'Kalenin meydanına hoş geldin. Konuş, tanış, eğlen. Her mesaj XP kazandırır; seviye atladıkça Ryo ödülün gelir.', TEMA.RENKLER.BILGI));
  }
  if (tartismaYeni) {
    await tartisma.send(tanitim('🗡️ MANGA TARTIŞMA', 'Seriler, teoriler ve bölüm yorumları burada. Spoiler için ||metin|| kullan.', TEMA.RENKLER.BILGI));
  }
  if (botKomutYeni) {
    await botKomut.send(tanitim('🤖 BOT KOMUTLARI', 'Tüm komutlar için `/yardim` yaz. Oyun ve ekonomi komutlarını sohbeti kalabalıklaştırmadan burada dene.', TEMA.RENKLER.BILGI));
  }
  if (meclisYeni) {
    await meclis.send(tanitim('🔒 ŞOGUN MECLİSİ', 'Yetkili alanı. Moderasyon kararları, bilet takibi ve ekonomi kayıtları bu kategoride toplanır.'));
  }
  if (modYeni) {
    await modLogKanal.send(tanitim('📜 CEZA SİCİLİ', 'Ban, kick, timeout, uyarı ve otomod kayıtları buraya düşer.'));
  }
  if (ekoYeni) {
    await ekonomiLog.send(tanitim('💰 EKONOMİ KAYDI', 'Ryo hareketleri için `/ekonomi-log [üye] [adet]` komutunu kullan.', TEMA.RENKLER.ALTIN));
  }
  if (destekYeni) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('kage_ticket:ac').setLabel('Bilet aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
    );
    await destek.send({
      embeds: [kageEmbed({
        baslik: '🎫 DESTEK',
        renk: TEMA.RENKLER.BILGI,
        aciklama: 'Sorun, şikayet veya önerin için aşağıdaki butona bas. Sana özel, yalnız yetkililerin göreceği bir kanal açılır.'
      })],
      components: [row]
    });
  }

  return {
    roller,
    kayitKapisi,
    kurallar,
    duyurular,
    mangaDuyuru,
    sohbet,
    aiKanal,
    modLogKanal,
    oyunKanallari,
    destek,
    kayitLog,
    oyunDevlog
  };
}
