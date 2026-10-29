import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { akilliAiUret } from '../services/aiRouterServisi.js';
import { aiErisimKontrol, aiSpamKontrol } from '../services/aiErisimServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ozet')
  .setDescription('Bulunduğun kanaldaki son mesajları yapay zeka ile esprili samuray tarzında özetler.')
  .addIntegerOption(opt =>
    opt.setName('adet')
      .setDescription('Kaç adet son mesaj incelensin? (10 - 100 arası, Varsayılan: 35)')
      .setMinValue(10)
      .setMaxValue(100)
      .setRequired(false)
  );

export async function execute(interaction) {
  // 1. Yetki ve Spam Kontrolü
  const erisim = aiErisimKontrol(interaction.member, interaction.guild, interaction.client);
  if (!erisim.izin) {
    return interaction.reply({ content: erisim.sebep, flags: MessageFlags.Ephemeral });
  }

  const spam = aiSpamKontrol(interaction.user.id, 10, erisim.yetkili);
  if (!spam.izin) {
    return interaction.reply({ content: spam.sebep, flags: MessageFlags.Ephemeral });
  }

  const limit = interaction.options.getInteger('adet') || 35;
  await interaction.deferReply();

  try {
    const mesajlar = await interaction.channel.messages.fetch({ limit });
    const temizMesajlar = mesajlar
      .filter(m => !m.author.bot && m.content && m.content.length > 2)
      .map(m => `${m.member?.displayName || m.author.username}: ${m.content}`)
      .reverse();

    if (temizMesajlar.length < 3) {
      return interaction.editReply({
        content: '⚠️ Özet çıkarabilmek için kanalda yeterli kullanıcı mesajı bulunamadı samurayım.'
      });
    }

    const sohbetMetni = temizMesajlar.join('\n');
    const prompt = `Aşağıda #${interaction.channel.name} Discord kanalındaki son ${temizMesajlar.length} mesaj yer alıyor:\n\n${sohbetMetni}\n\nGÖREV: Bu konuşmaları esprili, samimi, eğlenceli ve hafif samuray havasıyla 3-5 maddelik kısa bir bülten olarak özetle. Kim ne dedi, ortamda ne döndü açık ve net olsun.`;

    const sonuc = await akilliAiUret({
      prompt,
      gorevTipi: 'ozel_baglam',
      userId: interaction.user.id,
      userName: interaction.user.username
    });

    const embed = kageEmbed({
      baslik: `📜 GÖLGE MECLİSİ ÖZETİ • #${interaction.channel.name}`,
      renk: TEMA.RENKLER.BILGI,
      aciklama: sonuc.metin,
      alanlar: [
        {
          name: '📊 Analiz Raporu',
          value: `İncelenen Mesaj: **${temizMesajlar.length} adet** • Motor: \`${sonuc.saglayici}\``,
          inline: true
        }
      ],
      altMetin: `Kanal Özeti • İsteyen: ${interaction.user.username}`
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Ozet Komutu Hatası]:', err.message);
    return interaction.editReply({
      content: `❌ Sohbet özetlenirken aksaklık oluştu: \`${err.message}\``
    });
  }
}
