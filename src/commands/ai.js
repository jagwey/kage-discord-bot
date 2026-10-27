import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA } from '../config/tema.js';
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
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply();
  const talimat = interaction.options.getString('talimat');

  try {
    const { cevap } = await aiDanis(talimat, {
      guild: interaction.guild,
      channel: interaction.channel,
      member: interaction.member,
      client: interaction.client
    });

    // Sohbetteki gibi düz mesaj; uzun cevap 2000 karakterlik parçalara bölünür
    const parcalar = (cevap || '...').match(/[\s\S]{1,1970}/g);
    parcalar[parcalar.length - 1] += '\n-# Kage-Gemini';
    await interaction.editReply({ content: parcalar[0] });
    for (const parca of parcalar.slice(1)) await interaction.followUp({ content: parca });
  } catch (err) {
    console.error('[AI Komutu] Hata:', err.message);
    return interaction.editReply({ content: 'şu an bağlanamadım, birazdan tekrar dene' });
  }
}
