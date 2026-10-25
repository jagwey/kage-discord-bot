import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('oyun')
  .setDescription('Geliştirilmekte olan Kage 95 indie oyunu, konusu, evreni ve devlog bilgileri.');

export async function execute(interaction) {
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';

  const embed = kageEmbed({
    baslik: 'KAGE 95 INDIE OYUN PROJESİ • GÖLGENİN YOLU',
    renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
    aciklama: `**Kage 95**, manga okuma platformunun derinleşen felsefesinden doğan, atmosferik ve karanlık bir aksiyon-gizlilik samuray indie oyunudur.\n\n${TEMA.EMOJILER.KATANA} *"Kılıç çekildiğinde gölgeler konuşmayı keser."*`,
    alanlar: [
      {
        name: `${TEMA.EMOJILER.TORII} Evren & Hikaye (Lore)`,
        value: 'Feodal Japonya\'nın karanlık mistisizmi ile harmanlanmış distopik bir çağ. Dağılan klanların ardında kalan lanetli parşömenleri korumak ve kan davasını sonlandırmakla görevli son gölge suikastçısının intikam yolculuğu.',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.OYUN} Oyun Mekanikleri`,
        value: '• Hassas parry ve kılıç vuruş fiziği\n• Gölgelerden sızma ve gizlilik (Stealth)\n• Dinamik gece/gündüz ve hava durumu\n• Manga platformuyla entegre gizli paskalya yumurtaları (Easter Eggs)',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.GOLGE} Geliştirici`,
        value: '**Jagwey** (Kage 95 Kurucusu & Bağımsız Oyun Geliştiricisi)',
        inline: true
      },
      {
        name: `${TEMA.EMOJILER.ZAMAN} Durum`,
        value: '`Erken Geliştirme (Pre-Alpha)`',
        inline: true
      },
      {
        name: `${TEMA.EMOJILER.ALEV} Motor / Tür`,
        value: 'Action-Adventure / Hack & Slash',
        inline: true
      }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Kage 95 Platformu')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setLabel('Jagwey Geliştirici Günlüğü')
      .setURL(`${siteUrl}#devlog`)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN)
  );

  return interaction.reply({ embeds: [embed], components: [row] });
}
