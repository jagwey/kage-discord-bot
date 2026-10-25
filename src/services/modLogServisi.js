import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';

/**
 * Moderasyon eylemlerini yapılandırılmış mod-log kanalına iletir
 * @param {import('discord.js').Guild} guild
 * @param {Object} logBilgisi
 */
export async function modLogGonder(guild, logBilgisi) {
  if (!guild) return;

  const ayarlar = sunucuAyarGetir(guild.id);
  const logKanalId = ayarlar.modLogKanalId || process.env.MOD_LOG_CHANNEL_ID;
  if (!logKanalId) return;

  try {
    const kanal = await guild.channels.fetch(logKanalId).catch(() => null);
    if (!kanal || !kanal.isTextBased()) return;

    const embed = kageEmbed({
      baslik: logBilgisi.baslik || 'MODERASYON DENETİM KAYDI',
      renk: logBilgisi.renk || TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: logBilgisi.aciklama,
      thumbnail: logBilgisi.hedefAvatar || null,
      alanlar: logBilgisi.alanlar || []
    });

    await kanal.send({ embeds: [embed] });
  } catch (err) {
    console.error('[ModLogServisi] Log iletilemedi:', err.message);
  }
}
