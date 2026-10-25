import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, ryoEkle, ryoDus } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('yazitura')
  .setDescription('Ryo ile yazı-tura atar; kazanırsanız bahsinizin 2 katını alırsınız.')
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription('Ortaya koymak istediğiniz Ryo miktarı')
      .setRequired(true)
      .setMinValue(10)
  )
  .addStringOption(opt =>
    opt.setName('secim')
      .setDescription('Yazı mı Tura mı?')
      .setRequired(true)
      .addChoices(
        { name: '🪙 Yazı', value: 'yazi' },
        { name: '🪙 Tura', value: 'tura' }
      )
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bahis = interaction.options.getInteger('bahis');
  const secim = interaction.options.getString('secim');
  const bakiye = bakiyeGetir(userId);

  if (bakiye.ryo < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanınızda \`${bakiye.ryo} Ryo\` var, istenen bahis: \`${bahis} Ryo\`.`,
      ephemeral: true
    });
  }

  // Bahsi düş
  ryoDus(userId, bahis);

  const sonuc = Math.random() < 0.5 ? 'yazi' : 'tura';
  const kazandi = secim === sonuc;
  const sonucMetni = sonuc === 'yazi' ? '🪙 Yazı' : '🪙 Tura';

  if (kazandi) {
    const kazanc = bahis * 2;
    ryoEkle(userId, kazanc);
    const yeniBakiye = bakiyeGetir(userId).ryo;

    const embed = kageEmbed({
      baslik: '🎉 KAZANDINIZ! • BOZUK PARA BAHİSİ',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `Kızıl para havada taklalar attı ve yere düştü: **${sonucMetni}**!\n\n` +
        `Tahmininiz doğru çıktı! Ortadaki parayı kaptınız.\n\n` +
        `💰 **Kazanılan:** \`+${bahis} Ryo\` (Toplam Ödeme: \`${kazanc} Ryo\`)\n` +
        `🪙 **Yeni Bakiyeniz:** \`${yeniBakiye} Ryo\``,
      footer: `Kage Kumarcı Köşesi • Şans seninleydi!`
    });

    return interaction.reply({ embeds: [embed] });
  } else {
    const yeniBakiye = bakiyeGetir(userId).ryo;

    const embed = kageEmbed({
      baslik: '💀 KAYBETTİNİZ • BOZUK PARA BAHİSİ',
      renk: TEMA.RENKLER.HATA,
      aciklama: `Kızıl para havada taklalar attı ve yere düştü: **${sonucMetni}**!\n\n` +
        `Tahmininiz tutmadı ve bahsiniz kumarcının kasasına gitti.\n\n` +
        `💸 **Kaybedilen:** \`-${bahis} Ryo\`\n` +
        `🪙 **Kalan Bakiyeniz:** \`${yeniBakiye} Ryo\``,
      footer: `Kage Kumarcı Köşesi • Bir dahaki sefere...`
    });

    return interaction.reply({ embeds: [embed] });
  }
}
