import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('yardim')
  .setDescription('Kage Discord botunun tüm komutlarını ve sunucu yönetim rehberini listeler.');

export async function execute(interaction) {
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';

  const embed = kageEmbed({
    baslik: 'KAGE DİSKORD REHBERİ • GÖLGE PARŞÖMENİ',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**Kage**, **[kage95.com](${siteUrl})** manga platformu ve indie oyunu ile Discord sunucunuzu yöneten hepsi bir arada yapay zeka ve samuray moderasyon botudur.\n\nAşağıdaki kategorilerden dilediğiniz komutu kullanabilirsiniz:`,
    alanlar: [
      {
        name: `${TEMA.EMOJILER.TORII} 🏗️ Otomatik Sunucu Mimarisi`,
        value: '`/sunucu-kur` : Sunucunuzu rolleri, izinleri, manga ve oyun kategorileriyle sıfırdan otomatik inşa eder.',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.GOLGE} 🧠 Yapay Zeka Danışmanı`,
        value: '`/ai <talimat>` : Gölge vezirine sunucu yönetimi, kurallar, duyurular veya kriz çözümleri için danışın.',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.KATANA} 🛡️ Moderasyon & Yönetim`,
        value: '`/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/sil`, `/kilit`, `/yavasmod`, `/uyari`, `/rol`, `/ayarlar`',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.PARSOMEN} 📖 Manga & Okur Kartı`,
        value: '`/manga <isim>` (canlı arama & okuma butonu) • `/profil [kullanıcı]` (samuray rütbesi ve okuma karnesi)',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.OYUN} 🎮 Indie Oyun & Topluluk`,
        value: '`/oyun` (Kage indie oyun lore & devlog) • `/duyuru` • `/anket` • `/sunucu-bilgi` • `/kullanici-bilgi` • `/duyuru-test`',
        inline: false
      }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Kage Web Sitesi')
      .setURL(siteUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setLabel('API Durumu')
      .setURL(`${process.env.API_BASE_URL || 'https://kage95.com/api'}/mangas`)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.BAGLANTI)
  );

  return interaction.reply({ embeds: [embed] });
}
