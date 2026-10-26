import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { eskiKanallariTemizle, eskiRolleriTemizle, kageMimarisiInsaEt } from '../services/sunucuMimarisiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sunucu-sifirla')
  .setDescription('Mevcut TÜM kanalları ve eski rolleri temizleyip Kage 95 mimarisini sıfırdan kurar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  // Anında defer et ki Discord 3 saniyelik zaman aşımına düşmesin
  await interaction.deferReply();
  const guild = interaction.guild;

  const uyariEmbed = kageEmbed({
    baslik: '⚠️ KRİTİK UYARI • SUNUCUYU TAM SIFIRLA VE YENİDEN İNŞA ET',
    renk: TEMA.RENKLER.HATA,
    aciklama: `**DİKKAT!** Bu komut **${guild.name}** sunucusundaki **TÜM ESKİ KANALLARI** ve rolleri temizleyip Kage 95 manga & oyun düzenini sıfırdan kurar.\n\n` +
      `🔥 **Yapılacak İşlemler:**\n` +
      `1. Eski tüm ses, metin ve kategori kanalları istisnasız silinecektir.\n` +
      `2. Eski silinebilir roller temizlenecektir.\n` +
      `3. Kage 95 Punk-Manga tarzı estetik kutulu kategoriler ve kanallar inşa edilecektir:\n` +
      `   • \`╭━━━ ⛩️ GİRİŞ & BİLGİ ━━━╮\` (Kayıt kapısı, kurallar, duyuru, manga yayınları, devlog)\n` +
      `   • \`╭━━━ 💬 GÖLGE TOPLULUĞU ━━━╮\` (Sohbet, tartışma, anime, fan-art, komutlar)\n` +
      `   • \`╭━━━ ⚔️ ARENA & RYO BAHİS ━━━╮\` (Düellolar, kumar/zar, zindan seferleri)\n` +
      `   • \`╭━━━ 🔮 YAPAY ZEKA MABEDİ ━━━╮\` (Gölge veziri AI sohbeti)\n` +
      `   • \`╭━━━ 🔒 ŞOGUN KALESİ ━━━╮\` (Yetkili meclisi, moderasyon & ceza sicil log)\n` +
      `   • \`╭━━━ 🔊 SAMURAY SES ODALARI ━━━╮\` (Klan meclisleri, manga okuma, müzik)\n` +
      `4. Butonlu kayıt sistemi (\`#kayıt-kapısı\`) anında aktif edilecek ve kurucuya Şogun yetkisi verilecektir.\n\n` +
      `Bu işlemi onaylıyor musunuz? (Bu işlem geri alınamaz!)`,
    altMetin: `Kage 95 Sıfırlama Protokolü`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sifirla_onayla')
      .setLabel('Evet, Eski Her Şeyi Sil ve Yeniden Kur')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('💣'),
    new ButtonBuilder()
      .setCustomId('sifirla_iptal')
      .setLabel('Vazgeç / İptal')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
  );

  const yanit = await interaction.editReply({
    embeds: [uyariEmbed],
    components: [row]
  });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu kararı sadece sunucu yöneticisi verebilir.', flags: MessageFlags.Ephemeral });
    }

    if (i.customId === 'sifirla_iptal') {
      collector.stop();
      return i.update({
        content: '⛩️ Sıfırlama işlemi iptal edildi. Kaleniz korundu.',
        embeds: [],
        components: []
      });
    }

    if (i.customId === 'sifirla_onayla') {
      collector.stop();
      await i.deferUpdate();
      await interaction.editReply({
        content: '💣 **Sıfırlama başlatıldı...** Eski kanallar ve roller tamamen siliniyor, Kage 95 düzeni kuruluyor... (Bu işlem ~15-20 saniye sürer)',
        embeds: [],
        components: []
      });

      try {
        const cmdChannelId = interaction.channelId;

        // 1. Eski kanalları temizle (komutun çalıştığı kanal hariç tutulur ki yanıt kesilmesin)
        await eskiKanallariTemizle(guild, cmdChannelId);

        // 2. Eski rolleri temizle
        await eskiRolleriTemizle(guild);

        // 3. Sıfırdan Kage mimarisini kur
        const sonuclar = await kageMimarisiInsaEt(guild, interaction);

        // 4. Bilgilendirme yap
        await interaction.editReply({
          content: `⛩️ **KAGE 95 DÜZENİ BAŞARIYLA KURULDU!**\n\n` +
            `• Tüm eski kanallar ve gereksiz roller temizlendi.\n` +
            `• Yeni kutulu kategoriler ve kanallar inşa edildi.\n` +
            `• ${sonuclar.kayitKapisi} kanalına kayıt paneli yerleştirildi.\n` +
            `• ${sonuclar.mangaDuyuru} kanalı kage95.com manga yayınlarına bağlandı.\n\n` +
            `*Geçici olan bu komut kanalı 5 saniye içinde kendini imha edecektir...*`,
          embeds: [],
          components: []
        });

        // 5. Komutun yazıldığı eski kanalı da silerek sunucuyu tamamen tertemiz bırak
        setTimeout(async () => {
          try {
            const cmdChan = await guild.channels.fetch(cmdChannelId).catch(() => null);
            if (cmdChan) {
              await cmdChan.delete('Kage sıfırlama tamamlandı, geçici kanal imha edildi.');
            }
          } catch {}
        }, 5000);

      } catch (err) {
        console.error('[SunucuSifirla Hatası]:', err);
        await interaction.editReply({
          content: `❌ Sıfırlama sırasında beklenmedik bir hata oluştu: ${err.message}`,
          embeds: [],
          components: []
        });
      }
    }
  });
}
