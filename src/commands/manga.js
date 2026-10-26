import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { tumMangalariGetir, mangaAra, tamGorselUrl, mangaSayfaUrl } from '../services/mangaServisi.js';

export const data = new SlashCommandBuilder()
  .setName('manga')
  .setDescription('Kage 95 kütüphanesinde manga arayın ve okuma detaylarını görüntüleyin.')
  .addStringOption(option =>
    option
      .setName('isim')
      .setDescription('Aramak istediğiniz manga adı veya kategorisi')
      .setRequired(true)
      .setAutocomplete(true)
  );

/**
 * Autocomplete (Otomatik tamamlama) etkileşimini yönetir
 * @param {import('discord.js').AutocompleteInteraction} interaction
 */
export async function autocomplete(interaction) {
  const odakliDeger = interaction.options.getFocused().toLowerCase();
  try {
    const mangalar = await tumMangalariGetir();
    const eslesenler = mangalar
      .filter(m => (m.mangaAdi || '').toLowerCase().includes(odakliDeger))
      .slice(0, 25); // Discord en fazla 25 seçenek kabul eder

    await interaction.respond(
      eslesenler.map(m => ({
        name: `${m.mangaAdi} (${(m.kategoriler || []).slice(0, 2).join(', ') || 'Manga'})`.slice(0, 100),
        value: m.mangaAdi
      }))
    );
  } catch (err) {
    console.error('[Manga Komutu] Autocomplete hatası:', err.message);
    await interaction.respond([]);
  }
}

/**
 * Komut yürütme mantığı
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function execute(interaction) {
  await interaction.deferReply();

  const aranan = interaction.options.getString('isim');
  const sonuclar = await mangaAra(aranan);

  if (!sonuclar || sonuclar.length === 0) {
    const hataEmbed = kageEmbed({
      baslik: 'Manga Bulunamadı',
      renk: TEMA.RENKLER.GOLGE_SIYAHI,
      aciklama: `**"${aranan}"** adına sahip bir parşömen Kage 95 arşivlerinde bulunamadı.\n\n${TEMA.EMOJILER.FENER} Farklı bir isim deneyebilir veya tüm arşivi siteden gezebilirsiniz.`
    });

    const siteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Kage 95 Kütüphanesini Gez')
        .setURL(process.env.SITE_URL || 'https://kage95.com')
        .setStyle(ButtonStyle.Link)
        .setEmoji(TEMA.EMOJILER.TORII)
    );

    return interaction.editReply({ embeds: [hataEmbed], components: [siteRow] });
  }

  // İlk ve en iyi eşleşmeyi göster
  const manga = sonuclar[0];
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';
  const mangaUrl = mangaSayfaUrl(manga.id);
  const kapak = tamGorselUrl(manga.kapakResmiURL);

  const durumMetni = manga.durum === 'DevamEdiyor'
    ? '🟢 Devam Ediyor'
    : (manga.durum === 'Tamamlandi' ? '🏁 Tamamlandı' : (manga.durum || 'Bilinmiyor'));

  const kategoriler = Array.isArray(manga.kategoriler) && manga.kategoriler.length > 0
    ? manga.kategoriler.map(k => `\`${k}\``).join(' ')
    : '`Belirtilmedi`';

  // Açıklamayı uygun uzunlukta tut
  const aciklamaMetni = manga.aciklama
    ? (manga.aciklama.length > 400 ? manga.aciklama.slice(0, 397) + '...' : manga.aciklama)
    : 'Bu manga için henüz bir özet girilmemiş.';

  const embed = kageEmbed({
    baslik: `${manga.mangaAdi}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `${aciklamaMetni}\n\n${TEMA.EMOJILER.PARSOMEN} **Türler:** ${kategoriler}`,
    thumbnail: kapak,
    url: mangaUrl,
    alanlar: [
      {
        name: `${TEMA.EMOJILER.KATANA} Durum & Bölümler`,
        value: `**Durum:** ${durumMetni}\n**Bölüm Sayısı:** ${manga.bolumSayisi || 0}`,
        inline: true
      },
      {
        name: `${TEMA.EMOJILER.YILDIZ} Puan & Okunma`,
        value: `**Puan:** ${manga.puan ? `${manga.puan} / 10` : 'Henüz oylanmadı'}\n**Okunma:** ${manga.okunmaSayisi || '0'} kez`,
        inline: true
      },
      {
        name: `${TEMA.EMOJILER.GOLGE} Yapımcı Ekip`,
        value: `**Yazar:** ${manga.yazar || 'Bilinmiyor'}\n**Çizer:** ${manga.cizer || 'Bilinmiyor'}`,
        inline: true
      }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Sitede Oku')
      .setURL(mangaUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN),
    new ButtonBuilder()
      .setLabel('Kage 95 Ana Sayfa')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}
