import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { gecisSatiri } from '../config/panel.js';
import { basarimDurumu } from '../services/basarimServisi.js';

export const data = new SlashCommandBuilder()
  .setName('basarim')
  .setDescription('Başarım rozetlerini ve ilerlemeni gösterir.')
  .addUserOption(o => o.setName('uye').setDescription('Rozetlerine bakılacak üye'));

export async function execute(interaction) {
  const uye = interaction.options.getUser('uye') || interaction.user;
  const durum = basarimDurumu(uye.id);
  const kazanilan = durum.filter(b => b.kazanildi);
  const satirlar = durum.map(b => b.kazanildi
    ? `${b.emoji} **${b.ad}** ✅`
    : `🔒 ${b.ad}: ${b.ilerleme}/${b.hedef} _(+${b.odul} Ryo)_`
  ).join('\n');
  return interaction.reply({
    embeds: [kageEmbed({
      baslik: `🏅 BAŞARIMLAR • ${uye.displayName || uye.username}`,
      renk: TEMA.RENKLER.ALTIN,
      aciklama: `**${kazanilan.length}/${durum.length}** rozet\n${kazanilan.map(b => b.emoji).join(' ') || 'Henüz rozet yok.'}\n\n${satirlar}`.slice(0, 4000),
      thumbnail: uye.displayAvatarURL({ size: 256 }),
      altMetin: 'Rozetler balık, zindan, boss, seri, zanaat, baskın, piyango ve klan savaşından gelir.'
    })],
    components: [gecisSatiri('gorev', 'zindan', 'balik', 'envanter')]
  });
}
