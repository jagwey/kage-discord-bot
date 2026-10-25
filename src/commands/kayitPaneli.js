import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { kayitPaneliKartiOlustur } from '../services/kayitServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kayit-paneli')
  .setDescription('Mevcut kanala kalıcı, butonlu Kage kayıt paneli gönderir.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const { embed, row } = kayitPaneliKartiOlustur();

  await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  return interaction.reply({
    content: '✅ Butonlu ve modal destekli detaylı kayıt paneli bu kanala başarıyla kuruldu!',
    ephemeral: true
  });
}
