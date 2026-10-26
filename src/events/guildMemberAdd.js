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

  // 1. Kayıtsız (Ronin) veya Otomatik Rol Atama
  try {
    const kayitsizRol = guild.roles.cache.find(r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));
    const autoRoleId = ayarlar.otoRolId || process.env.AUTO_ROLE_ID;

    if (kayitsizRol) {
      await member.roles.add(kayitsizRol);
      console.log(`[GuildMemberAdd] ${member.user.tag} üyesine 'Ronin (Kayıtsız)' rolü verildi.`);
    } else if (autoRoleId) {
      const role = await guild.roles.fetch(autoRoleId).catch(() => null);
      if (role) await member.roles.add(role);
    }
  } catch (err) {
    console.error(`[GuildMemberAdd] Rol atanamadı (${member.user.tag}):`, err.message);
  }

  // 2. Karşılama Mesajı (#yeni-savaşçılar, #hoş-geldin veya ayarlı kanal)
  // Açıkça ayarlanmış kanal (/karsilama) isim eşleşmesinden önce gelir.
  const welcomeChannel = (ayarlar.hosgeldinKanalId ? await guild.channels.fetch(ayarlar.hosgeldinKanalId).catch(() => null) : null)
    || guild.channels.cache.find(c =>
      c.isTextBased() && (c.name.includes('yeni-savaşçılar') || c.name.includes('yeni-savascilar') || c.name.includes('hoş-geldin') || c.name.includes('hos-geldin'))
    );

  if (!welcomeChannel || !welcomeChannel.isTextBased()) return;

  try {
    const siteUrl = process.env.SITE_URL || 'https://kage95.com';
    const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 256 });
    const kayitKanali = guild.channels.cache.find(c => c.name.includes('kayıt') || c.name.includes('kayit'));

    // Yönetici /karsilama ile şablon verdiyse varsayılan metnin yerine o kullanılır.
    const ozelMesaj = ayarlar.hosgeldinMesaji
      ? String(ayarlar.hosgeldinMesaji)
          .replaceAll('{uye}', `${member}`)
          .replaceAll('{sunucu}', guild.name)
          .replaceAll('{sayi}', String(guild.memberCount))
      : null;

    const embed = kageEmbed({
      baslik: `⛩️ GÖLGE DİYARINA HOŞ GELDİN • ${member.user.displayName}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: ozelMesaj ? `${ozelMesaj}\n\n*${rastgeleSlogan()}*` : `Karanlık koridorları arala, parşömenlerin kadim bilgisine kulak ver.\n\n` +
        `⚔️ **${member}**, Kage kalesine adırını bastı!\n` +
        `🏮 Sunucumuzun **${guild.memberCount}.** savaşçısı oldun.\n\n` +
        (kayitKanali ? `👉 **İlk Görevin:** ${kayitKanali} kanalına gidip mührünü basarak kaleye kayıt olmalısın!\n\n` : '') +
        `*${rastgeleSlogan()}*`,
      thumbnail: avatarUrl,
      alanlar: [
        {
          name: `📜 Kage Platformu`,
          value: `[kage95.com](${siteUrl}) adresinde binlerce manga ve yakında çıkacak indie oyunumuz seni bekliyor.`,
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
