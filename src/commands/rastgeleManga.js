import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { tumMangalariGetir, tamGorselUrl } from '../services/mangaServisi.js';

export const data = new SlashCommandBuilder()
  .setName('rastgele-manga')
  .setDescription('Kage 95 kütüphanesinden sizin için rastgele bir manga cevheri seçer.');

export async function execute(interaction) {
  await interaction.deferReply();

  const mangalar = await tumMangalariGetir();
  if (!mangalar || mangalar.length === 0) {
    return interaction.editReply({
      content: '⛩️ Şu an kütüphanede manga bulunamadı veya bağlantı kurulamadı.'
    });
  }

  const secilen = mangalar[Math.floor(Math.random() * mangalar.length)];
  const kapak = tamGorselUrl(secilen.kapakResmiURL || secilen.kapakResmi);
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';
  const okumaUrl = `${siteUrl}/manga.html?id=${secilen.id}`;

  const embed = kageEmbed({
    baslik: `🎲 MANGA RULETİ • ${secilen.mangaAdi}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kaderin kılıcı bugün senin için bu sayfaları işaret etti:\n\n${secilen.aciklama || 'Gölge dünyasında unutulmaz bir macera seni bekliyor.'}\n\n*${rastgeleSlogan()}*`,
    thumbnail: kapak,
    url: okumaUrl,
    alanlar: [
      { name: '⭐ Puan', value: `\`${secilen.puan || '9.0'}/10\``, inline: true },
      { name: '📌 Durum', value: `\`${secilen.durum || 'Devam Ediyor'}\``, inline: true },
      { name: '👁️ Okunma', value: `\`${secilen.okunmaSayisi || '0'}\``, inline: true }
    ],
    altMetin: `Kage 95 Manga Kütüphanesi • Rastgele Seçim`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Hemen Oku')
      .setURL(okumaUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN),
    new ButtonBuilder()
      .setLabel('Tüm Kütüphane')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}
