import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { tonAyarla, tonGetir, TONLAR } from '../services/egitimServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ton')
  .setDescription('Kage sohbet botunun ve yapay zekanın sana nasıl konuşacağını seç.')
  .addStringOption(o => o.setName('mod').setDescription('Konuşma tonu').setRequired(true)
    .addChoices(
      { name: 'Sakin', value: 'sakin' },
      { name: 'Samimi', value: 'samimi' },
      { name: 'Argo (sokak ağzı)', value: 'argo' },
      { name: 'Ayna (nasılsan öyle)', value: 'ayna' },
      { name: 'Kapat (varsayılan)', value: 'kapali' }
    ));

export async function execute(interaction) {
  const mod = interaction.options.getString('mod');
  tonAyarla(interaction.user.id, mod);
  const simdi = tonGetir(interaction.user.id);
  const metin = simdi
    ? `🎚️ Ton: **${TONLAR[simdi]}**.\nAile, din, dil ve ırk konularına hiçbir modda hakaret edilmez.`
    : '🎚️ Ton ayarı kapatıldı, varsayılan samuray üslubuna dönüldü.';
  return interaction.reply({ content: metin, flags: MessageFlags.Ephemeral });
}
