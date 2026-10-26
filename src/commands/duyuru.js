import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('duyuru')
  .setDescription('Kage 95 temalı şık ve resmi bir topluluk duyurusu yayınlar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone)
  .addChannelOption(opt => opt.setName('kanal').setDescription('Duyurunun gönderileceği kanal').setRequired(true))
  .addStringOption(opt => opt.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
  .addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru ana metni (Satır atlamak için \\n kullanabilirsiniz)').setRequired(true))
  .addStringOption(opt =>
    opt.setName('etiket')
      .setDescription('Duyuruyla birlikte etiketlenecek kitle')
      .setRequired(false)
      .addChoices(
        { name: 'Yok (Etiketsiz)', value: 'yok' },
        { name: '@everyone', value: 'everyone' },
        { name: '@here', value: 'here' }
      )
  )
  .addRoleOption(opt => opt.setName('rol').setDescription('Özel bir rol etiketle (opsiyonel)').setRequired(false))
  .addStringOption(opt => opt.setName('gorsel_url').setDescription('Duyuruya eklenecek afiş/resim linki').setRequired(false));

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.MentionEveryone)) {
    return interaction.reply({ content: 'Bu komut için `Kitleyi Etiketleme / Duyuru` yetkiniz olmalıdır.', flags: MessageFlags.Ephemeral });
  }

  const kanal = interaction.options.getChannel('kanal');
  const baslik = interaction.options.getString('baslik');
  const hamMesaj = interaction.options.getString('mesaj').replace(/\\n/g, '\n');
  const etiketSecim = interaction.options.getString('etiket');
  const ozelRol = interaction.options.getRole('rol');
  const gorselUrl = interaction.options.getString('gorsel_url');

  if (!kanal.isTextBased()) {
    return interaction.reply({ content: 'Duyurular sadece metin kanallarına gönderilebilir.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    let etiketMetni = '';
    if (etiketSecim === 'everyone') etiketMetni = '@everyone';
    else if (etiketSecim === 'here') etiketMetni = '@here';

    if (ozelRol) {
      etiketMetni = etiketMetni ? `${etiketMetni} ${ozelRol}` : `${ozelRol}`;
    }

    const embed = kageEmbed({
      baslik: `RESMİ FERMAN • ${baslik}`,
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: hamMesaj,
      resim: gorselUrl || null,
      altMetin: `Kage 95 Duyuru Sistemi • Mühürleyen: ${interaction.user.tag}`
    });

    await kanal.send({
      content: etiketMetni || null,
      embeds: [embed]
    });

    return interaction.editReply({ content: `Duyurunuz başarıyla ${kanal} kanalında yayınlandı.` });
  } catch (err) {
    return interaction.editReply({ content: `Duyuru gönderilemedi: ${err.message}` });
  }
}
