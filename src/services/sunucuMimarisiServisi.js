import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { sunucuAyarGuncelle } from './veritabaniServisi.js';

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
 * Ultra Kage 95 Punk-Manga & Samuray mimarisini baştan aşağı kurar
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').CommandInteraction} interaction
 */
export async function kageMimarisiInsaEt(guild, interaction = null) {
  const everyone = guild.roles.everyone;

  // 1. ROLLER (Tam Teşekküllü Kage 95 Rütbeleri)
  const roller = {};

  roller.kage = await guild.roles.create({
    name: '👑 Kage (Şogun)',
    color: 0xe53935, // Kan Kırmızısı
    hoist: true,
    permissions: [PermissionFlagsBits.Administrator],
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.daimyo = await guild.roles.create({
    name: '🗡️ Daimyo (Yönetim)',
    color: 0xb71c1c,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ModerateMembers
    ],
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.hatamoto = await guild.roles.create({
    name: '🛡️ Hatamoto (Muhafız)',
    color: 0xd32f2f,
    hoist: true,
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ModerateMembers
    ],
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.bot = await guild.roles.create({
    name: '🤖 Bot & Muhafızlar',
    color: 0x78909c,
    hoist: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  // Seviye Rütbeleri
  roller.efsane = await guild.roles.create({
    name: '👑 Kage Efsanesi (Lv. 30+)',
    color: 0xffd700,
    hoist: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.jonin = await guild.roles.create({
    name: '⚔️ Jonin Komutanı (Lv. 20+)',
    color: 0xff7043,
    hoist: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.chunin = await guild.roles.create({
    name: '⛩️ Chunin Kıdemlisi (Lv. 10+)',
    color: 0x42a5f5,
    hoist: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.genin = await guild.roles.create({
    name: '📜 Genin Savaşçısı (Lv. 3+)',
    color: 0x66bb6a,
    hoist: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  // Topluluk Rolleri
  roller.shinobi = await guild.roles.create({
    name: '⚔️ Shinobi (Kayıtlı Üye)',
    color: 0xe0e0e0,
    hoist: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.mangaOkuru = await guild.roles.create({
    name: '📖 Manga Okuru',
    color: 0xff5252,
    mentionable: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  roller.oyuncu = await guild.roles.create({
    name: '🎮 Gölge Oyuncusu',
    color: 0x7c4dff,
    mentionable: true,
    reason: 'Kage 95 Master Mimarisi'
  });

  // Kayıtsız Ronin (Sadece kayıt kapısını ve kuralları görür)
  roller.ronin = await guild.roles.create({
    name: '📜 Ronin (Kayıtsız)',
    color: 0x424242,
    hoist: false,
    reason: 'Kage 95 Master Mimarisi'
  });

  // Kurucuya Kage rolünü ver
  const kurucuId = interaction?.user?.id || interaction?.author?.id;
  if (kurucuId) {
    try {
      const kurucuMember = await guild.members.fetch(kurucuId);
      await kurucuMember.roles.add(roller.kage);
    } catch {}
  }

  // 2. KATEGORİ 1: ⛩️ GİRİŞ & BİLGİ
  const katGiris = await guild.channels.create({
    name: '╭━━━ ⛩️ GİRİŞ & BİLGİ ━━━╮',
    type: ChannelType.GuildCategory
  });

  const kayitKapisi = await guild.channels.create({
    name: '🚪・kayıt-kapısı',
    type: ChannelType.GuildText,
    parent: katGiris.id,
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
      { id: roller.shinobi.id, deny: [PermissionFlagsBits.ViewChannel] }
    ]
  });

  const kurallar = await guild.channels.create({
    name: '📜・kadim-kurallar',
    type: ChannelType.GuildText,
    parent: katGiris.id,
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
    ]
  });

  const duyurular = await guild.channels.create({
    name: '📢・kage-duyuru',
    type: ChannelType.GuildText,
    parent: katGiris.id,
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
      { id: roller.daimyo.id, allow: [PermissionFlagsBits.SendMessages] },
      { id: roller.kage.id, allow: [PermissionFlagsBits.SendMessages] }
    ]
  });

  const mangaDuyuru = await guild.channels.create({
    name: '📖・manga-yayınları',
    type: ChannelType.GuildText,
    parent: katGiris.id,
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
    ]
  });

  const hosgeldiniz = await guild.channels.create({
    name: '🌸・yeni-savaşçılar',
    type: ChannelType.GuildText,
    parent: katGiris.id,
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
    ]
  });

  const kageDevKanal = await guild.channels.create({
    name: '🛠️・kage-dev',
    type: ChannelType.GuildText,
    parent: katGiris.id,
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
    ]
  });

  // 3. KATEGORİ 2: 💬 GÖLGE TOPLULUĞU (Kayıtlı Shinobi'lere Özel)
  const katTopluluk = await guild.channels.create({
    name: '╭━━━ 💬 GÖLGE TOPLULUĞU ━━━╮',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  const sohbet = await guild.channels.create({ name: '💬・meydan-sohbeti', type: ChannelType.GuildText, parent: katTopluluk.id });
  await guild.channels.create({ name: '🗡️・manga-tartışma', type: ChannelType.GuildText, parent: katTopluluk.id });
  await guild.channels.create({ name: '🎌・anime-dünyası', type: ChannelType.GuildText, parent: katTopluluk.id });
  await guild.channels.create({ name: '🎨・manga-panelleri', type: ChannelType.GuildText, parent: katTopluluk.id });
  await guild.channels.create({ name: '🤖・bot-komut', type: ChannelType.GuildText, parent: katTopluluk.id });

  // 4. KATEGORİ 3: ⚔️ ARENA & RYO BAHİS
  const katArena = await guild.channels.create({
    name: '╭━━━ ⚔️ ARENA & RYO BAHİS ━━━╮',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  await guild.channels.create({ name: '⚔️・samuray-düellosu', type: ChannelType.GuildText, parent: katArena.id });
  await guild.channels.create({ name: '🎲・kumar-ve-zar', type: ChannelType.GuildText, parent: katArena.id });
  await guild.channels.create({ name: '🏰・zindan-seferleri', type: ChannelType.GuildText, parent: katArena.id });
  await guild.channels.create({ name: '🎮・kage-oyun-devlog', type: ChannelType.GuildText, parent: katArena.id });

  // 5. KATEGORİ 4: 🔮 YAPAY ZEKA MABEDİ
  const katAi = await guild.channels.create({
    name: '╭━━━ 🔮 YAPAY ZEKA MABEDİ ━━━╮',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  const aiKanal = await guild.channels.create({
    name: '🔮・gölge-veziri-ai',
    type: ChannelType.GuildText,
    parent: katAi.id
  });

  // 6. KATEGORİ 5: 🔒 ŞOGUN KALESİ (Gizli Yetkili Alanı)
  const katYonetim = await guild.channels.create({
    name: '╭━━━ 🔒 ŞOGUN KALESİ ━━━╮',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roller.hatamoto.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: roller.daimyo.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: roller.kage.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  await guild.channels.create({ name: '🔒・şogun-meclisi', type: ChannelType.GuildText, parent: katYonetim.id });
  const modLogKanal = await guild.channels.create({ name: '📜・ceza-sicil-log', type: ChannelType.GuildText, parent: katYonetim.id });
  await guild.channels.create({ name: '📝・kayıt-mühür-log', type: ChannelType.GuildText, parent: katYonetim.id });

  // 7. KATEGORİ 6: 🔊 SAMURAY SES ODALARI
  const katSes = await guild.channels.create({
    name: '╭━━━ 🔊 SAMURAY SES ODALARI ━━━╮',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }
    ]
  });

  await guild.channels.create({ name: '⛩️ Klan Meclisi #1', type: ChannelType.GuildVoice, parent: katSes.id });
  await guild.channels.create({ name: '⛩️ Klan Meclisi #2', type: ChannelType.GuildVoice, parent: katSes.id });
  await guild.channels.create({ name: '📖 Sessiz Manga Okuma', type: ChannelType.GuildVoice, parent: katSes.id });
  await guild.channels.create({ name: '🎮 Kage Oyun Odası', type: ChannelType.GuildVoice, parent: katSes.id });
  await guild.channels.create({
    name: '👑 Şogun Özel Odası',
    type: ChannelType.GuildVoice,
    parent: katSes.id,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
      { id: roller.daimyo.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
      { id: roller.kage.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }
    ]
  });

  // 8. Sistem Ayarlarını Güncelle
  sunucuAyarGuncelle(guild.id, {
    modLogKanalId: modLogKanal.id,
    mangaDuyuruKanalId: mangaDuyuru.id,
    otoRolId: roller.ronin.id,
    hosgeldinKanalId: hosgeldiniz.id,
    aiYonetimKanalId: aiKanal.id
  });

  // 9. #kayıt-kapısı Kanalına Butonlu Kayıt Panelini Gönder
  const kayitEmbed = kageEmbed({
    baslik: '⛩️ KAGE KALESİ • GİRİŞ VE KAYIT KAPISI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 manga ve oyun kalesine hoş geldiniz!\n\n` +
      `Kalenin iç odalarına, anime/manga tartışmalarına, ses kanallarına ve yapay zeka vezirine erişebilmek için lütfen aşağıdaki butona tıklayarak klan kaydınızı tamamlayın.\n\n` +
      `📜 **Kayıt Olanlara:**\n` +
      `• \`Shinobi (Kayıtlı Üye)\` rolü verilir ve tüm sunucunun kilidi açılır.\n` +
      `• \`Manga Okuru\` rolüyle yeni seriler anında bildirilir.\n` +
      `• Cüzdanınıza \`+50 Ryo\` hoş geldin ödülü aktarılır!\n\n` +
      `*Aşağıdaki butona basarak mührünü bas ve aramıza katıl!*`,
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

  // 10. Kurallar Mesajı
  const kuralEmbed = kageEmbed({
    baslik: 'KALE KANUNLARI (KURALLAR)',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage kalesine adım atan her samuray bu kadim kanunlara uymakla yükümlüdür:\n\n` +
      `**1. Onur ve Saygı:** Üyelere ve klan arkadaşlarına hakaret, küfür veya aşağılama yasaktır.\n` +
      `**2. Gölgelerde Gizlilik (Spoiler):** Yeni bölümler hakkında konuşurken spoiler vermeyin; spoiler odasını veya spoiler etiketini kullanın.\n` +
      `**3. Reklam ve Taciz Yasağı:** Özelden veya kanallardan yetkisiz link, sunucu daveti paylaşımı kılıçla cezalandırılır.\n` +
      `**4. Yetkililere İtaat:** Daimyo ve Kage unvanlı yöneticilerin kararları nihaidir.\n\n` +
      `*Sessizce oku, derinlere in.*`
  });
  await kurallar.send({ embeds: [kuralEmbed] });

  // 11. AI Kanalına Karşılama
  const aiEmbed = kageEmbed({
    baslik: '🔮 GÖLGE VEZİRİ HİZMETİNİZDE',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Selam olsun samuraylar!\n\nBu kanalda bana dilediğiniz gibi soru sorabilir, manga/anime tartışabilir veya sunucu hakkında yardım isteyebilirsiniz. Beni etiketlemenize gerek yoktur; bu kanala yazılan her mesajı bizzat yanıtlayacağım.`
  });
  await aiKanal.send({ embeds: [aiEmbed] });

  return {
    roller,
    kayitKapisi,
    kurallar,
    duyurular,
    mangaDuyuru,
    sohbet,
    aiKanal,
    modLogKanal
  };
}
