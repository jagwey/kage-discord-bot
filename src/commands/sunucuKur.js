import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGuncelle } from '../services/veritabaniServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sunucu-kur')
  .setDescription('Sunucuyu detaylı samuray hiyerarşisi, kayıt kapısı, manga ve oyun odalarıyla kurar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const guild = interaction.guild;

  const onayEmbed = kageEmbed({
    baslik: '⛩️ DETAYLI KAGE SUNUCU MİMARİSİ KURULUMU',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**${guild.name}** sunucusu için tam teşekküllü Kage Manga & Samuray Topluluk Mimarisi inşa edilmek üzere!\n\n` +
      `📜 **Neler Kurulacak?**\n` +
      `• **Tam Teşekküllü Rol Hiyerarşisi:**\n` +
      `  👑 \`Kage (Kurucu)\` • 🗡️ \`Daimyo (Yönetim)\` • 🛡️ \`Hatamoto (Mod)\` • 🤖 \`Bot & Hizmetkâr\`\n` +
      `  ⚔️ \`Shinobi (Kayıtlı Üye)\` • 📜 \`Ronin (Kayıtsız)\` • 📖 \`Manga Okuru\` • 🎮 \`Gölge Oyuncusu\`\n` +
      `  🏆 Seviye Rolleri: \`Kage Efsanesi\`, \`Jonin\`, \`Chunin\`, \`Genin\`\n\n` +
      `• **Kayıt Sistemi & Güvenlik:**\n` +
      `  Yeni girenler sadece \`#kayıt-kapısı\` ve \`#kurallar\`ı görür. Butonla mührü basınca diğer tüm kanallar açılır!\n\n` +
      `• **Özel Kategoriler & Kanallar:**\n` +
      `  ⛩️ Kayıt & Bilgilendirme • 💬 Gölge Topluluğu • ⚔️ Samuray Arenası • 🤖 Yapay Zeka • 🛡️ Yönetim • 🔊 Ses Odaları\n\n` +
      `*Mevcut kanallarınız silinmez, yeni yapı düzenli şekilde eklenir.*`,
    footer: `Kurulumu onaylamak için 60 saniyeniz var.`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kurulum_onayla')
      .setLabel('Evet, Kaleyi Eksiksiz Kur')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setCustomId('kurulum_iptal')
      .setLabel('İptal Et')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  const yanit = await interaction.reply({
    embeds: [onayEmbed],
    components: [row],
    fetchReply: true
  });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu kararı sadece kurulumu başlatan yönetici verebilir.', ephemeral: true });
    }

    if (i.customId === 'kurulum_iptal') {
      collector.stop();
      return i.update({
        content: `${TEMA.EMOJILER.KATANA} Kurulum iptal edildi.`,
        embeds: [],
        components: []
      });
    }

    if (i.customId === 'kurulum_onayla') {
      collector.stop();
      await i.update({
        content: `⛩️ **Kage Kalesi İnşa Ediliyor...** Roller, izinler ve kayıt kapısı ayarlanıyor, lütfen 10-15 saniye bekleyin...`,
        embeds: [],
        components: []
      });

      try {
        const everyone = guild.roles.everyone;

        // 1. ROLLERİ OLUŞTUR
        const roller = {};

        // A. Yetkili Rolleri
        roller.kage = await guild.roles.create({
          name: '👑 Kage',
          color: 0xe53935, // Kan Kırmızısı
          hoist: true,
          permissions: [PermissionFlagsBits.Administrator],
          reason: 'Kage Detaylı Kurulum'
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
          reason: 'Kage Detaylı Kurulum'
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
          reason: 'Kage Detaylı Kurulum'
        });

        roller.bot = await guild.roles.create({
          name: '🤖 Bot & Hizmetkâr',
          color: 0x78909c,
          hoist: true,
          reason: 'Kage Detaylı Kurulum'
        });

        // B. Topluluk ve Seviye Rolleri
        roller.efsane = await guild.roles.create({
          name: '👑 Kage Efsanesi',
          color: 0xffd700, // Altın
          hoist: true,
          reason: 'Kage Detaylı Kurulum'
        });

        roller.jonin = await guild.roles.create({
          name: '⚔️ Jonin Komutanı',
          color: 0xff7043,
          hoist: true,
          reason: 'Kage Detaylı Kurulum'
        });

        roller.chunin = await guild.roles.create({
          name: '⛩️ Chunin Kıdemlisi',
          color: 0x42a5f5,
          hoist: true,
          reason: 'Kage Detaylı Kurulum'
        });

        roller.genin = await guild.roles.create({
          name: '📜 Genin Savaşçısı',
          color: 0x66bb6a,
          hoist: true,
          reason: 'Kage Detaylı Kurulum'
        });

        // C. Temel Kayıtlı ve Bildirim Rolleri
        roller.shinobi = await guild.roles.create({
          name: '⚔️ Shinobi (Kayıtlı Üye)',
          color: 0xe0e0e0,
          hoist: true,
          reason: 'Kage Detaylı Kurulum'
        });

        roller.mangaOkuru = await guild.roles.create({
          name: '📖 Manga Okuru',
          color: 0xff5252,
          mentionable: true,
          reason: 'Kage Detaylı Kurulum'
        });

        roller.oyuncu = await guild.roles.create({
          name: '🎮 Gölge Oyuncusu',
          color: 0x7c4dff,
          mentionable: true,
          reason: 'Kage Detaylı Kurulum'
        });

        // D. Kayıtsız Rolü (Yeni girenler sadece kayıt kanalını görür!)
        roller.ronin = await guild.roles.create({
          name: '📜 Ronin (Kayıtsız)',
          color: 0x424242,
          hoist: false,
          reason: 'Kage Detaylı Kurulum'
        });

        // 2. KATEGORİ 1: ⛩️ GİRİŞ & BİLGİLENDİRME
        const katGiris = await guild.channels.create({
          name: '⛩️ GİRİŞ & BİLGİLENDİRME',
          type: ChannelType.GuildCategory
        });

        // #kayıt-kapısı: Kayıtsızların gördüğü, kayıtlıların gizlendiği özel kapı!
        const kayitKapisi = await guild.channels.create({
          name: '⛩️・kayıt-kapısı',
          type: ChannelType.GuildText,
          parent: katGiris.id,
          permissionOverwrites: [
            { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
            { id: roller.shinobi.id, deny: [PermissionFlagsBits.ViewChannel] } // Kayıt olanlar artık kapıyı görmez!
          ]
        });

        const kurallar = await guild.channels.create({
          name: '📜・kurallar',
          type: ChannelType.GuildText,
          parent: katGiris.id,
          permissionOverwrites: [
            { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
          ]
        });

        const duyurular = await guild.channels.create({
          name: '📢・duyurular',
          type: ChannelType.GuildText,
          parent: katGiris.id,
          permissionOverwrites: [
            { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
            { id: roller.daimyo.id, allow: [PermissionFlagsBits.SendMessages] },
            { id: roller.kage.id, allow: [PermissionFlagsBits.SendMessages] }
          ]
        });

        const mangaDuyuru = await guild.channels.create({
          name: '📖・manga-duyuru',
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

        const hosgeldiniz = await guild.channels.create({
          name: '🌸・hoş-geldin',
          type: ChannelType.GuildText,
          parent: katGiris.id,
          permissionOverwrites: [
            { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }
          ]
        });

        // 3. KATEGORİ 2: 💬 GÖLGE TOPLULUĞU (Sadece Kayıtlı Shinobi'ler Görür)
        const katTopluluk = await guild.channels.create({
          name: '💬 GÖLGE TOPLULUĞU',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        const sohbet = await guild.channels.create({ name: '💬・genel-sohbet', type: ChannelType.GuildText, parent: katTopluluk.id });
        await guild.channels.create({ name: '🗡️・manga-tartışma', type: ChannelType.GuildText, parent: katTopluluk.id });
        await guild.channels.create({ name: '🎌・anime-sohbet', type: ChannelType.GuildText, parent: katTopluluk.id });
        await guild.channels.create({ name: '🎨・medya-çizim', type: ChannelType.GuildText, parent: katTopluluk.id });
        await guild.channels.create({ name: '🤖・bot-komut', type: ChannelType.GuildText, parent: katTopluluk.id });

        // 4. KATEGORİ 3: ⚔️ SAMURAY ARENASI & OYUNLAR
        const katArena = await guild.channels.create({
          name: '⚔️ SAMURAY ARENASI & OYUNLAR',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        await guild.channels.create({ name: '⚔️・düello-meydanı', type: ChannelType.GuildText, parent: katArena.id });
        await guild.channels.create({ name: '🪙・kumar-ve-ekonomi', type: ChannelType.GuildText, parent: katArena.id });
        await guild.channels.create({ name: '🎮・kage-oyun-devlog', type: ChannelType.GuildText, parent: katArena.id });

        // 5. KATEGORİ 4: 🤖 YAPAY ZEKA GÖLGE VEZİRİ
        const katAi = await guild.channels.create({
          name: '🤖 YAPAY ZEKA GÖLGE VEZİRİ',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        const aiKanal = await guild.channels.create({
          name: '🔮・ai-gölge-veziri',
          type: ChannelType.GuildText,
          parent: katAi.id
        });

        // 6. KATEGORİ 5: 🛡️ YÖNETİM KALESİ (Gizli)
        const katYonetim = await guild.channels.create({
          name: '🛡️ YÖNETİM KALESİ',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: roller.hatamoto.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: roller.daimyo.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: roller.kage.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        await guild.channels.create({ name: '🔒・yetkili-sohbet', type: ChannelType.GuildText, parent: katYonetim.id });
        const modLogKanal = await guild.channels.create({ name: '📜・mod-log', type: ChannelType.GuildText, parent: katYonetim.id });
        await guild.channels.create({ name: '📝・kayıt-log', type: ChannelType.GuildText, parent: katYonetim.id });

        // 7. KATEGORİ 6: 🔊 SES ODALARI
        const katSes = await guild.channels.create({
          name: '🔊 SES ODALARI',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: roller.shinobi.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }
          ]
        });

        await guild.channels.create({ name: '⛩️ Sohbet Odası 1', type: ChannelType.GuildVoice, parent: katSes.id });
        await guild.channels.create({ name: '⛩️ Sohbet Odası 2', type: ChannelType.GuildVoice, parent: katSes.id });
        await guild.channels.create({ name: '🗡️ Manga Okuma Odası', type: ChannelType.GuildVoice, parent: katSes.id });
        await guild.channels.create({ name: '🎮 Kage Oyun Odası', type: ChannelType.GuildVoice, parent: katSes.id });

        // 8. Ayarları Veritabanına Bağla
        sunucuAyarGuncelle(guild.id, {
          modLogKanalId: modLogKanal.id,
          otoRolId: roller.ronin.id, // Yeni katılanlara otomatik Ronin (Kayıtsız) verilir
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
            `• \`Shinobi (Kayıtlı Üye)\` rolü verilir ve tüm sunucu açılır.\n` +
            `• \`Manga Okuru\` rolüyle yeni bölümler anında bildirilir.\n` +
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

        // Kurallar Kanalına Mesaj
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

        // AI Kanalına Başlangıç Mesajı
        const aiEmbed = kageEmbed({
          baslik: '🔮 GÖLGE VEZİRİ HİZMETİNİZDE',
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          aciklama: `Selam olsun samuraylar!\n\nBu kanalda bana dilediğiniz gibi soru sorabilir, manga/anime tartışabilir veya sunucu hakkında yardım isteyebilirsiniz. Beni etiketlemenize gerek yoktur; bu kanala yazılan her mesajı bizzat yanıtlayacağım.`
        });
        await aiKanal.send({ embeds: [aiEmbed] });

        // Başarı Özeti
        const sonucEmbed = kageEmbed({
          baslik: '⛩️ KAGE KALESİ EKSİKSİZ İNŞA EDİLDİ!',
          renk: TEMA.RENKLER.BASARI,
          aciklama: `Tebrikler ${interaction.user}! **${guild.name}** sunucusu ultra detaylı samuray, manga ve oyun mimarisiyle donatıldı.\n\n` +
            `👑 **Kurulan Roller:** <@&${roller.kage.id}>, <@&${roller.daimyo.id}>, <@&${roller.hatamoto.id}>, <@&${roller.shinobi.id}>, <@&${roller.mangaOkuru.id}>, <@&${roller.ronin.id}>\n` +
            `🚪 **Kayıt Kapısı:** ${kayitKapisi} *(Butonlu panel kuruldu!)*\n` +
            `📜 **Kurallar:** ${kurallar}\n` +
            `📢 **Manga Duyuru:** ${mangaDuyuru}\n` +
            `💬 **Genel Sohbet:** ${sohbet}\n` +
            `🔮 **Yapay Zeka:** ${aiKanal}\n` +
            `🔒 **Mod-Log:** ${modLogKanal}\n\n` +
            `*Hemen kendinize <@&${roller.kage.id}> rolünü vererek kalenizin başına geçebilirsiniz!*`
        });

        await interaction.channel.send({ embeds: [sonucEmbed] });
      } catch (err) {
        console.error('[SunucuKur Hatası]:', err);
        await interaction.channel.send({
          content: `❌ Kurulum sırasında hata: ${err.message}\nLütfen botun rolünün diğer rollerin en üstünde olduğundan emin olun.`
        });
      }
    }
  });
}
