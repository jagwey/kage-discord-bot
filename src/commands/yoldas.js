import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { TEMA } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { bakiyeGetir, ryoDus } from '../services/ekonomiServisi.js';
import {
  YOLDAS_TURLERI,
  kullaniciYoldasGetir,
  yoldasSec,
  yoldasBesle
} from '../services/yoldasServisi.js';

export const data = new SlashCommandBuilder()
    .setName('yoldas')
    .setDescription('Zindan ve dövüşlerde sana eşlik eden kutsal gölge yoldaşını yönet.')
    .addSubcommand(sub =>
      sub
        .setName('bilgi')
        .setDescription('Mevcut yoldaşının seviyesini, gücünü ve sadakatini gösterir.')
    )
    .addSubcommand(sub =>
      sub
        .setName('sec')
        .setDescription('Kendine yeni bir gölge yoldaşı seç.')
        .addStringOption(opt =>
          opt
            .setName('tur')
            .setDescription('Seçmek istediğin yoldaş')
            .setRequired(true)
            .addChoices(
              { name: '🐺 Gölge Kurdu (+%15 Kritik Hasar)', value: 'kurt' },
              { name: '🦊 Alev Tilkisi (+%20 Ek Ryo)', value: 'tilki' },
              { name: '🦅 Mistik Kuzgun (%15 Kaçınma)', value: 'kuzgun' },
              { name: '🐉 Yeşim Ejderi (%20 Hasar Kalkanı - 2.500 Ryo)', value: 'ejder' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('besle')
        .setDescription('Yoldaşına 100 Ryo değerinde leziz et ikram et ve XP kazandır.')
    );

export async function execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'bilgi') {
      const yoldas = kullaniciYoldasGetir(userId);
      if (!yoldas) {
        return interaction.reply({
          content: '🐾 Henüz bir gölge yoldaşın yok! `/yoldas sec` komutuyla kendine bir kurt, tilki veya kuzgun seçebilirsin.',
          ephemeral: true
        });
      }

      const tur = YOLDAS_TURLERI[yoldas.turId];
      const bonusGucu = tur.bonusDeger + (yoldas.seviye - 1) * 3;
      const gerekenXp = yoldas.seviye * 100;

      const embed = new EmbedBuilder()
        .setColor(TEMA.KIRMIZI || 0xe53935)
        .setTitle(`🐾 ${interaction.user.username}'ın Gölge Yoldaşı`)
        .setDescription(`**${yoldas.ad}**\n*${tur.aciklama}*`)
        .addFields(
          { name: '⭐ Seviye', value: `**${yoldas.seviye}**`, inline: true },
          { name: '🍖 Sadakat', value: `**%${yoldas.sadakat || 100}**`, inline: true },
          { name: '✨ Yoldaş Bonusu', value: `**+${bonusGucu}% ${tur.bonusTip.toUpperCase()}**`, inline: true },
          { name: '📊 XP İlerlemesi', value: `\`${yoldas.xp || 0} / ${gerekenXp}\``, inline: false }
        )
        .setFooter({ text: 'Zindan savaşlarında otomatik olarak yanında yer alır.' });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'sec') {
      const secilenTur = interaction.options.getString('tur');
      const tur = YOLDAS_TURLERI[secilenTur];

      if (tur.fiyat > 0) {
        const bakiye = bakiyeGetir(userId);
        if (bakiye < tur.fiyat) {
          return interaction.reply({
            content: `❌ **${tur.ad}** çok nadir bir yoldaştır! Sahiplenmek için **${ryoYaz(tur.fiyat)}** gerekir (Mevcut: **${ryoYaz(bakiye)}**).`,
            ephemeral: true
          });
        }
        ryoDus(userId, tur.fiyat);
      }

      const yeni = yoldasSec(userId, secilenTur);
      return interaction.reply({
        content: `🎉 Tebrikler! **${yeni.ad}** artık senin kutsal gölge yoldaşın oldu. Artık zindanlarda seni koruyacak ve güçlendirecek!`
      });
    }

    if (sub === 'besle') {
      const bakiye = bakiyeGetir(userId);
      const UCRET = 100;

      if (bakiye < UCRET) {
        return interaction.reply({
          content: `❌ Yoldaşını lezzetli av etiyle beslemek için **${ryoYaz(UCRET)}** gerekir (Mevcut: **${ryoYaz(bakiye)}**).`,
          ephemeral: true
        });
      }

      ryoDus(userId, UCRET);
      const { yoldas, seviyeAtladi } = yoldasBesle(userId);

      let mesaj = `🍖 Yoldaşın **${yoldas.ad}** afiyetle karnını doyurdu! Sadakati ve enerjisi arttı (+35 XP).`;
      if (seviyeAtladi) {
        mesaj += `\n\n🌟 **TEBRİKLER!** Yoldaşın **Seviye ${yoldas.seviye}** oldu! Savaş bonusları daha da güçlendi.`;
      }

      return interaction.reply({ content: mesaj });
    }
  }
