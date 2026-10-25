import { Events } from 'discord.js';

export const name = Events.GuildCreate;

/**
 * Bot yeni bir sunucuya eklendiğinde komutları anında o sunucuya yükler
 * @param {import('discord.js').Guild} guild
 */
export async function execute(guild) {
  try {
    const komutlar = guild.client.commands.map(cmd => cmd.data.toJSON());
    await guild.client.application.commands.set(komutlar, guild.id);
    console.log(`[GuildCreate] Bot yeni sunucuya katıldı: ${guild.name} (${guild.id}) - ${komutlar.length} komut anında yüklendi.`);
  } catch (err) {
    console.error(`[GuildCreate] Komutlar yeni sunucuya yüklenemedi (${guild.name}):`, err.message);
  }
}
