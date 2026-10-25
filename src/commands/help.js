import { SlashCommandBuilder } from 'discord.js';
import { execute as yardimExecute } from './yardim.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Kage botunun tüm komutlarını ve özellik rehberini listeler (Yardım).');

export async function execute(interaction) {
  return yardimExecute(interaction);
}
