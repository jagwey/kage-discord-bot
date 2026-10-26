import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { changelogYukle, guncellemeKartiOlustur, kageDevKontrolEtVeDuyur } from '../services/kageDevServisi.js';

export const data = new SlashCommandBuilder()
  .setName('guncelleme')
  .setDescription('Kage botun son güncelleme notlarını, yeni özelliklerini ve yama detaylarını gösterir.')
  .addBooleanOption(option =>
    option
      .setName('kanala_duyur')
      .setDescription('Yöneticiyseniz bu güncellemeyi #kage-dev kanalında resmi olarak duyurur.')
      .setRequired(false)
  );

export async function execute(interaction) {
  const kanalaDuyur = interaction.options.getBoolean('kanala_duyur');

  if (kanalaDuyur) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '⛩️ Bu güncellemeyi resmi olarak kanala duyurmak için **Yönetici** yetkisine sahip olmalısınız.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await kageDevKontrolEtVeDuyur(interaction.client, true);
    return interaction.editReply({
      content: '✅ Güncelleme notları **#kage-dev** kanalına başarıyla gönderildi!'
    });
  }

  const changelog = changelogYukle();
  const { embed, row } = guncellemeKartiOlustur(changelog, interaction.client);

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
