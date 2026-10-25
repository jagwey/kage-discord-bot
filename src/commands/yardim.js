import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('yardim')
  .setDescription('Kage Discord botunun tüm komutlarını ve sunucu yönetim rehberini listeler.');

export function yardimKartiOlustur() {
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';

  const embed = kageEmbed({
    baslik: 'KAGE DİSKORD REHBERİ • GÖLGE PARŞÖMENİ',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**Kage**, **[kage95.com](${siteUrl})** manga platformu ve indie oyunu ile Discord sunucunuzu yöneten hepsi bir arada yapay zeka ve samuray moderasyon botudur.\n\nİster eğik çizgi (\`/\`), ister metin olarak (\`!help\` veya \`.help\`) komutları kullanabilirsiniz:`,
    alanlar: [
      {
        name: `${TEMA.EMOJILER.TORII} 🏗️ Otomatik Sunucu Mimarisi`,
        value: '`• /sunucu-kur` : Sunucunuzu rolleri, izinleri, manga ve oyun kategorileriyle sıfırdan otomatik kurar.',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.GOLGE} 🧠 Yapay Zeka Gölge Veziri`,
        value: '`• /ai <talimat>` : Yapay zekaya sunucu yönetimi, krizler, kurallar veya samuray duyuruları hazırlatın.\n*(Ayrıca `#ai-gölge-veziri` kanalında doğrudan sohbet edebilirsiniz)*',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.KATANA} 🛡️ Moderasyon & Yönetim (MEE6 Katili)`,
        value: '`• /ban` • `/unban` • `/kick` • `/timeout` • `/untimeout`\n`• /sil <1-100>` (mesaj silme) • `/kilit` • `/yavasmod`\n`• /uyari` (ceza sicili) • `/rol` (rol ver/al) • `/ayarlar`',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.PARSOMEN} 📖 Manga & Okur Kartı`,
        value: '`• /manga <isim>` : Canlı siteden manga ara & sitede oku butonu al.\n`• /profil [kullanıcı]` : Samuray unvanı, XP barı ve okuma karnesi.',
        inline: false
      },
      {
        name: `${TEMA.EMOJILER.OYUN} 🎮 Topluluk & Oyun`,
        value: '`• /oyun` : Kage indie oyun lore & devlog\n`• /guncelleme` : Son güncelleme notları ve #kage-dev raporu\n`• /duyuru` • `/anket` • `/sunucu-bilgi` • `/kullanici-bilgi` • `/duyuru-test`',
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
      .setLabel('GitHub Deposu')
      .setURL('https://github.com/jagwey/kage-discord-bot')
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.BAGLANTI)
  );

  return { embed, row };
}

export async function execute(interaction) {
  const { embed, row } = yardimKartiOlustur();
  return interaction.reply({ embeds: [embed], components: [row] });
}
