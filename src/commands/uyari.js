import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { uyariEkle, uyarilariGetir, uyarilariTemizle } from '../services/veritabaniServisi.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('uyari')
  .setDescription('Üyelerin ceza sicilini yönetir (uyarı ekleme, listeleme, temizleme).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub =>
    sub.setName('ekle')
      .setDescription('Üyeye resmi bir kural ihlali uyarısı ekler.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak üye').setRequired(true))
      .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı gerekçesi').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('liste')
      .setDescription('Üyenin geçmiş uyarı sicilini gösterir.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Siciline bakılacak üye').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('temizle')
      .setDescription('Üyenin tüm uyarılarını silerek sicilini temizler.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Sicili temizlenecek üye').setRequired(true))
  );

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({ content: 'Bu komut için `Üyeleri Yönet` yetkiniz olmalıdır.', flags: MessageFlags.Ephemeral });
  }

  const sub = interaction.options.getSubcommand();
  const targetUser = interaction.options.getUser('kullanici');
  const guildId = interaction.guild.id;

  if (sub === 'ekle') {
    const sebep = interaction.options.getString('sebep');
    const tumUyarilar = uyariEkle(guildId, targetUser.id, sebep, interaction.user.id);

    const embed = kageEmbed({
      baslik: 'GÖLGE UYARISI VERİLDİ',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `${TEMA.EMOJILER.KATANA} **${targetUser.tag}** kural ihlali nedeniyle uyarıldı. Toplam Uyarı: **${tumUyarilar.length}**`,
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Toplam Uyarı', value: `${tumUyarilar.length} adet`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    await modLogGonder(interaction.guild, {
      baslik: '⚠️ ÜYE UYARILDI (WARN)',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `**${targetUser.tag}** uyarıldı. Toplam uyarı: ${tumUyarilar.length}`,
      hedefAvatar: targetUser.displayAvatarURL(),
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false }
      ]
    });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'liste') {
    const uyarilar = uyarilariGetir(guildId, targetUser.id);

    if (uyarilar.length === 0) {
      const temizEmbed = kageEmbed({
        baslik: 'TEMİZ SİCİL',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `${TEMA.EMOJILER.TORII} **${targetUser.tag}** kullanıcısının sicili lekesizdir. Hiçbir uyarısı bulunmuyor.`
      });
      return interaction.reply({ embeds: [temizEmbed] });
    }

    const alanlar = uyarilar.map((u, i) => ({
      name: `${TEMA.EMOJILER.KAN} Uyarı #${i + 1}`,
      value: `**Sebep:** ${u.sebep}\n**Yetkili:** <@${u.yetkiliId}>\n**Tarih:** <t:${Math.floor(new Date(u.tarih).getTime() / 1000)}:f>`,
      inline: false
    }));

    const listeEmbed = kageEmbed({
      baslik: `CEZA SİCİLİ • ${targetUser.tag}`,
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `Toplam **${uyarilar.length}** adet aktif uyarı kaydı bulundu:`,
      thumbnail: targetUser.displayAvatarURL(),
      alanlar: alanlar.slice(0, 10) // En son 10 uyarı
    });

    return interaction.reply({ embeds: [listeEmbed] });
  }

  if (sub === 'temizle') {
    const silinen = uyarilariTemizle(guildId, targetUser.id);

    const temizlendiEmbed = kageEmbed({
      baslik: 'SİCİL AFFEDİLDİ (TEMİZLENDİ)',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `${TEMA.EMOJILER.TORII} **${targetUser.tag}** kullanıcısına ait **${silinen}** adet uyarı kaydı tamamen silindi.`
    });

    await modLogGonder(interaction.guild, {
      baslik: '✨ UYARILAR TEMİZLENDİ',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `**${targetUser.tag}** kullanıcısının tüm uyarıları silindi.`,
      hedefAvatar: targetUser.displayAvatarURL(),
      alanlar: [
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Silinen Uyarı', value: `${silinen} adet`, inline: true }
      ]
    });

    return interaction.reply({ embeds: [temizlendiEmbed] });
  }
}
