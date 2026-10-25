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
  .setDescription('Kage samuray, manga ve oyun mimarisiyle sunucuyu baştan aşağı otomatik kurar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt.setName('sablon')
      .setDescription('Kurulacak sunucu şablonu')
      .setRequired(false)
      .addChoices(
        { name: '⛩️ Tam Kage Düzeni (Manga, Oyun, Moderasyon & AI)', value: 'tam' },
        { name: '💬 Sade Samuray Topluluğu', value: 'sade' }
      )
  );

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${TEMA.EMOJILER.KATANA} Bu emri sadece kalenin en kıdemli yöneticisi (Administrator) verebilir.`,
      ephemeral: true
    });
  }

  const sablon = interaction.options.getString('sablon') || 'tam';
  const guild = interaction.guild;

  const onayEmbed = kageEmbed({
    baslik: 'KALE İNŞAATI BAŞLASIN MI? (SUNUCU KURULUMU)',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**${guild.name}** sunucusu için Kage otomatik mimari kurulumu başlatılmak üzere.\n\n` +
      `📌 **Neler İnşa Edilecek?**\n` +
      `• **Hiyerarşik Samuray Rolleri:** \`👑 Kage\`, \`🥷 Anbu\`, \`🗡️ Jonin\`, \`🏮 Chunin\`, \`📜 Gölge Genin\`\n` +
      `• **Özel İzinli Kategoriler:** Bilgilendirme, Topluluk Sohbeti, Manga Odaları, Oyun Odaları, Ses Kanalları ve Özel Yönetim Odası\n` +
      `• **Otomatik Sistem Bağlantıları:** Mod-log, Karşılama, Oto-Rol ve AI Yönetim kanalları otomatik tanımlanacak.\n\n` +
      `⚠️ *Mevcut kanallarınız silinmez; yeni kategoriler ve roller düzenli bir şekilde eklenir.*`,
    alanlar: [
      { name: 'Seçilen Şablon', value: sablon === 'tam' ? '⛩️ Tam Kage Düzeni (Manga & Oyun)' : '💬 Sade Topluluk', inline: true },
      { name: 'Kurulumu Başlatan', value: `${interaction.user}`, inline: true }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kurulum_onayla')
      .setLabel('Evet, Kaleyi İnşa Et')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setCustomId('kurulum_iptal')
      .setLabel('Vazgeç / İptal Et')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('✖️')
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
      await i.update({
        content: `${TEMA.EMOJILER.KATANA} Kurulum iptal edildi. Kalenin yapısı korundu.`,
        embeds: [],
        components: []
      });
      collector.stop();
      return;
    }

    if (i.customId === 'kurulum_onayla') {
      await i.update({
        content: `⛩️ **Kale inşası başladı...** Kanallar, roller ve gizli gölge odaları inşa ediliyor, lütfen bekleyiniz...`,
        embeds: [],
        components: []
      });
      collector.stop();

      try {
        // 1. Rolleri İnşa Et
        const roller = {};

        // Gölge Genin (Yeni Üye)
        roller.genin = await guild.roles.create({
          name: '📜 Gölge Genin',
          color: 0x95a5a6,
          reason: 'Kage Otomatik Kurulum'
        });

        // Chunin (Okur)
        roller.chunin = await guild.roles.create({
          name: '🏮 Chunin',
          color: 0x3498db,
          reason: 'Kage Otomatik Kurulum'
        });

        // Jonin (Kıdemli)
        roller.jonin = await guild.roles.create({
          name: '🗡️ Jonin',
          color: TEMA.RENKLER.GOLGE_KIRMIZISI,
          reason: 'Kage Otomatik Kurulum'
        });

        // Anbu (Moderatör)
        roller.anbu = await guild.roles.create({
          name: '🥷 Anbu',
          color: TEMA.RENKLER.KAN_KIRMIZISI,
          permissions: [
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ModerateMembers,
            PermissionFlagsBits.ManageChannels
          ],
          reason: 'Kage Otomatik Kurulum'
        });

        // Kage (Yönetici)
        roller.kage = await guild.roles.create({
          name: '👑 Kage',
          color: TEMA.RENKLER.ALTIN,
          permissions: [PermissionFlagsBits.Administrator],
          reason: 'Kage Otomatik Kurulum'
        });

        const everyone = guild.roles.everyone;

        // 2. Kategori 1: ⛩️ BİLGİLENDİRME
        const katBilgi = await guild.channels.create({
          name: '⛩️ BİLGİLENDİRME',
          type: ChannelType.GuildCategory
        });

        const kurallar = await guild.channels.create({
          name: '📜・kurallar',
          type: ChannelType.GuildText,
          parent: katBilgi.id,
          permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
        });

        const duyurular = await guild.channels.create({
          name: '🏮・duyurular',
          type: ChannelType.GuildText,
          parent: katBilgi.id,
          permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
        });

        const yeniBolumler = await guild.channels.create({
          name: '🩸・yeni-bölümler',
          type: ChannelType.GuildText,
          parent: katBilgi.id,
          permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
        });

        const hosgeldiniz = await guild.channels.create({
          name: '⛩️・hoş-geldiniz',
          type: ChannelType.GuildText,
          parent: katBilgi.id,
          permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
        });

        // 3. Kategori 2: 💬 TOPLULUK & SOHBET
        const katSohbet = await guild.channels.create({
          name: '💬 TOPLULUK & SOHBET',
          type: ChannelType.GuildCategory
        });

        const genelSohbet = await guild.channels.create({
          name: '💬・genel-sohbet',
          type: ChannelType.GuildText,
          parent: katSohbet.id
        });

        await guild.channels.create({
          name: '📖・manga-tartışma',
          type: ChannelType.GuildText,
          parent: katSohbet.id
        });

        await guild.channels.create({
          name: '⚠️・spoiler-odası',
          type: ChannelType.GuildText,
          parent: katSohbet.id
        });

        await guild.channels.create({
          name: '🎨・medya-ve-çizim',
          type: ChannelType.GuildText,
          parent: katSohbet.id
        });

        await guild.channels.create({
          name: '🤖・bot-komut',
          type: ChannelType.GuildText,
          parent: katSohbet.id
        });

        // 4. Kategori 3: 🎮 KAGE INDIE OYUN
        const katOyun = await guild.channels.create({
          name: '🎮 KAGE INDIE OYUN',
          type: ChannelType.GuildCategory
        });

        await guild.channels.create({
          name: '⚔️・oyun-duyuru',
          type: ChannelType.GuildText,
          parent: katOyun.id,
          permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
        });

        await guild.channels.create({
          name: '📜・geliştirici-günlüğü',
          type: ChannelType.GuildText,
          parent: katOyun.id,
          permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
        });

        await guild.channels.create({
          name: '🐛・test-ve-hata-bildir',
          type: ChannelType.GuildText,
          parent: katOyun.id
        });

        // 5. Kategori 4: 🔊 SES ODALARI
        const katSes = await guild.channels.create({
          name: '🔊 SES MECLİSİ',
          type: ChannelType.GuildCategory
        });

        await guild.channels.create({
          name: '🏮 Gölge Tapınağı',
          type: ChannelType.GuildVoice,
          parent: katSes.id
        });

        await guild.channels.create({
          name: '🗡️ Samuray Meclisi',
          type: ChannelType.GuildVoice,
          parent: katSes.id
        });

        await guild.channels.create({
          name: '📜 Sessiz Okuma Odası',
          type: ChannelType.GuildVoice,
          parent: katSes.id
        });

        // 6. Kategori 5: 🛡️ YÖNETİM & GÖLGE VEZİRİ (Gizli Oda)
        const katYonetim = await guild.channels.create({
          name: '🛡️ YÖNETİM & GÖLGE ODASI',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: roller.anbu.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: roller.kage.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
          ]
        });

        const yonetimSohbet = await guild.channels.create({
          name: '🥷・yönetim-sohbet',
          type: ChannelType.GuildText,
          parent: katYonetim.id
        });

        const aiKanal = await guild.channels.create({
          name: '🧠・ai-gölge-veziri',
          type: ChannelType.GuildText,
          parent: katYonetim.id
        });

        const modLogKanal = await guild.channels.create({
          name: '📜・mod-log',
          type: ChannelType.GuildText,
          parent: katYonetim.id
        });

        // 7. Otomatik Ayarları Kage Veritabanına Bağla
        sunucuAyarGuncelle(guild.id, {
          modLogKanalId: modLogKanal.id,
          otoRolId: roller.genin.id,
          hosgeldinKanalId: hosgeldiniz.id,
          aiYonetimKanalId: aiKanal.id
        });

        // Kurallar ve Başlangıç Bildirimi Gönder
        const kuralEmbed = kageEmbed({
          baslik: 'KALE KANUNLARI (KURALLAR)',
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          aciklama: `Kage kalesine adım atan her samuray bu kadim kanunlara uymakla yükümlüdür:\n\n` +
            `**1. Onur ve Saygı:** Sunucu üyelerine ve klan arkadaşlarına hakaret, küfür veya aşağılama yasaktır.\n` +
            `**2. Gölgelerde Gizlilik (Spoiler):** Yeni bölümler hakkında konuşurken ${katSohbet} altındaki spoiler odasını kullanın.\n` +
            `**3. Reklam ve Taciz Yasağı:** Özelden veya kanallardan yetkisiz link, sunucu daveti veya spam paylaşımı kılıçla cezalandırılır.\n` +
            `**4. Yetkililere İtaat:** Anbu ve Kage unvanlı yöneticilerin kararları nihaidir.\n\n` +
            `*Sessizce oku, derinlere in.*`
        });
        await kurallar.send({ embeds: [kuralEmbed] });

        // AI Kanalına Başlangıç Mesajı
        const aiBaslangicEmbed = kageEmbed({
          baslik: 'GÖLGE VEZİRİ HİZMETİNİZDE',
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          aciklama: `Selam olsun kale yöneticileri!\n\nBu kanalda bana dilediğiniz gibi soru sorabilir, sunucu için yeni kurallar, duyurular ve etkinlikler hazırlatabilirsiniz. Beni etiketlemenize gerek yoktur, bu kanala yazılan her mesajı bizzat yanıtlayacağım.`
        });
        await aiKanal.send({ embeds: [aiBaslangicEmbed] });

        // Kurulum Tamamlandı Embed'i
        const tamamlandiEmbed = kageEmbed({
          baslik: 'KALE İNŞAATI BAŞARIYLA TAMAMLANDI! ⛩️',
          renk: TEMA.RENKLER.BASARI,
          aciklama: `Tebrikler ${interaction.user}! **${guild.name}** sunucusu Kage samuray, manga ve oyun mimarisiyle baştan aşağı donatıldı.\n\n` +
            `✅ **Roller Oluşturuldu:** <@&${roller.kage.id}>, <@&${roller.anbu.id}>, <@&${roller.jonin.id}>, <@&${roller.chunin.id}>, <@&${roller.genin.id}>\n` +
            `✅ **Mod-Log Bağlandı:** ${modLogKanal}\n` +
            `✅ **Oto-Rol Ayarlandı:** <@&${roller.genin.id}>\n` +
            `✅ **Hoş Geldin Kanalı:** ${hosgeldiniz}\n` +
            `✅ **Yapay Zeka Vezir Kanalı:** ${aiKanal}\n\n` +
            `Kaleniz savunmaya ve topluluğa hazır!`,
          alanlar: [
            { name: 'İlk Adımınız', value: `Kendinize <@&${roller.kage.id}> rolünü verin ve ${genelSohbet} kanalında topluluğunuzu selamlayın!` }
          ]
        });

        await interaction.channel.send({ embeds: [tamamlandiEmbed] });

      } catch (hata) {
        console.error('[SunucuKur Hatası]:', hata);
        await interaction.channel.send({
          content: `❌ Kurulum sırasında bir hata meydana geldi: ${hata.message}\nLütfen botun rolünün en üstte olduğundan ve 'Yönetici' yetkisi bulunduğundan emin olun.`
        });
      }
    }
  });
}
