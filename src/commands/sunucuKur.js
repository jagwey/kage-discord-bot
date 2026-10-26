import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { kageMimarisiInsaEt } from '../services/sunucuMimarisiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sunucu-kur')
  .setDescription('Sunucuyu detaylı samuray hiyerarşisi, kayıt kapısı, manga ve oyun odalarıyla kurar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  // Anında defer et ki Discord 3 saniyelik zaman aşımına düşmesin ("Uygulama yanıt vermedi" hatasını önler)
  await interaction.deferReply();
  const guild = interaction.guild;

  const onayEmbed = kageEmbed({
    baslik: '⛩️ DETAYLI KAGE SUNUCU MİMARİSİ KURULUMU',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**${guild.name}** sunucusu için tam teşekküllü Kage Manga & Samuray Topluluk Mimarisi inşa edilmek üzere!\n\n` +
      `📜 **Neler Kurulacak?**\n` +
      `• **Tam Teşekküllü Rol Hiyerarşisi:**\n` +
      `  👑 \`Kage (Şogun)\` • 🗡️ \`Daimyo (Yönetim)\` • 🛡️ \`Hatamoto (Muhafız)\` • 🤖 \`Bot & Muhafızlar\`\n` +
      `  ⚔️ \`Shinobi (Kayıtlı Üye)\` • 📜 \`Ronin (Kayıtsız)\` • 📖 \`Manga Okuru\` • 🎮 \`Gölge Oyuncusu\`\n` +
      `  🏆 Seviye Rolleri: \`Kage Efsanesi\`, \`Jonin Komutanı\`, \`Chunin Kıdemlisi\`, \`Genin Savaşçısı\`\n\n` +
      `• **Kayıt Sistemi & Güvenlik:**\n` +
      `  Yeni gelenler sadece \`#kayıt-kapısı\` ve \`#kadim-kurallar\`ı görür. Mührü basınca diğer tüm kanallar anında açılır!\n\n` +
      `• **Özel Kategoriler & Kanallar (Kage 95 & JagTech Punk Tasarımı):**\n` +
      `  ╭━━━ ⛩️ GİRİŞ & BİLGİ ━━━╮ (#kayıt-kapısı, #kage95-canlı-platform, #manga-yayınları, #kadim-kurallar, #kage-dev)\n` +
      `  ╭━━━ 💬 GÖLGE TOPLULUĞU ━━━╮ (#meydan-sohbeti, #manga-tartışma, #spoiler-odası, #anime-dünyası, #manga-panelleri)\n` +
      `  ╭━━━ 🔮 YAPAY ZEKA MABEDİ ━━━╮ (#gölge-veziri-ai, #ai-görsel-atölyesi, #samuray-kehaneti)\n` +
      `  ╭━━━ ⚔️ ARENA & RYO BAHİS ━━━╮ (#düello, #klan-sancakları, #yoldaş-barınağı, #zindan, #kumar, #boss, #kule, #dojo, #çekiliş)\n` +
      `  ╭━━━ 🔒 ŞOGUN KALESİ ━━━╮ (#şogun-meclisi, #ceza-sicil-log, #ekonomi-log, #bilet-log)\n` +
      `  ╭━━━ 🎫 DESTEK ━━━╮ (#destek-bileti)\n` +
      `  ╭━━━ 🔊 SAMURAY SES ODALARI ━━━╮\n\n` +
      `*Mevcut kanallar silinmez, var olan roller ve kanallar yeniden kullanılır (tekrar çalıştırmak güvenli). Tüm kanalları sıfırlamak istiyorsanız \`/sunucu-sifirla\` komutunu kullanabilirsiniz.*`,
    altMetin: `Kurulumu onaylamak için 60 saniyeniz var.`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kurulum_onayla')
      .setLabel('Evet, Mimarisiyle Birlikte Kur')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setCustomId('kurulum_iptal')
      .setLabel('İptal Et')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  const yanit = await interaction.editReply({
    embeds: [onayEmbed],
    components: [row]
  });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu kararı sadece kurulumu başlatan yönetici verebilir.', flags: MessageFlags.Ephemeral });
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
      await i.deferUpdate();
      await interaction.editReply({
        content: `⛩️ **Kage Kalesi İnşa Ediliyor...** Roller, kategoriler, kayıt kapısı ve web entegrasyonu ayarlanıyor, lütfen bekleyin...`,
        embeds: [],
        components: []
      });

      try {
        const sonuclar = await kageMimarisiInsaEt(guild, interaction);

        const basariEmbed = kageEmbed({
          baslik: '⛩️ KAGE KALESİ EKSİKSİZ İNŞA EDİLDİ!',
          renk: TEMA.RENKLER.BASARI,
          aciklama: `**Tebrikler Şogun!** Kage 95 mimarisi başarıyla kuruldu.\n\n` +
            `🏮 **Neler Yapıldı?**\n` +
            `• 14 adet samuray hiyerarşi rolü oluşturuldu ve yetkilendirildi.\n` +
            `• ${sonuclar.kayitKapisi} kanalına butonlu otomatik kayıt kapısı kuruldu.\n` +
            `• ${sonuclar.mangaDuyuru} kanalı manga ve bölüm bildirimlerine bağlandı.\n` +
            `• ${sonuclar.aiKanal} yapay zeka asistanı kanalı hazırlandı.\n` +
            `• Kage 95 web sitesi (\`kage95.com\`) ile anlık webhook dinleyicileri entegre edildi.\n\n` +
            `*Artık sunucunuz tam teşekküllü bir anime/manga & oyun kalesidir!*`
        });

        await interaction.editReply({
          content: null,
          embeds: [basariEmbed],
          components: []
        });
      } catch (err) {
        console.error('[SunucuKur Hatası]:', err);
        await interaction.editReply({
          content: `❌ Kurulum sırasında bir hata oluştu: ${err.message}`,
          embeds: [],
          components: []
        });
      }
    }
  });
}
