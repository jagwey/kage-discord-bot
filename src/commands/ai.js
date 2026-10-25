import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { aiDanis } from '../services/aiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('Kage-95 yapay zekasına soru sorun veya danışın.')
  .addStringOption(option =>
    option
      .setName('talimat')
      .setDescription('Danışmak veya sormak istediğiniz konu, soru veya sohbet')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const talimat = interaction.options.getString('talimat');

  // Efendi / Sahip kontrolü
  const isSahip = (
    interaction.user.id === '682974587625275420' ||
    interaction.user.id === interaction.guild?.ownerId ||
    interaction.user.username.toLowerCase() === 'jagwey'
  );

  const kullaniciAdi = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;

  try {
    const { cevap, saglayici } = await aiDanis(talimat, {
      isSahip,
      kullaniciAdi,
      kanalAdi: interaction.channel?.name
    });

    // Discord embed açıklama sınırı 4096 karakterdir
    const formatliCevap = cevap.length > 4000 ? cevap.slice(0, 3990) + '...\n*(Uzun metin kesildi)*' : cevap;

    const embed = kageEmbed({
      baslik: isSahip ? `GÖLGE VEZİRİ CEVABI • ${saglayici}` : `KAGE-95 CEVABI • ${saglayici}`,
      renk: isSahip ? TEMA.RENKLER.KAN_KIRMIZISI : TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: formatliCevap,
      alanlar: [
        {
          name: `${TEMA.EMOJILER.PARSOMEN} ${isSahip ? 'Efendimin Buyruğu' : 'Sorulan Konu'}`,
          value: `*${talimat.length > 250 ? talimat.slice(0, 247) + '...' : talimat}*`,
          inline: false
        }
      ],
      altMetin: isSahip
        ? "Kage-95 • Efendim Jagwey'in Emrindeyim"
        : `Kage-95 AI Chatbot • İsteyen: ${kullaniciAdi}`
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[AI Komutu] Hata:', err.message);
    const hataEmbed = kageEmbed({
      baslik: 'Yapay Zeka Bağlantı Hatası',
      renk: TEMA.RENKLER.HATA,
      aciklama: `Kage-95 zihniyle iletişim kurulurken bir aksaklık yaşandı:\n\`\`\`${err.message}\`\`\``
    });
    return interaction.editReply({ embeds: [hataEmbed] });
  }
}
