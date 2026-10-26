import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { gunlukAl } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('gunluk')
  .setDescription('Günlük Ryo maaşınızı alır ve kesintisiz giriş serinizi (streak) yükseltirsiniz.');

export async function execute(interaction) {
  const sonuc = gunlukAl(interaction.user.id);

  if (!sonuc.basarili) {
    const embed = kageEmbed({
      baslik: '⏳ GÜNLÜK RYO HENÜZ YENİLENMEDİ',
      renk: TEMA.RENKLER.UYARI_SARI,
      aciklama: `Gölge veziri sandığı henüz doldurmadı. Yeni maaşını almak için biraz daha sabretmelisin.\n\n${TEMA.EMOJILER.ZAMAN} **Kalan Süre:** \`${sonuc.kalanSure}\``,
      altMetin: `Kage 95 Ekonomi Sistemi • ${interaction.user.username}`
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const embed = kageEmbed({
    baslik: '💰 GÜNLÜK RYO KASAYA EKLENDİ!',
    renk: TEMA.RENKLER.BASARI,
    aciklama: `Tebrikler samuray! Sadakatin için ödüllendirildin.\n\n*${rastgeleSlogan()}*`,
    thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
    alanlar: [
      { name: '🪙 Kazanılan', value: `\`+${sonuc.kazanc} Ryo\``, inline: true },
      { name: '🔥 Giriş Serisi (Streak)', value: `\`${sonuc.streak} Gün\``, inline: true },
      { name: '🏦 Güncel Cüzdan', value: `\`${sonuc.yeniBakiye} Ryo\``, inline: true }
    ],
    altMetin: `Her gün gelerek seri çarpanını artırabilirsin! (Maks +500 Ryo)`
  });

  return interaction.reply({ embeds: [embed] });
}
