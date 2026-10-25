import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('kayit-paneli')
  .setDescription('Mevcut kanala kalıcı, butonlu Kage kayıt paneli gönderir.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const embed = kageEmbed({
    baslik: '⛩️ KAGE KALESİ • GİRİŞ VE KAYIT KAPISI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage 95 manga ve oyun kalesine hoş geldiniz!\n\n` +
      `Kalenin iç odalarına, anime/manga tartışmalarına, ses kanallarına ve yapay zeka vezirine erişebilmek için lütfen aşağıdaki butona tıklayarak klan kaydınızı tamamlayın.\n\n` +
      `📜 **Kayıt Olanlara:**\n` +
      `• \`Shinobi (Kayıtlı Üye)\` rolü verilir.\n` +
      `• \`Manga Okuru\` rolüyle yeni bölümler anında bildirilir.\n` +
      `• Cüzdanınıza \`+50 Ryo\` hoş geldin ödülü aktarılır!\n\n` +
      `*Aşağıdaki butona basarak mührünü bas ve aramıza katıl!*`,
    footer: `Kage Otomatik Kayıt Sistemi • jagwey / kage95.com`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kage_kayit_ol_btn')
      .setLabel('Mührü Bas & Kayıt Ol')
      .setStyle(ButtonStyle.Success)
      .setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder()
      .setLabel('Web Sitesi')
      .setURL(process.env.SITE_URL || 'https://kage95.com')
      .setStyle(ButtonStyle.Link)
      .setEmoji(TEMA.EMOJILER.PARSOMEN)
  );

  await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  return interaction.reply({
    content: '✅ Butonlu kayıt paneli bu kanala başarıyla kuruldu!',
    ephemeral: true
  });
}
