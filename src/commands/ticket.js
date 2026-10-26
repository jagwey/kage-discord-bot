import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sunucuAyarGetir, sunucuAyarGuncelle } from '../services/veritabaniServisi.js';

export const butonOnek = 'kage_ticket:';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Destek bileti sistemi (yönetici).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('panel').setDescription('Bilet açma butonunu bu kanala gönder')
    .addChannelOption(o => o.setName('kategori').setDescription('Biletlerin açılacağı kategori').addChannelTypes(ChannelType.GuildCategory))
    .addRoleOption(o => o.setName('yetkili').setDescription('Biletleri görecek destek rolü'))
    .addChannelOption(o => o.setName('log').setDescription('Kapanan biletlerin kaydı').addChannelTypes(ChannelType.GuildText)));

export async function execute(interaction) {
  const kategori = interaction.options.getChannel('kategori');
  const yetkili = interaction.options.getRole('yetkili');
  const log = interaction.options.getChannel('log');
  const yeni = {};
  if (kategori) yeni.ticketKategoriId = kategori.id;
  if (yetkili) yeni.ticketRolId = yetkili.id;
  if (log) yeni.ticketLogKanalId = log.id;
  if (Object.keys(yeni).length) sunucuAyarGuncelle(interaction.guildId, yeni);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}ac`).setLabel('Bilet aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
  );
  await interaction.channel.send({
    embeds: [kageEmbed({
      baslik: 'DESTEK',
      renk: TEMA.RENKLER.BILGI,
      aciklama: 'Sorunun veya şikayetin için aşağıdaki butona bas. Sana özel, yalnız yetkililerin göreceği bir kanal açılır.'
    })],
    components: [row]
  });
  return interaction.reply({ content: 'Bilet paneli gönderildi.', flags: MessageFlags.Ephemeral });
}

/** Kanal adı için kullanıcı adını güvenli hale getirir. */
function kanalAdi(kullanici) {
  const temiz = kullanici.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'uye';
  return `bilet-${temiz}`;
}

export async function buton(interaction) {
  const eylem = interaction.customId.slice(butonOnek.length);
  const guild = interaction.guild;
  const ayar = sunucuAyarGetir(guild.id);

  if (eylem === 'ac') {
    const mevcut = guild.channels.cache.find(c => c.topic === `ticket:${interaction.user.id}`);
    if (mevcut) {
      return interaction.reply({ content: `Zaten açık biletin var: ${mevcut}`, flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const izinler = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: guild.members.me.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
      }
    ];
    if (ayar.ticketRolId) {
      izinler.push({
        id: ayar.ticketRolId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }
    try {
      const kanal = await guild.channels.create({
        name: kanalAdi(interaction.user),
        type: ChannelType.GuildText,
        parent: ayar.ticketKategoriId || null,
        topic: `ticket:${interaction.user.id}`,
        permissionOverwrites: izinler
      });
      const kapat = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${butonOnek}kapat`).setLabel('Bileti kapat').setEmoji('🔒').setStyle(ButtonStyle.Danger)
      );
      await kanal.send({
        content: `${interaction.user}${ayar.ticketRolId ? ` <@&${ayar.ticketRolId}>` : ''}`,
        embeds: [kageEmbed({
          baslik: 'BİLET AÇILDI',
          renk: TEMA.RENKLER.BASARI,
          aciklama: 'Sorununu yaz, yetkililer en kısa sürede dönecek. İş bitince aşağıdaki butonla kapat.'
        })],
        components: [kapat]
      });
      return interaction.editReply(`Biletin hazır: ${kanal}`);
    } catch (err) {
      console.error('[Ticket] Kanal açılamadı:', err.message);
      return interaction.editReply('Bilet açılamadı. Botun kanal yönetme yetkisi var mı?');
    }
  }

  if (eylem === 'kapat') {
    const sahipId = interaction.channel.topic?.startsWith('ticket:') ? interaction.channel.topic.slice(7) : null;
    if (!sahipId) return interaction.reply({ content: 'Bu bir bilet kanalı değil.', flags: MessageFlags.Ephemeral });
    const yetkili = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
      || (ayar.ticketRolId && interaction.member.roles.cache.has(ayar.ticketRolId));
    if (interaction.user.id !== sahipId && !yetkili) {
      return interaction.reply({ content: 'Bu bileti kapatamazsın.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply('Bilet 5 saniye içinde kapanıyor.');

    if (ayar.ticketLogKanalId) {
      const logKanal = await guild.channels.fetch(ayar.ticketLogKanalId).catch(() => null);
      if (logKanal?.isTextBased()) {
        await logKanal.send({
          embeds: [kageEmbed({
            baslik: 'BİLET KAPANDI',
            renk: TEMA.RENKLER.UYARI_SARI,
            aciklama: `Kanal: **${interaction.channel.name}**\nSahip: <@${sahipId}>\nKapatan: ${interaction.user}`
          })],
          allowedMentions: { parse: [] }
        }).catch(() => {});
      }
    }
    setTimeout(() => interaction.channel.delete('Bilet kapatıldı').catch(() => {}), 5000);
  }
}
