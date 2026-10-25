import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { execute as sunucuKurExecute } from './sunucuKur.js';

export const data = new SlashCommandBuilder()
  .setName('sunucu-sifirla')
  .setDescription('Mevcut kanalları ve kategorileri temizleyip Kage mimarisini sıfırdan yeniden kurar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const guild = interaction.guild;

  const uyariEmbed = kageEmbed({
    baslik: '⚠️ KRİTİK UYARI • SUNUCUYU SIFIRLA VE YENİDEN KUR',
    renk: TEMA.RENKLER.HATA,
    aciklama: `**DİKKAT!** Bu komut **${guild.name}** sunucusundaki mevcut bot kanallarını temizleyip sunucuyu sıfırdan kurmak içindir.\n\n` +
      `🔥 **Ne Yapılacak?**\n` +
      `1. Botun oluşturduğu eski kanallar temizlenecektir.\n` +
      `2. Yeni roller, kayıt kapısı, ses ve sohbet odaları sıfırdan inşa edilecektir.\n` +
      `3. Butonlu kayıt kapısı tekrar kurulacaktır.\n\n` +
      `Bu işlemi gerçekleştirmek istediğinize kesinlikle emin misiniz?`,
    footer: `Bu işlem geri alınamaz!`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sifirla_onayla')
      .setLabel('Evet, Sıfırla ve Yeniden Kur')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('💣'),
    new ButtonBuilder()
      .setCustomId('sifirla_iptal')
      .setLabel('Vazgeç / İptal')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
  );

  const yanit = await interaction.reply({
    embeds: [uyariEmbed],
    components: [row],
    fetchReply: true
  });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 45000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Bu kararı sadece sunucu yöneticisi verebilir.', ephemeral: true });
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
      await i.update({
        content: '💣 **Sıfırlama başlatıldı...** Eski kanallar düzenleniyor ve Kage kalesi yeniden inşa ediliyor...',
        embeds: [],
        components: []
      });

      // Kanalları temizle (mevcut komutun çalıştığı kanal hariç veya silinebilir olanlar)
      const silinebilirKanallar = guild.channels.cache.filter(c => 
        c.id !== interaction.channelId && 
        (c.name.includes('kayıt') || c.name.includes('sohbet') || c.name.includes('kage') || c.name.includes('mod') || c.name.includes('manga') || c.name.includes('kurallar') || c.name.includes('ses'))
      );

      for (const [id, kanal] of silinebilirKanallar) {
        try {
          await kanal.delete('Kage Sunucu Sıfırlama');
        } catch {}
      }

      // Şimdi standart detaylı kurulumu çalıştır
      return sunucuKurExecute(interaction);
    }
  });
}
