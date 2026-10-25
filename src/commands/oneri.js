import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { aiYanitiUret } from '../services/aiServisi.js';
import { tumMangalariGetir } from '../services/mangaServisi.js';

export const data = new SlashCommandBuilder()
  .setName('oneri')
  .setDescription('Yapay zeka gölge vezirinden zevkinize özel akıllı manga tavsiyesi alırsınız.')
  .addStringOption(opt =>
    opt.setName('istek')
      .setDescription('Ne tür manga arıyorsunuz? (Örn: Berserk gibi karanlık fantezi, Solo Leveling gibi güçlenme)')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const istek = interaction.options.getString('istek');

  // Canlı mangaları çekip AI promptuna ekleyelim ki kütüphaneden eşleştirsin
  let mevcutMangalarMetni = '';
  try {
    const mangalar = await tumMangalariGetir();
    if (mangalar && mangalar.length > 0) {
      mevcutMangalarMetni = 'Kage 95 Kütüphanesindeki bazı seriler: ' +
        mangalar.slice(0, 15).map(m => m.mangaAdi).join(', ');
    }
  } catch {}

  const aiPrompt = `Bir manga okuru senden şu tarz bir manga önerisi istiyor: "${istek}".\n${mevcutMangalarMetni}\n\nLütfen ona 2-3 adet harika manga tavsiyesi ver. Neden seveceğini kısaca açıkla. Eğer kütüphanemizdeki serilerden uyumlu olan varsa mutlaka öncelikli belirt. Samuray/Kage üslubuyla yanıtla.`;

  try {
    const { cevap, saglayici } = await aiYanitiUret(aiPrompt);

    const embed = kageEmbed({
      baslik: `📜 GÖLGE VEZİRİ MANGA TAVSİYESİ`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**Talep:** *"${istek}"*\n\n${cevap}`,
      footer: `Yapay Zeka Motoru: Kage-95 • kage95.com`
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Kage 95 Kütüphanesine Git')
        .setURL(process.env.SITE_URL || 'https://kage95.com')
        .setStyle(ButtonStyle.Link)
        .setEmoji(TEMA.EMOJILER.TORII)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  } catch (err) {
    return interaction.editReply({
      content: `❌ Öneri hazırlanırken hata oluştu: ${err.message}`
    });
  }
}
