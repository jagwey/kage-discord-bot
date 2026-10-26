import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { TEMA } from '../config/tema.js';
import { oyunStickerEkini, ryoYaz } from '../config/oyunGorsel.js';
import { ryoEkle } from '../services/ekonomiServisi.js';

const ELEMENTLER = [
  { ad: '🔥 Alev Ruhu', bonus: 'Bugün cesur hamleler yap; saldırı gücün zirvede.' },
  { ad: '🌑 Gölge Çeliği', bonus: 'Gözlerden uzak kal, sessizce planla; sürpriz zaferler seninle.' },
  { ad: '⚡ Şimşek Akımı', bonus: 'Tereddüt etme! İlk aklına gelen hamle en doğrusu olacak.' },
  { ad: '🌪️ Rüzgarın Dansı', bonus: 'Gereksiz kavgalardan kaçın, çevikliğinle kazan.' },
  { ad: '🌙 Ay Işığı', bonus: 'Sabır ve sükunet günü. Gece vakti şansın ikiye katlanacak.' },
  { ad: '🌌 Hiçlik ve Boşluk', bonus: 'Zihnini sıfırla; beklenmedik büyük bir fırsat kapıda.' }
];

const BILGE_SOZLERI = [
  '"Kılıcını kınından çıkarmadan önce, zaferin zihninde bittiğinden emin ol."',
  '"Gölge ne kadar koyuysa, hemen ardındaki ışık o kadar parlaktır."',
  '"Bir samuray bin dövüş kaybetse de onurunu ve duruşunu kaybetmez."',
  '"En keskin kılıç, asla kan dökme ihtiyacı hissettirmeyen kılıçtır."',
  '"Rüzgara direnen dal kırılır, onunla salınan bambu dimdik kalır."',
  '"Zenginlik cüzdandaki Ryo ile değil, zor anında sırtını dayadığın yoldaşlarla ölçülür."'
];

export const data = new SlashCommandBuilder()
    .setName('kehanet')
    .setDescription('Kage tapınağındaki kutsal kaseden günlük samuray kaderini ve falını öğren.');

export async function execute(interaction) {
    const sansOrani = Math.floor(Math.random() * 101);
    const element = ELEMENTLER[Math.floor(Math.random() * ELEMENTLER.length)];
    const soz = BILGE_SOZLERI[Math.floor(Math.random() * BILGE_SOZLERI.length)];

    let duygu = 'cay';
    let renk = TEMA.KIRMIZI || 0xe53935;
    let kaderYorumu = 'Dengeli ve sakin bir gün seni bekliyor.';

    if (sansOrani >= 80) {
      duygu = 'zafer';
      renk = 0x2ecc71; // yeşil
      kaderYorumu = '✨ **Kutlu Gün!** Yıldızlar ve kader senin tarafında. Zindanlara inmek veya düelloya girmek için mükemmel an!';
    } else if (sansOrani >= 50) {
      duygu = 'savas';
      renk = 0xf1c40f; // sarı
      kaderYorumu = '⚔️ **Savaş Çanları!** Çabanın karşılığını alacağın, mücadele dolu ve bereketli bir gün.';
    } else if (sansOrani >= 25) {
      duygu = 'cay';
      kaderYorumu = '🍵 **Sakin Kal.** Büyük risklerden kaçın, dojo da antrenman yapıp güç toplamak en iyisi.';
    } else {
      duygu = 'aglama';
      renk = 0xe74c3c; // kırmızı
      kaderYorumu = '💀 **Karanlık Sis!** Kumar masalarından ve tehlikeli zindanlardan bugün uzak durmanı öneririm.';
    }

    // %35 şansla küçük bir kader bahşişi
    let odulMetni = '';
    if (sansOrani >= 60 && Math.random() < 0.4) {
      const hediyeRyo = Math.floor(Math.random() * 200) + 100;
      ryoEkle(interaction.user.id, hediyeRyo);
      odulMetni = `\n\n🎁 **Kader Bahşişi:** Tapınak sunağında bulduğun **${ryoYaz(hediyeRyo)}** cüzdanına eklendi!`;
    }

    const { files, attachmentUrl } = oyunStickerEkini(interaction.user, interaction.member, duygu);

    const embed = new EmbedBuilder()
      .setColor(renk)
      .setTitle(`🔮 ${interaction.user.username} İçin Samuray Kehaneti`)
      .setDescription(`${kaderYorumu}${odulMetni}`)
      .addFields(
        { name: '🎲 Günlük Şans Oranı', value: `**%${sansOrani}**`, inline: true },
        { name: '⚔️ Koruyucu Element', value: `**${element.ad}**\n*${element.bonus}*`, inline: false },
        { name: '📜 Kage\'nin Bilge Aforizması', value: `*${soz}*`, inline: false }
      )
      .setFooter({ text: 'Günde dilediğin zaman kehanetini yenileyebilirsin.' })
      .setTimestamp();

    if (attachmentUrl) {
      embed.setThumbnail(attachmentUrl);
    }

    await interaction.reply({ embeds: [embed], files });
  }
