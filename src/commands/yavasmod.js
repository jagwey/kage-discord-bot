import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('yavasmod')
  .setDescription('Kanal için mesaj gönderme bekleme süresini (yavaş mod) ayarlar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addIntegerOption(opt =>
    opt.setName('saniye')
      .setDescription('Bekleme süresi (0 yazarsanız yavaş mod kapanır, max 21600 sn / 6 saat)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(21600)
  )
  .addChannelOption(opt => opt.setName('kanal').setDescription('Uygulanacak kanal (boşsa mevcut kanal)').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: 'Bu komut için `Kanalları Yönet` yetkiniz olmalıdır.', flags: MessageFlags.Ephemeral });
  }

  const saniye = interaction.options.getInteger('saniye');
  const targetChannel = interaction.options.getChannel('kanal') || interaction.channel;

  if (!targetChannel.isTextBased()) {
    return interaction.reply({ content: 'Sadece metin kanallarına yavaş mod uygulanabilir.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  try {
    await targetChannel.setRateLimitPerUser(saniye, `${interaction.user.tag} tarafından ayarlandı.`);

    const embed = kageEmbed({
      baslik: saniye > 0 ? 'YAVAŞ MOD DEVREYE GİRDİ' : 'YAVAŞ MOD DEVRE DIŞI',
      renk: saniye > 0 ? TEMA.RENKLER.KAN_KIRMIZISI : TEMA.RENKLER.BASARI,
      aciklama: saniye > 0
        ? `${TEMA.EMOJILER.ZAMAN} **${targetChannel}** kanalında her üye **${saniye} saniyede bir** mesaj gönderebilir.`
        : `${TEMA.EMOJILER.TORII} **${targetChannel}** kanalında yavaş mod kapatıldı.`,
      alanlar: [
        { name: 'Kanal', value: `${targetChannel}`, inline: true },
        { name: 'Süre', value: `${saniye} saniye`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true }
      ]
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ content: `Yavaş mod ayarlanamadı: ${err.message}` });
  }
}
