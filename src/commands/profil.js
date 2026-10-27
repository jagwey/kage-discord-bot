import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { kullaniciProfiliGetir } from '../services/mangaServisi.js';
import { kazanilanRozetler } from '../services/basarimServisi.js';

export const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Kage 95 okur seviyenizi, samuray unvanınızı ve okuma istatistiklerinizi gösterir.')
  .addStringOption(option =>
    option
      .setName('kullanici_adi')
      .setDescription('Görüntülenecek Kage 95 veya Discord kullanıcı adı (boş bırakılırsa kendi profiliniz)')
      .setRequired(false)
  );

/**
 * Seviyeye göre görsel bir XP barı üretir
 * @param {number} seviye
 * @returns {string}
 */
function xpBariUret(seviye) {
  const yuzde = (seviye % 10) * 10;
  const doluBlokSayisi = Math.round(yuzde / 10);
  const bosBlokSayisi = 10 - doluBlokSayisi;
  return `\`[${'█'.repeat(doluBlokSayisi)}${'░'.repeat(bosBlokSayisi)}]\` %${yuzde}`;
}

export async function execute(interaction) {
  await interaction.deferReply();

  const secilenAd = interaction.options.getString('kullanici_adi') || interaction.user.displayName || interaction.user.username;
  const profil = await kullaniciProfiliGetir(secilenAd);

  const xpBar = xpBariUret(profil.seviye);
  const avatarUrl = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });
  // Başarımlar Discord hesabına bağlı; başka bir okur adı sorgulanınca gösterilmez.
  const rozetler = interaction.options.getString('kullanici_adi') ? null : kazanilanRozetler(interaction.user.id);

  const embed = kageEmbed({
    baslik: `GÖLGE OKUR KARTI • ${profil.kullaniciAdi}`,
    renk: profil.rutbeRengi || TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 evreninde mürekkep ve kılıçla yazılmış resmi okur sicili.\n\n${profil.unvanEmoji} **Unvan:** \`${profil.unvan}\`\n${TEMA.EMOJILER.ALEV} **Seviye:** \`Lv. ${profil.seviye}\` • İlerleme: ${xpBar}`,
    thumbnail: avatarUrl,
    url: profil.profilUrl,
    alanlar: [
      {
        name: `${TEMA.EMOJILER.PARSOMEN} Okuma Karnesi`,
        value: `**Okunan Bölüm:** ${profil.okunanBolum} sayfa\n**Tamamlanan Seri:** ${profil.tamamlananSeri} manga`,
        inline: true
      },
      {
        name: `${TEMA.EMOJILER.KATANA} Aidiyet & Zevk`,
        value: `**Klan:** ${profil.klan}\n**Favori Tür:** ${profil.favoriTur}`,
        inline: true
      },
      ...(rozetler ? [{
        name: `🏅 Başarım Rozetleri (${rozetler.length})`,
        value: rozetler.map(r => `${r.emoji} ${r.ad}`).join(' • ').slice(0, 1024) || 'Henüz rozet yok. `/basarim` ile ilerlemene bak.',
        inline: false
      }] : []),
      {
        name: `${TEMA.EMOJILER.GOLGE} Samuray Yemini`,
        value: `*"Gölgelerde fısıldayan her sayfayı okuyacak, karanlığı kılıcım ve bilgimle yaracağım."*`,
        inline: false
      }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Kage 95 Profili')
      .setURL(profil.profilUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.KULLANICI),
    new ButtonBuilder()
      .setLabel('Kütüphaneye Dön')
      .setURL(process.env.SITE_URL || 'https://kage95.com')
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.TORII)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}
