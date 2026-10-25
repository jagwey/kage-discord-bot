import { Events } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const name = Events.InteractionCreate;

/**
 * Kullanıcı etkileşimlerini (Slash Komutları & Autocomplete) karşılar
 * @param {import('discord.js').Interaction} interaction
 */
export async function execute(interaction) {
  // 1. Autocomplete (Otomatik tamamlama) etkileşimi
  if (interaction.isAutocomplete()) {
    const komut = interaction.client.commands.get(interaction.commandName);
    if (!komut || !komut.autocomplete) return;

    try {
      await komut.autocomplete(interaction);
    } catch (err) {
      console.error(`[InteractionCreate] Autocomplete (${interaction.commandName}) hatası:`, err.message);
    }
    return;
  }

  // 2. ChatInputCommand (Eğik çizgi komutu) etkileşimi
  if (interaction.isChatInputCommand()) {
    const komut = interaction.client.commands.get(interaction.commandName);

    if (!komut) {
      console.warn(`[InteractionCreate] Tanımlanmamış komut tetiklendi: ${interaction.commandName}`);
      return;
    }

    try {
      await komut.execute(interaction);
    } catch (err) {
      console.error(`[InteractionCreate] /${interaction.commandName} komutunda hata:`, err);

      const hataEmbed = kageEmbed({
        baslik: 'Gölge Hatası',
        renk: TEMA.RENKLER.HATA,
        aciklama: `${TEMA.EMOJILER.KATANA} Bu komut yürütülürken beklenmedik bir gölge sisi ortaya çıktı.\n\`\`\`${err.message}\`\`\``
      });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [hataEmbed], ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ embeds: [hataEmbed], ephemeral: true }).catch(() => null);
      }
    }
  }
}
