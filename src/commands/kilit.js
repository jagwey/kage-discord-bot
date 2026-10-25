import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('kilit')
  .setDescription('Kanalı üyelere mesaj yazmaya kilitler veya kilidi açar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption(opt =>
    opt.setName('durum')
      .setDescription('Uygulanacak işlem')
      .setRequired(true)
      .addChoices(
        { name: '🔒 Kilitle (Yazılamaz)', value: 'kilitle' },
        { name: '🔓 Kilidi Aç (Yazılabilir)', value: 'ac' }
      )
  )
  .addChannelOption(opt => opt.setName('kanal').setDescription('İşlem yapılacak kanal (boşsa mevcut kanal)').setRequired(false))
  .addStringOption(opt => opt.setName('sebep').setDescription('Kilitleme/açma sebebi').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: 'Bu komut için `Kanalları Yönet` yetkiniz olmalıdır.', ephemeral: true });
  }

  const durum = interaction.options.getString('durum');
  const targetChannel = interaction.options.getChannel('kanal') || interaction.channel;
  const sebep = interaction.options.getString('sebep') || 'Yönetim kararı.';

  if (!targetChannel.isTextBased()) {
    return interaction.reply({ content: 'Sadece metin kanalları kilitlenebilir.', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    const everyoneRole = interaction.guild.roles.everyone;

    if (durum === 'kilitle') {
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
        AddReactions: false
      }, { reason: `${interaction.user.tag}: ${sebep}` });

      const embed = kageEmbed({
        baslik: 'KANAL MÜHÜRLENDİ (KİLİTLENDİ)',
        renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
        aciklama: `${TEMA.EMOJILER.KATANA} **${targetChannel}** kilitlendi. Yöneticiler haricinde kimse bu kanala mesaj gönderemez.`,
        alanlar: [
          { name: 'Kanal', value: `${targetChannel}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user}`, inline: true },
          { name: 'Sebep', value: sebep, inline: false }
        ]
      });

      await modLogGonder(interaction.guild, {
        baslik: '🔒 KANAL KİLİTLENDİ',
        renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
        aciklama: `${targetChannel} kanalı mühürlendi.`,
        alanlar: [
          { name: 'Kanal', value: `${targetChannel.name}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
          { name: 'Sebep', value: sebep, inline: false }
        ]
      });

      return interaction.editReply({ embeds: [embed] });
    } else {
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null,
        AddReactions: null
      }, { reason: `${interaction.user.tag}: ${sebep}` });

      const embed = kageEmbed({
        baslik: 'KANAL MÜHRÜ KALDIRILDI (AÇILDI)',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `${TEMA.EMOJILER.TORII} **${targetChannel}** kilidi açıldı. Samuraylar tekrar sohbet edebilir.`,
        alanlar: [
          { name: 'Kanal', value: `${targetChannel}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user}`, inline: true },
          { name: 'Sebep', value: sebep, inline: false }
        ]
      });

      await modLogGonder(interaction.guild, {
        baslik: '🔓 KANAL KİLİDİ AÇILDI',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `${targetChannel} kanalının kilidi kaldırıldı.`,
        alanlar: [
          { name: 'Kanal', value: `${targetChannel.name}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
          { name: 'Sebep', value: sebep, inline: false }
        ]
      });

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    return interaction.editReply({ content: `Kanal izinleri değiştirilemedi: ${err.message}` });
  }
}
