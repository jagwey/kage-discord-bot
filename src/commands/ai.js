import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { aiDanis } from '../services/aiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('Kage 95 yapay zeka gölge vezirine sunucu yönetimi veya metin hazırlama için danışın.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(option =>
    option
      .setName('talimat')
      .setDescription('Danışmak istediğiniz soru, moderasyon kararı veya hazırlatmak istediğiniz duyuru')
      .setRequired(true)
  );

export async function execute(interaction) {
  // Yönetici kontrolü
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: `${TEMA.EMOJILER.KATANA} Bu komut sadece sunucu yöneticilerine ve moderatörlere açıktır.`,
      ephemeral: true
    });
  }

  await interaction.deferReply();
  const talimat = interaction.options.getString('talimat');

  try {
    const { cevap, saglayici } = await aiDanis(talimat);

    // Discord embed açıklama sınırı 4096 karakterdir
    const formatliCevap = cevap.length > 4000 ? cevap.slice(0, 3990) + '...\n*(Uzun metin kesildi)*' : cevap;

    const embed = kageEmbed({
      baslik: `⛩️ GÖLGE VEZİRİ CEVABI • Kage-95`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: formatliCevap,
      alanlar: [
        {
          name: `${TEMA.EMOJILER.PARSOMEN} Danışılan Konu`,
          value: `*${talimat.length > 250 ? talimat.slice(0, 247) + '...' : talimat}*`,
          inline: false
        }
      ],
      altMetin: `Kage-95 AI Danışmanı • İsteyen: ${interaction.user.tag}`
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[AI Komutu] Hata:', err.message);
    const hataEmbed = kageEmbed({
      baslik: 'Yapay Zeka Bağlantı Hatası',
      renk: TEMA.RENKLER.HATA,
      aciklama: `Gölge veziriyle iletişim kurulurken bir aksaklık yaşandı:\n\`\`\`${err.message}\`\`\``
    });
    return interaction.editReply({ embeds: [hataEmbed] });
  }
}
