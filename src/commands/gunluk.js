import { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { gunlukAl, seriKalkaniAl, bakiyeGetir, SERI_KALKANI_FIYAT, SERI_KALKANI_MAKS } from '../services/ekonomiServisi.js';
import { oyunOlayi } from '../services/oyunOlayServisi.js';

export const butonOnek = 'kage_gunluk:';

function kalkanSatiri(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${butonOnek}kalkan:${userId}`)
      .setLabel(`Seri Kalkanı Al (${SERI_KALKANI_FIYAT} Ryo)`)
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Secondary)
  );
}

export async function buton(interaction) {
  const [, eylem, sahip] = interaction.customId.split(':');
  if (eylem !== 'kalkan') return;
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: '❌ Bu buton senin için değil. Kendi `/gunluk` ekranını aç.', flags: MessageFlags.Ephemeral });
  }
  const sonuc = seriKalkaniAl(interaction.user.id);
  if (!sonuc.basarili) return interaction.reply({ content: `❌ ${sonuc.mesaj}`, flags: MessageFlags.Ephemeral });
  return interaction.reply({
    content: `🛡️ Seri kalkanı alındı. Elinde **${sonuc.kalkan}/${SERI_KALKANI_MAKS}** kalkan var. Bir günü kaçırırsan serin bozulmaz. Kalan: **${sonuc.kalanRyo} Ryo**`,
    flags: MessageFlags.Ephemeral
  });
}

export const data = new SlashCommandBuilder()
  .setName('gunluk')
  .setDescription('Günlük Ryo maaşınızı alır ve kesintisiz giriş serinizi (streak) yükseltirsiniz.');

export async function execute(interaction) {
  const sonuc = gunlukAl(interaction.user.id);

  if (!sonuc.basarili) {
    const embed = kageEmbed({
      baslik: '⏳ GÜNLÜK RYO HENÜZ YENİLENMEDİ',
      renk: TEMA.RENKLER.UYARI_SARI,
      aciklama: `Gölge veziri sandığı henüz doldurmadı. Yeni maaşını almak için biraz daha sabretmelisin.\n\n${TEMA.EMOJILER.ZAMAN} **Kalan Süre:** \`${sonuc.kalanSure}\`\n🛡️ **Seri Kalkanı:** ${bakiyeGetir(interaction.user.id).seriKalkani}/${SERI_KALKANI_MAKS}`,
      altMetin: `Kage 95 Ekonomi Sistemi • ${interaction.user.username}`
    });
    return interaction.reply({ embeds: [embed], components: [kalkanSatiri(interaction.user.id)], flags: MessageFlags.Ephemeral });
  }

  const notlar = oyunOlayi(interaction.user.id, 'seri', { deger: sonuc.streak }).notlar;
  if (sonuc.donumBonusu) notlar.unshift(`🎉 **${sonuc.streak}. gün dönüm ödülü:** +${sonuc.donumBonusu} Ryo`);
  if (sonuc.kalkanKullanildi) notlar.unshift(`🛡️ Kaçırdığın günü seri kalkanı karşıladı. Kalan kalkan: **${sonuc.kalanKalkan}**`);

  const embed = kageEmbed({
    baslik: '💰 GÜNLÜK RYO KASAYA EKLENDİ!',
    renk: TEMA.RENKLER.BASARI,
    aciklama: `Tebrikler samuray! Sadakatin için ödüllendirildin.\n\n*${rastgeleSlogan()}*` + (notlar.length ? `\n\n${notlar.join('\n')}` : ''),
    thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
    alanlar: [
      { name: '🪙 Kazanılan', value: `\`+${sonuc.kazanc} Ryo\``, inline: true },
      { name: '🔥 Giriş Serisi (Streak)', value: `\`${sonuc.streak} Gün\``, inline: true },
      { name: '🏦 Güncel Cüzdan', value: `\`${sonuc.yeniBakiye} Ryo\``, inline: true }
    ],
    altMetin: `Seri bonusu günde +75 (en çok +1500). 7, 14 ve 30. günde dönüm ödülü var.`
  });

  return interaction.reply({ embeds: [embed], components: [kalkanSatiri(interaction.user.id)] });
}
