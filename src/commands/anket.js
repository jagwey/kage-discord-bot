import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

const SAYI_EMOJILERI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

export const data = new SlashCommandBuilder()
  .setName('anket')
  .setDescription('Sunucuda oylama / anket başlatır.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption(opt => opt.setName('soru').setDescription('Ankette sorulacak soru').setRequired(true))
  .addStringOption(opt => opt.setName('secenek1').setDescription('1. Seçenek (veya boş bırakılırsa Evet/Hayır anketi)').setRequired(false))
  .addStringOption(opt => opt.setName('secenek2').setDescription('2. Seçenek').setRequired(false))
  .addStringOption(opt => opt.setName('secenek3').setDescription('3. Seçenek').setRequired(false))
  .addStringOption(opt => opt.setName('secenek4').setDescription('4. Seçenek').setRequired(false))
  .addStringOption(opt => opt.setName('secenek5').setDescription('5. Seçenek').setRequired(false));

export async function execute(interaction) {
  const soru = interaction.options.getString('soru');
  const secenekler = [];

  for (let i = 1; i <= 5; i++) {
    const sec = interaction.options.getString(`secenek${i}`);
    if (sec) secenekler.push(sec);
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    let aciklama = `**${soru}**\n\n`;
    let emojiler = [];

    if (secenekler.length >= 2) {
      secenekler.forEach((sec, idx) => {
        aciklama += `${SAYI_EMOJILERI[idx]} ${sec}\n\n`;
        emojiler.push(SAYI_EMOJILERI[idx]);
      });
    } else {
      aciklama += `👍 Evet / Katılıyorum\n👎 Hayır / Katılmıyorum\n`;
      emojiler = ['👍', '👎'];
    }

    const embed = kageEmbed({
      baslik: 'KAGE 95 OYLAMASI • TOPLULUK KARARI',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama,
      altMetin: `Anketi Başlatan: ${interaction.user.tag}`
    });

    const anketMesaji = await interaction.channel.send({ embeds: [embed] });

    for (const emoji of emojiler) {
      await anketMesaji.react(emoji);
    }

    return interaction.editReply({ content: 'Anket başarıyla oluşturuldu ve oylamaya açıldı.' });
  } catch (err) {
    return interaction.editReply({ content: `Anket oluşturulamadı: ${err.message}` });
  }
}
