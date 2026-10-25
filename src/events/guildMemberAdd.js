import { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { sunucuAyarGetir } from '../services/veritabaniServisi.js';

export const name = Events.GuildMemberAdd;

/**
 * Sunucuya yeni bir üye katıldığında tetiklenir
 * @param {import('discord.js').GuildMember} member
 */
export async function execute(member) {
  const guild = member.guild;
  const ayarlar = sunucuAyarGetir(guild.id);

  // 1. Otomatik Rol Atama (örn. "Gölge Genin")
  const autoRoleId = ayarlar.otoRolId || process.env.AUTO_ROLE_ID;
  if (autoRoleId) {
    try {
      const role = await guild.roles.fetch(autoRoleId).catch(() => null);
      if (role) {
        await member.roles.add(role);
        console.log(`[GuildMemberAdd] ${member.user.tag} üyesine otomatik rol verildi: ${role.name}`);
      }
    } catch (err) {
      console.error(`[GuildMemberAdd] Rol atanamadı (${member.user.tag}):`, err.message);
    }
  }

  // 2. Tematik Hoş Geldin Mesajı
  const welcomeChannelId = ayarlar.hosgeldinKanalId || process.env.WELCOME_CHANNEL_ID;
  if (!welcomeChannelId) return;

  try {
    const welcomeChannel = await guild.channels.fetch(welcomeChannelId).catch(() => null);
    if (!welcomeChannel || !welcomeChannel.isTextBased()) return;

    const siteUrl = process.env.SITE_URL || 'https://kage95.com';
    const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 256 });

    const embed = kageEmbed({
      baslik: `GÖLGE DİYARINA HOŞ GELDİN • ${member.user.displayName}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `Karanlık koridorları arala, parşömenlerin kadim bilgisine kulak ver.\n\n${TEMA.EMOJILER.KATANA} **${member}**, Kage 95 kalesine adım attı!\n${TEMA.EMOJILER.FENER} Sunucumuzun **${guild.memberCount}.** samurayı oldun.\n\n*${rastgeleSlogan()}*`,
      thumbnail: avatarUrl,
      alanlar: [
        {
          name: `${TEMA.EMOJILER.PARSOMEN} İlk Adımın`,
          value: '`/manga` yazarak sitedeki mangaları keşfedebilir veya `/profil` ile kendi okur kartını görüntüleyebilirsin.',
          inline: false
        }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Kage 95 Manga Oku')
        .setURL(siteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(TEMA.EMOJILER.TORII)
    );

    await welcomeChannel.send({
      content: `⛩️ Selam olsun ${member}!`,
      embeds: [embed],
      components: [row]
    });
  } catch (err) {
    console.error('[GuildMemberAdd] Karşılama mesajı gönderilemedi:', err.message);
  }
}
