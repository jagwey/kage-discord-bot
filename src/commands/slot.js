import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, ryoEkle, ryoDus } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('slot')
  .setDescription('Kage Samuray slot makinesinde şansınızı dener ve çarpanlarla Ryo kazanırsınız.')
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription('Ortaya koymak istediğiniz Ryo miktarı')
      .setRequired(true)
      .setMinValue(10)
  );

const SEMBOLLER = [
  { ad: '🍒', adMetin: 'Kiraz', agirlik: 30, carpan3: 3, carpan2: 1.2 },
  { ad: '⛩️', adMetin: 'Torii', agirlik: 25, carpan3: 5, carpan2: 1.5 },
  { ad: '🗡️', adMetin: 'Katana', agirlik: 20, carpan3: 8, carpan2: 2.0 },
  { ad: '🐉', adMetin: 'Ejder', agirlik: 15, carpan3: 15, carpan2: 3.0 },
  { ad: '👑', adMetin: 'Şogun Tacı', agirlik: 10, carpan3: 30, carpan2: 5.0 }
];

function rastgeleSembol() {
  const toplamAgirlik = SEMBOLLER.reduce((a, b) => a + b.agirlik, 0);
  let rnd = Math.random() * toplamAgirlik;
  for (const s of SEMBOLLER) {
    if (rnd < s.agirlik) return s;
    rnd -= s.agirlik;
  }
  return SEMBOLLER[0];
}

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bahis = interaction.options.getInteger('bahis');
  const bakiye = bakiyeGetir(userId);

  if (bakiye.ryo < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanınızda \`${bakiye.ryo} Ryo\` var, gereken bahis: \`${bahis} Ryo\`.`,
      ephemeral: true
    });
  }

  // Bahsi düş
  ryoDus(userId, bahis);

  // Dönen çarklar
  const s1 = rastgeleSembol();
  const s2 = rastgeleSembol();
  const s3 = rastgeleSembol();

  const donuyorEmbed = kageEmbed({
    baslik: '🎰 SAMURAY SLOT MAKİNESİ',
    renk: TEMA.RENKLER.BILGI,
    aciklama: `Kollu çark çekildi, makaralar dönüyor...\n\n` +
      `╔═════════════════╗\n` +
      `║  🌀  |  🌀  |  🌀  ║\n` +
      `╚═════════════════╝\n\n` +
      `💰 **Bahis:** \`${bahis} Ryo\``,
    footer: `Kage Kumarcı Köşesi • Şans dönsün!`
  });

  await interaction.reply({ embeds: [donuyorEmbed] });

  // 1 saniye bekletip sonucu göster
  setTimeout(async () => {
    let carpan = 0;
    let kazandiMetni = '';

    // 3'lü eşleşme (JACKPOT)
    if (s1.ad === s2.ad && s2.ad === s3.ad) {
      carpan = s1.carpan3;
      kazandiMetni = `🔥 **BÜYÜK İKRAMİYE (3x ${s1.adMetin})!** ${carpan}x Çarpan!`;
    }
    // 2'li eşleşme
    else if (s1.ad === s2.ad || s2.ad === s3.ad || s1.ad === s3.ad) {
      const eslesen = (s1.ad === s2.ad) ? s1 : (s2.ad === s3.ad ? s2 : s1);
      carpan = eslesen.carpan2;
      kazandiMetni = `✨ **İKİLİ EŞLEŞME (2x ${eslesen.adMetin})!** ${carpan}x Çarpan!`;
    }

    const slotGorunum = `╔═════════════════╗\n` +
      `║  ${s1.ad}  |  ${s2.ad}  |  ${s3.ad}  ║\n` +
      `╚═════════════════╝`;

    if (carpan > 0) {
      const toplamOdeme = Math.floor(bahis * carpan);
      ryoEkle(userId, toplamOdeme);
      const yeniBakiye = bakiyeGetir(userId).ryo;

      const kazandiEmbed = kageEmbed({
        baslik: '🎰 SLOT KAZANDINIZ!',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `${slotGorunum}\n\n` +
          `${kazandiMetni}\n\n` +
          `💰 **Kazanılan Net:** \`+${toplamOdeme - bahis} Ryo\` (Toplam: \`${toplamOdeme} Ryo\`)\n` +
          `🪙 **Yeni Bakiyeniz:** \`${yeniBakiye} Ryo\``,
        footer: `Kage Casino • Tebrikler!`
      });

      return interaction.editReply({ embeds: [kazandiEmbed] });
    } else {
      const kalanBakiye = bakiyeGetir(userId).ryo;

      const kaybettiEmbed = kageEmbed({
        baslik: '💀 SLOT KAYBETTİNİZ',
        renk: TEMA.RENKLER.HATA,
        aciklama: `${slotGorunum}\n\n` +
          `Hiçbir sembol eşleşmedi. Şansını bir dahaki çevirmede dene!\n\n` +
          `💸 **Kaybedilen:** \`-${bahis} Ryo\`\n` +
          `🪙 **Kalan Bakiyeniz:** \`${kalanBakiye} Ryo\``,
        footer: `Kage Casino • Tekrar dene!`
      });

      return interaction.editReply({ embeds: [kaybettiEmbed] });
    }
  }, 1200);
}
