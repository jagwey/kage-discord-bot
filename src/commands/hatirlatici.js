import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import {
  hatirlaticiEkle, hatirlaticiListele, hatirlaticiSil, MAKS_METIN
} from '../services/hatirlaticiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('hatirlatici')
  .setDescription('Kage sana belirlediğin süre sonra haber verir.')
  .addSubcommand(s => s.setName('kur').setDescription('Yeni hatırlatıcı kur.')
    .addIntegerOption(o => o.setName('dakika').setDescription('Kaç dakika sonra (1 - 43200)')
      .setRequired(true).setMinValue(1).setMaxValue(43200))
    .addStringOption(o => o.setName('metin').setDescription('Neyi hatırlatayım?')
      .setRequired(true).setMaxLength(MAKS_METIN)))
  .addSubcommand(s => s.setName('liste').setDescription('Bekleyen hatırlatıcılarını göster.'))
  .addSubcommand(s => s.setName('iptal').setDescription('Bir hatırlatıcıyı sil.')
    .addStringOption(o => o.setName('id').setDescription('Listedeki hatırlatıcı kodu').setRequired(true)));

export async function execute(interaction) {
  const alt = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (alt === 'kur') {
    const sonuc = hatirlaticiEkle({
      userId,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      metin: interaction.options.getString('metin'),
      dakika: interaction.options.getInteger('dakika')
    });
    if (!sonuc.basarili) return interaction.reply({ content: `❌ ${sonuc.hata}`, ephemeral: true });
    const t = Math.floor(sonuc.hatirlatici.zaman / 1000);
    return interaction.reply({
      content: `⏰ Tamam. <t:${t}:R> (<t:${t}:t>) sana haber vereceğim. Kod: \`${sonuc.hatirlatici.id}\``,
      ephemeral: true
    });
  }

  if (alt === 'liste') {
    const liste = hatirlaticiListele(userId).sort((a, b) => a.zaman - b.zaman);
    if (!liste.length) return interaction.reply({ content: 'Bekleyen hatırlatıcın yok.', ephemeral: true });
    const embed = kageEmbed({
      baslik: '⏰ HATIRLATICILARIN',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: liste.map(h => `\`${h.id}\` • <t:${Math.floor(h.zaman / 1000)}:R> • ${h.metin}`).join('\n')
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const silindi = hatirlaticiSil(userId, interaction.options.getString('id').trim());
  return interaction.reply({
    content: silindi ? '🗑️ Hatırlatıcı silindi.' : '❌ Bu kodla senin bir hatırlatıcın yok.',
    ephemeral: true
  });
}
