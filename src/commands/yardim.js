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
    aciklama: `**Kage**, **[kage95.com](${siteUrl})** manga platformu ve indie oyunu ile Discord sunucunuzu yöneten hepsi bir arada yapay zeka, samuray RPG ve moderasyon botudur.\n\nİster eğik çizgi (\`/\`), ister metin olarak (\`!help\` veya \`.help\`) komutları kullanabilirsiniz:`,
    alanlar: [
      {
        name: `⛩️ Otomatik Sunucu Mimarisi & Kayıt`,
        value: '`• /sunucu-kur` : Sunucuyu roller, kayıt kapısı, manga ve oyun odalarıyla kurar.\n' +
          '`• /sunucu-sifirla` : Kanalları temizleyip Kage kalesini sıfırdan inşa eder.\n' +
          '`• /kayit-paneli` : Kanala butonlu otomatik kayıt kapısı kurar.\n' +
          '`• /kayit [üye] [isim]` : Üyeyi manuel kayıt eder.',
        inline: false
      },
      {
        name: `⚔️ Samuray Düello, Zindan & Ekonomi (Ryo)`,
        value: '`• /duello @rakip [bahis]` : Katana bonuslu turnuva düellosu!\n' +
          '`• /zindan` : İblislerle interaktif savaş, ganimet ve ölüm riski!\n' +
          '`• /demirci` : Katananızı demircide dövüp gücünüzü katlarsınız.\n' +
          '`• /market` : Ryo ile samuray unvanları ve muskalar satın alır.\n' +
          '`• /envanter` : Katananızı, çantanızı ve savaş sicilinizi gösterir.\n' +
          '`• /gunluk` : Günlük Ryo maaşı ve seri (streak).\n' +
          '`• /bakiye` : Cüzdan ve bakiye dökümü.',
        inline: false
      },
      {
        name: `🎲 Kumarcı Köşesi (OwO Bahis Sistemi)`,
        value: '`• /blackjack [bahis]` : Kage 21 masasında krupiyeye karşı kart çekin/durun!\n' +
          '`• /slot [bahis]` : 3 makaralı Samuray slot makinesinde 30x büyük ikramiye!\n' +
          '`• /yazitura [bahis] [seçim]` : 50/50 şansla paranızı ikiye katlayın.',
        inline: false
      },
      {
        name: `📖 Manga & Okur Kartı`,
        value: '`• /manga <isim>` : Canlı siteden manga ara & sitede oku butonu al.\n' +
          '`• /rastgele-manga` : Siteden rastgele manga ruleti çevirir.\n' +
          '`• /oneri <tarz>` : Yapay zeka ile kişiselleştirilmiş manga tavsiyesi.\n' +
          '`• /profil [üye]` : Samuray unvanı, XP barı ve canlı okuma karnesi.',
        inline: false
      },
      {
        name: `🔮 Yapay Zeka & Topluluk`,
        value: '`• /ai <soru>` : Yapay zeka danışmanı ile konuşun.\n' +
          '`• /guncelleme` : Son bot sürümü ve yama raporunu gösterir.\n' +
          '`• /oyun` : Kage indie oyun lore ve devlog bilgileri.',
        inline: false
      },
      {
        name: `🛡️ Moderasyon (MEE6 Katili)`,
        value: '`• /ban` • `/unban` • `/kick` • `/timeout` • `/untimeout`\n' +
          '`• /sil <1-100>` • `/kilit` • `/yavasmod` • `/uyari` • `/rol` • `/duyuru` • `/anket`',
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
