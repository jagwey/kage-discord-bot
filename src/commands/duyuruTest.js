import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { duyuruTestEt } from '../services/duyuruServisi.js';

export const data = new SlashCommandBuilder()
  .setName('duyuru-test')
  .setDescription('Bölüm duyuru sistemini anında test eder ve kanala örnek bir bildirim gönderir.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  // Yönetici yetkisi kontrolü
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    const yetkiEmbed = kageEmbed({
      baslik: 'Erişim Reddedildi',
      renk: TEMA.RENKLER.HATA,
      aciklama: `${TEMA.EMOJILER.KATANA} Bu kutsal gölge komutunu sadece **Sunucuyu Yönet** yetkisine sahip samuraylar kullanabilir.`
    });
    return interaction.reply({ embeds: [yetkiEmbed], flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const hedefKanalId = process.env.ANNOUNCEMENT_CHANNEL_ID || interaction.channelId;
    await duyuruTestEt(interaction.client, hedefKanalId);

    const basariEmbed = kageEmbed({
      baslik: 'Duyuru Testi Gönderildi',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `${TEMA.EMOJILER.FENER} Örnek bölüm duyuru kartı başarıyla <#${hedefKanalId}> kanalına iletildi.`
    });

    return interaction.editReply({ embeds: [basariEmbed] });
  } catch (err) {
    console.error('[DuyuruTest Komutu] Hata:', err.message);

    const hataEmbed = kageEmbed({
      baslik: 'Duyuru Gönderilemedi',
      renk: TEMA.RENKLER.HATA,
      aciklama: `Test duyurusu oluşturulurken bir hata meydana geldi:\n\`\`\`${err.message}\`\`\``
    });

    return interaction.editReply({ embeds: [hataEmbed] });
  }
}
