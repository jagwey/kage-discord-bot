import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { BILET_FIYATI, MAKS_BILET, biletAl, piyangoDurumu } from '../services/piyangoServisi.js';

export const data = new SlashCommandBuilder()
  .setName('piyango')
  .setDescription('Haftalık piyango: bilet al, pazartesi gece yarısı çekiliş otomatik yapılır.')
  .addSubcommand(s => s
    .setName('bilet')
    .setDescription(`Bilet al (tanesi ${BILET_FIYATI} Ryo, haftada en fazla ${MAKS_BILET}).`)
    .addIntegerOption(o => o.setName('adet').setDescription('Bilet sayısı').setMinValue(1).setMaxValue(MAKS_BILET)))
  .addSubcommand(s => s.setName('durum').setDescription('Havuzu, biletlerini ve şansını gösterir.'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (sub === 'bilet') {
    const s = biletAl(userId, interaction.options.getInteger('adet') ?? 1);
    if (!s.basarili) return interaction.reply({ content: `❌ ${s.mesaj}`, flags: MessageFlags.Ephemeral });
    const d = piyangoDurumu(userId);
    return interaction.reply({
      content: `🎟️ ${s.adet} bilet aldın (${ryoYaz(s.bedel)}). Bu hafta **${s.toplamim}** biletin var, şansın **%${(d.sansim * 100).toFixed(1)}**. Havuz: ${ryoYaz(d.havuz)}`
    });
  }

  const d = piyangoDurumu(userId);
  const son = d.sonCekilis
    ? `<@${d.sonCekilis.kazanan}> ${ryoYaz(d.sonCekilis.ikramiye)} kazandı (${d.sonCekilis.biletSayisi} bilet).`
    : 'Henüz çekiliş yapılmadı.';
  return interaction.reply({
    embeds: [kageEmbed({
      baslik: '🎟️ HAFTALIK PİYANGO',
      renk: TEMA.RENKLER.ALTIN,
      aciklama: 'Talih kuşu her pazartesi gece yarısı bir samurayın omzuna konar. Ne kadar çok bilet, o kadar çok şans.',
      alanlar: [
        { name: 'Havuz', value: ryoYaz(d.havuz), inline: true },
        { name: 'Toplam bilet', value: `${d.toplamBilet} (${d.katilimci} kişi)`, inline: true },
        { name: 'Çekiliş', value: `<t:${Math.floor(d.cekilis / 1000)}:R>`, inline: true },
        { name: 'Senin biletin', value: `${d.benim}/${MAKS_BILET} • şans %${(d.sansim * 100).toFixed(1)}`, inline: true },
        { name: 'Son çekiliş', value: son, inline: false }
      ],
      altMetin: `Bilet ${BILET_FIYATI} Ryo. Gelirin %90'ı havuza gider.`
    })]
  });
}
