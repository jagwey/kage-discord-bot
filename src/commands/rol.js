import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('rol')
  .setDescription('Belirtilen üyeye rol verir veya üyenin rolünü alır.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(opt =>
    opt.setName('islem')
      .setDescription('Yapılacak işlem')
      .setRequired(true)
      .addChoices(
        { name: 'Rol Ver', value: 'ver' },
        { name: 'Rol Al', value: 'al' }
      )
  )
  .addUserOption(opt => opt.setName('kullanici').setDescription('İşlem yapılacak üye').setRequired(true))
  .addRoleOption(opt => opt.setName('rol').setDescription('Verilecek veya alınacak rol').setRequired(true));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({ content: 'Bu komut için `Rolleri Yönet` yetkiniz olmalıdır.', flags: MessageFlags.Ephemeral });
  }

  const islem = interaction.options.getString('islem');
  const targetUser = interaction.options.getUser('kullanici');
  const targetRole = interaction.options.getRole('rol');

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: 'Bu üye sunucuda bulunamadı.', flags: MessageFlags.Ephemeral });
  }

  // Botun rolünün hedef rolden yüksek olup olmadığını kontrol et
  const botMember = interaction.guild.members.me;
  if (targetRole.position >= botMember.roles.highest.position) {
    return interaction.reply({
      content: `${TEMA.EMOJILER.KATANA} Bu rolü yönetemem. Rolün hiyerarşisi benim en yüksek rolümden üstte veya eşit.`,
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply();

  try {
    if (islem === 'ver') {
      if (member.roles.cache.has(targetRole.id)) {
        return interaction.editReply({ content: `**${targetUser.tag}** zaten bu role sahip.` });
      }
      await member.roles.add(targetRole, `${interaction.user.tag} tarafından verildi.`);

      const embed = kageEmbed({
        baslik: 'GÖLGE ROLÜ BAHŞEDİLDİ',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `${TEMA.EMOJILER.TORII} ${member} artık **${targetRole.name}** unvanını taşıyor.`,
        alanlar: [
          { name: 'Üye', value: `${member}`, inline: true },
          { name: 'Rol', value: `${targetRole}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user}`, inline: true }
        ]
      });

      await modLogGonder(interaction.guild, {
        baslik: '🎖️ ROL VERİLDİ',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `**${targetUser.tag}** üyesine ${targetRole.name} rolü verildi.`,
        hedefAvatar: targetUser.displayAvatarURL(),
        alanlar: [
          { name: 'Üye', value: `${targetUser.tag}`, inline: true },
          { name: 'Rol', value: `${targetRole.name}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true }
        ]
      });

      return interaction.editReply({ embeds: [embed] });
    } else {
      if (!member.roles.cache.has(targetRole.id)) {
        return interaction.editReply({ content: `**${targetUser.tag}** zaten bu role sahip değil.` });
      }
      await member.roles.remove(targetRole, `${interaction.user.tag} tarafından alındı.`);

      const embed = kageEmbed({
        baslik: 'GÖLGE ROLÜ GERİ ALINDI',
        renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
        aciklama: `${TEMA.EMOJILER.KATANA} ${member} üzerinden **${targetRole.name}** unvanı geri çekildi.`,
        alanlar: [
          { name: 'Üye', value: `${member}`, inline: true },
          { name: 'Rol', value: `${targetRole.name}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user}`, inline: true }
        ]
      });

      await modLogGonder(interaction.guild, {
        baslik: '🎗️ ROL ALINDI',
        renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
        aciklama: `**${targetUser.tag}** üzerinden ${targetRole.name} rolü alındı.`,
        hedefAvatar: targetUser.displayAvatarURL(),
        alanlar: [
          { name: 'Üye', value: `${targetUser.tag}`, inline: true },
          { name: 'Rol', value: `${targetRole.name}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true }
        ]
      });

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    return interaction.editReply({ content: `Rol işlemi başarısız oldu: ${err.message}` });
  }
}
