import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { zindanZaferiKaydet, bakiyeGetir } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('zindan')
  .setDescription('Kage indie evreninde zindana inip canavarlarla savaşır ve Ryo kazanırsınız.');

const BOLGELER = [
  { ad: '⛩️ Kanlı Torii Geçidi', canavar: 'Ruhsuz Samuray Muhafızı', zorluk: 'Kolay', minRyo: 50, maxRyo: 150 },
  { ad: '🌲 Lanetli Bambu Ormanı', canavar: 'Gölge Tengu Canavarı', zorluk: 'Orta', minRyo: 120, maxRyo: 280 },
  { ad: '🏯 Harabe Şogun Kalesi', canavar: 'Kadim Oni İblisi', zorluk: 'Zor', minRyo: 250, maxRyo: 500 },
  { ad: '🌋 Yeraltı Magma Tapınağı', canavar: 'Kızıl Ejder Ruhunun Hayaleti', zorluk: 'Efsanevi', minRyo: 400, maxRyo: 800 }
];

export async function execute(interaction) {
  const bakiye = bakiyeGetir(interaction.user.id);
  const kilicBonus = bakiye.kilic?.bonus || 0; // % bonus
  const bolge = BOLGELER[Math.floor(Math.random() * BOLGELER.length)];
  const sans = Math.random() + (kilicBonus / 200); // Katana ile kazanma şansı artar

  // %75 Taban Kazanma + Katana Bonusu
  const kazandi = sans > 0.25;

  if (!kazandi) {
    const embed = kageEmbed({
      baslik: `💀 ZİNDAN PUSUSU • ${bolge.ad}`,
      renk: TEMA.RENKLER.UYARI_SARI,
      aciklama: `**${interaction.user.username}**, ${bolge.ad} derinliklerinde ilerlerken **${bolge.canavar}** tarafından pusuya düşürüldü!\n\n` +
        `Katanan [${bakiye.kilic.ad}] kırılmadı ama ağır darbeler aldın ve gölgelerin içine geri çekilmek zorunda kaldın.\n\n*${rastgeleSlogan()}*`,
      footer: `İpucu: /demirci ile katananı güçlendirerek zafer şansını artırabilirsin!`
    });
    return interaction.reply({ embeds: [embed] });
  }

  // Şans muskası varsa ganimet %25 artar
  const muskaVar = (bakiye.envanter || []).some(e => e.includes('Muska'));
  const carpan = muskaVar ? 1.25 : 1.0;

  const tabanRyo = Math.floor(Math.random() * (bolge.maxRyo - bolge.minRyo + 1)) + bolge.minRyo;
  const kazanilanRyo = Math.round(tabanRyo * carpan);
  zindanZaferiKaydet(interaction.user.id, kazanilanRyo);

  const embed = kageEmbed({
    baslik: `👑 ZİNDAN TEMİZLENDİ! • ${bolge.ad}`,
    renk: TEMA.RENKLER.BASARI,
    aciklama: `**${interaction.user.username}**, kuşanmış olduğu **${bakiye.kilic.ad}** katanasının tek darbesiyle **${bolge.canavar}** iblisini ikiye biçti ve gizli sandığı yağmaladı!\n\n*${rastgeleSlogan()}*`,
    thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
    alanlar: [
      { name: '🗺️ Bölge', value: bolge.ad, inline: true },
      { name: '👾 İndirilen Düşman', value: bolge.canavar, inline: true },
      { name: '💰 Yağmalanan Ganimet', value: `\`+${kazanilanRyo} Ryo\`${muskaVar ? ' *(+Muska Bonusu)*' : ''}`, inline: true }
    ],
    footer: `Kage Indie RPG Sistemi • kage95.com`
  });

  return interaction.reply({ embeds: [embed] });
}
