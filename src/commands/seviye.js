import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { seviyeDurumu, seviyeSiralamasi, sunucuSirasi } from '../services/seviyeServisi.js';

export const data = new SlashCommandBuilder()
  .setName('seviye')
  .setDescription('Sohbet seviyeni ve sunucu sıralamasını göster.')
  .setDMPermission(false)
  .addSubcommand(s => s.setName('bak').setDescription('Seviye kartını göster.')
    .addUserOption(o => o.setName('uye').setDescription('Bakılacak üye (boşsa sen)')))
  .addSubcommand(s => s.setName('siralama').setDescription('Sunucunun en yüksek seviyeli 10 üyesi.'));

function ilerlemeCubugu(ilerleme, esik, uzunluk = 12) {
  const dolu = Math.min(uzunluk, Math.round((ilerleme / esik) * uzunluk));
  return '█'.repeat(dolu) + '░'.repeat(uzunluk - dolu);
}

export async function execute(interaction) {
  if (interaction.options.getSubcommand() === 'siralama') {
    const liste = seviyeSiralamasi(interaction.guildId, 10);
    if (!liste.length) return interaction.reply({ content: 'Henüz kimse XP kazanmadı.', flags: MessageFlags.Ephemeral });
    const madalya = ['🥇', '🥈', '🥉'];
    const satirlar = liste.map((x, i) => `${madalya[i] || `**${i + 1}.**`} <@${x.userId}> • Seviye **${x.seviye}** • ${x.xp} XP`);
    return interaction.reply({
      embeds: [kageEmbed({ baslik: 'SEVİYE SIRALAMASI', renk: TEMA.RENKLER.ALTIN, aciklama: satirlar.join('\n') })],
      allowedMentions: { parse: [] }
    });
  }

  const hedef = interaction.options.getUser('uye') || interaction.user;
  if (hedef.bot) return interaction.reply({ content: 'Botların seviyesi yok.', flags: MessageFlags.Ephemeral });
  const d = seviyeDurumu(interaction.guildId, hedef.id);
  const sira = sunucuSirasi(interaction.guildId, hedef.id);
  return interaction.reply({
    embeds: [kageEmbed({
      baslik: `SEVİYE • ${hedef.username}`,
      renk: TEMA.RENKLER.BILGI,
      thumbnail: hedef.displayAvatarURL(),
      aciklama: `Seviye **${d.seviye}**\n\`${ilerlemeCubugu(d.ilerleme, d.esik)}\` ${d.ilerleme}/${d.esik} XP\n` +
        `Toplam XP: **${d.xp}** • Mesaj: **${d.mesaj}**` + (sira ? ` • Sıra: **#${sira}**` : '')
    })],
    allowedMentions: { parse: [] }
  });
}
