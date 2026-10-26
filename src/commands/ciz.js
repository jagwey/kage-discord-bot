import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { gorselUrlUret } from '../services/aiRouterServisi.js';
import { aiErisimKontrol, aiSpamKontrol } from '../services/aiErisimServisi.js';
import { TEMA } from '../config/tema.js';

const STILLER = {
  anime: 'masterpiece, high quality anime art style, vibrant colors, sharp lines, detailed aesthetic',
  feodal_samuray: 'dark feudal japan samurai art, traditional ink wash with digital finish, crimson accents, dramatic shadows',
  piksel_art: 'masterpiece 16-bit pixel art, clean sprites, retro video game aesthetic, detailed shading',
  siberpunk: 'neon cyberpunk city aesthetic, futuristic techwear, glowing holographic interfaces, dark obsidian rain',
  gercekci: 'photorealistic, 8k resolution, cinematic lighting, ultra-detailed textures, unreal engine 5 render',
  fantastik: 'epic dark fantasy concept art, mystical fog, ancient ruins, glowing runes, cinematic composition'
};

const ORANLAR = {
  kare: { w: 1024, h: 1024, ad: '1:1 Kare' },
  dikey: { w: 768, h: 1280, ad: '9:16 Dikey (Hikaye/Mobil)' },
  yatay: { w: 1280, h: 768, ad: '16:9 Yatay (Masaüstü/Wallpaper)' }
};

export const data = new SlashCommandBuilder()
  .setName('ciz')
  .setDescription('Ücretsiz yapay zeka ile hayal ettiğin görseli anında çizer.')
  .addStringOption(option =>
    option
      .setName('tarif')
      .setDescription('Çizilmesini istediğin sahne, karakter veya obje (Örn: beyaz saçlı katanalı samuray)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('stil')
      .setDescription('Görselin sanat stili')
      .setRequired(false)
      .addChoices(
        { name: '🌸 Anime Tarzı', value: 'anime' },
        { name: '⚔️ Feodal Samuray', value: 'feodal_samuray' },
        { name: '👾 Piksel Sanat (16-bit)', value: 'piksel_art' },
        { name: '🏙️ Siberpunk & Neon', value: 'siberpunk' },
        { name: '📸 Gerçekçi & Sinematik', value: 'gercekci' },
        { name: '🔮 Epik Karanlık Fantazi', value: 'fantastik' }
      )
  )
  .addStringOption(option =>
    option
      .setName('oran')
      .setDescription('Görsel en-boy oranı')
      .setRequired(false)
      .addChoices(
        { name: '⬛ 1:1 Kare (Profil / Standart)', value: 'kare' },
        { name: '📱 9:16 Dikey (Mobil / Duvar Kağıdı)', value: 'dikey' },
        { name: '🖥️ 16:9 Yatay (Masaüstü / Banner)', value: 'yatay' }
      )
  );

export async function execute(interaction) {
  // 1. Yetki ve Rol Denetimi
  const erisim = aiErisimKontrol(interaction.member, interaction.guild, interaction.client);
  if (!erisim.izin) {
    return interaction.reply({ content: erisim.sebep, flags: MessageFlags.Ephemeral });
  }

  // 2. Kötüye Kullanım & Spam Önleme (Görsel için 15 saniye bekleme süresi)
  const spam = aiSpamKontrol(interaction.user.id, 15, erisim.yetkili);
  if (!spam.izin) {
    return interaction.reply({ content: spam.sebep, flags: MessageFlags.Ephemeral });
  }

  const tarif = interaction.options.getString('tarif');
  const stilAnahtari = interaction.options.getString('stil') || 'anime';
  const oranAnahtari = interaction.options.getString('oran') || 'kare';

  await interaction.deferReply();

  const stilEk = STILLER[stilAnahtari] || STILLER.anime;
  const { w, h, ad: oranAdi } = ORANLAR[oranAnahtari] || ORANLAR.kare;
  const nihaiPrompt = `${tarif}, ${stilEk}`;
  const seed = Math.floor(Math.random() * 10000000);

  const imageUrl = gorselUrlUret({
    prompt: nihaiPrompt,
    genislik: w,
    yukseklik: h,
    seed
  });

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Kage-Bot/2.5' }
    });

    if (!res.ok) throw new Error(`Görsel servisi yanıt vermedi (${res.status})`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const attachment = new AttachmentBuilder(buffer, { name: 'kage_cizim.jpg' });

    const embed = new EmbedBuilder()
      .setColor(TEMA.KIRMIZI || 0xe53935)
      .setTitle('🎨 Yapay Zeka Çizim Atölyesi')
      .setDescription(`**Tarif:** *${tarif}*`)
      .addFields(
        { name: 'Sanat Stili', value: stilAnahtari.replace('_', ' ').toUpperCase(), inline: true },
        { name: 'Boyut & Oran', value: oranAdi, inline: true },
        { name: 'Motor', value: '⚡ Pollinations AI (Ücretsiz)', inline: true }
      )
      .setImage('attachment://kage_cizim.jpg')
      .setFooter({
        text: `İsteyen: ${interaction.user.username} • Seed: ${seed}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error('[ciz] Hata:', err);
    const embed = new EmbedBuilder()
      .setColor(TEMA.KIRMIZI || 0xe53935)
      .setTitle('🎨 Yapay Zeka Çizim Atölyesi')
      .setDescription(`**Tarif:** *${tarif}*`)
      .setImage(imageUrl)
      .setFooter({ text: `İsteyen: ${interaction.user.username} • Motor: Pollinations AI` });

    await interaction.editReply({ embeds: [embed] });
  }
}
