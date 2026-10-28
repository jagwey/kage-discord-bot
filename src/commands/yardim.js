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
        value: '`• /yeniden-kayit` : Klan kimliğinizi ve profilinizi anında yeniler.\n' +
          '`• /kayit-otomasyonu [panel|yeniden-kayit|sifirla]` : Butonlu & modal kayıt otomasyonu.\n' +
          '`• /kayit-paneli` : Kanala butonlu otomatik kayıt kapısı kurar.\n' +
          '`• /kayit [üye] [cinsiyet] [isim]` : İnteraktif veya doğrudan kayıt.\n' +
          '`• /sunucu-kur` : Sunucuyu roller, kayıt kapısı, manga ve oyun odalarıyla kurar.\n' +
          '`• /sunucu-sifirla` : Kanalları temizleyip Kage kalesini sıfırdan inşa eder.',
        inline: false
      },
      {
        name: `⚔️ Samuray Düello, Zindan & Ekonomi (Ryo)`,
        value: '`• /duello @rakip [bahis]` : Katana bonuslu turnuva düellosu!\n' +
          '`• /zindan [sefer|profil|siralama]` : İblislerle savaş; zaferle rütbe (D-S) aç, kalıntı topla, seri bonusu kazan, ağır hamlelere dikkat!\n' +
          '`• /demirci` : Ocak: katana döv (kırılma riski, koruma tılsımı), eşya yap ve kuşan, yıpranan eşyayı tamir et.\n' +
          '`• /market` : Ryo ile samuray unvanları ve muskalar satın alır.\n' +
          '`• /envanter` : Katananızı, çantanızı ve savaş sicilinizi gösterir.\n' +
          '`• /gunluk` : Günlük Ryo maaşı ve seri (streak).\n' +
          '`• /bakiye` : Cüzdan ve bakiye dökümü.\n' +
          '`• /liderlik` : En zengin 10 samuray.\n' +
          '`• /ode @üye [miktar]` : Başka üyeye Ryo gönder.\n' +
          '`• /hatirlatici [kur|liste|iptal]` : Zamanlı hatırlatıcılar.\n' +
          '`• /cekilis [baslat|bitir|liste]` : Butonlu çekiliş (yönetici).\n' +
          '`• /seviye [bak|siralama]` : Sohbet seviyesi; seviye atlayınca Ryo ödülü.\n' +
          '`• /ekonomi-log [üye] [adet]` : Son Ryo hareketleri (yönetici).',
        inline: false
      },
      {
        name: `⚔️ Görevler & Sunucu Sistemleri`,
        value:
          '`• /gorev` : Günlük 3 görev; bitirince Ryo ödülü ve tamamlama bonusu.\n' +
          '`• /dojo` : Kendi dojonu kur; sen yokken saat başı Ryo üretir, topla ve yükselt.\n' +
          '`• /balik` : Olta at, şamandıra batınca Çek!, gece ve mevsim balıkları, akvaryum geliri, haftalık en ağır balık turnuvası.\n' +
          '`• /boss` : Sunucu ortak dünya bossuna saatte bir saldır; ganimet hasar payına göre bölünür.\n' +
          '`• /kule` : Gölge Kulesi: günde 3 hak, kat kat tırman, güçlenme seç, ölmeden ödülü çek.\n' +
          '`• /karsilama [ayarla|goster|sifirla]` : Karşılama kanalı, mesajı ve rolü (yönetici).\n' +
          '`• /ticket panel` : Butonlu destek bileti paneli (yönetici).',
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
        name: `🔮 Yapay Zeka & Derin Hafıza`,
        value: '`• /ai <soru>` : Sınırsız yetkili yapay zeka gölge vezirine danışın.\n' +
          '`• /hafiza [durum|ara|ogren|yenile]` : Kage AI kalıcı hafıza bankasını yönetin.\n' +
          '`• /egit [ekle|liste|sil]` : Yapay zekaya sticker, bilgi ve davranış kuralı öğret.\n' +
          '`• /sticker [duygu] [tur]` : Kage stickerlarını göster.\n' +
          '`• /sticker-yukle [tur]` : Stickerları sunucuya ekle (yönetici).\n' +
          '`• /ton <mod>` : Sohbet botu ve yapay zeka sana sakin, samimi, argo veya ayna tonda konuşsun (aile, din, dil, ırk asla hedef alınmaz).\n' +
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
