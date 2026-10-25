import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { zindanZaferiKaydet } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('zindan')
  .setDescription('Kage indie oyun evreninde tehlikeli bir zindana keşfe çıkarak canavarlarla savaşır ve Ryo kazanırsınız.');

const BOLGELER = [
  { ad: '⛩️ Kanlı Torii Geçidi', canavar: 'Ruhsuz Samuray Muhafızı', zorluk: 'Kolay', minRyo: 50, maxRyo: 150 },
  { ad: '🌲 Lanetli Bambu Ormanı', canavar: 'Gölge Tengu Canavarı', zorluk: 'Orta', minRyo: 120, maxRyo: 280 },
  { ad: '🏯 Harabe Şogun Kalesi', canavar: 'Kadim Oni İblisi', zorluk: 'Zor', minRyo: 250, maxRyo: 500 },
  { ad: '🌋 Yeraltı Magma Tapınağı', canavar: 'Kızıl Ejder Ruhunun Hayaleti', zorluk: 'Efsanevi', minRyo: 400, maxRyo: 800 }
];

export async function execute(interaction) {
  const bolge = BOLGELER[Math.floor(Math.random() * BOLGELER.length)];
  const sans = Math.random();

  // %75 Kazanma, %25 Pusuya Düşme
  const kazandi = sans > 0.25;

  if (!kazandi) {
    const embed = kageEmbed({
      baslik: `💀 ZİNDAN PUSUSU • ${bolge.ad}`,
      renk: TEMA.RENKLER.UYARI_SARI,
      aciklama: `**${interaction.user.username}**, ${bolge.ad} derinliklerinde ilerlerken **${bolge.canavar}** tarafından pusuya düşürüldü!\n\n` +
        `Katanan kırılmadı ama ağır darbeler aldın ve gölgelerin içine geri kaçmak zorunda kaldın. Bu seferlik ganimet alamadın.\n\n*${rastgeleSlogan()}*`,
      footer: `Kage Indie RPG • Yeniden denemek için biraz güç topla!`
    });
    return interaction.reply({ embeds: [embed] });
  }

  const kazanilanRyo = Math.floor(Math.random() * (bolge.maxRyo - bolge.minRyo + 1)) + bolge.minRyo;
  zindanZaferiKaydet(interaction.user.id, kazanilanRyo);

  const embed = kageEmbed({
    baslik: `👑 ZİNDAN TEMİZLENDİ! • ${bolge.ad}`,
    renk: TEMA.RENKLER.BASARI,
    aciklama: `**${interaction.user.username}**, katanasının tek darbesiyle **${bolge.canavar}** yaratığını ikiye böldü ve zindandaki gizli sandığı yağmaladı!\n\n*${rastgeleSlogan()}*`,
    thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
    alanlar: [
      { name: '🗺️ Bölge', value: bolge.ad, inline: true },
      { name: '👾 İndirilen Düşman', value: bolge.canavar, inline: true },
      { name: '💰 Yağmalanan Ganimet', value: `\`+${kazanilanRyo} Ryo\``, inline: true }
    ],
    footer: `Kage Indie RPG Sistemi • Jagwey Game Development`
  });

  return interaction.reply({ embeds: [embed] });
}
