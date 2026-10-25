import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sil')
  .setDescription('Kanalda belirtilen miktarda mesajı topluca temizler.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(opt =>
    opt.setName('miktar')
      .setDescription('Silinecek mesaj sayısı (1-100 arası)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption(opt =>
    opt.setName('kullanici')
      .setDescription('Sadece bu kullanıcının mesajlarını sil (opsiyonel)')
      .setRequired(false)
  );

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: 'Bu komut için `Mesajları Yönet` yetkiniz olmalıdır.', ephemeral: true });
  }

  const miktar = interaction.options.getInteger('miktar');
  const hedefKullanici = interaction.options.getUser('kullanici');

  await interaction.deferReply({ ephemeral: true });

  try {
    const mesajlar = await interaction.channel.messages.fetch({ limit: miktar });
    let silinecekler = mesajlar;

    if (hedefKullanici) {
      silinecekler = mesajlar.filter(m => m.author.id === hedefKullanici.id);
    }

    const silinen = await interaction.channel.bulkDelete(silinecekler, true);

    const embed = kageEmbed({
      baslik: 'KILIÇLA TEMİZLENDİ (PURGE)',
      renk: TEMA.RENKLER.KAN_KIRMIZISI,
      aciklama: `${TEMA.EMOJILER.KATANA} **${silinen.size}** adet mesaj tarihe karıştı ve gölgelere gömüldü.`,
      alanlar: [
        { name: 'Kanal', value: `${interaction.channel}`, inline: true },
        { name: 'Yetkili', value: `${interaction.user}`, inline: true },
        { name: 'Hedef Filtre', value: hedefKullanici ? `${hedefKullanici}` : 'Tüm Mesajlar', inline: true }
      ]
    });

    await modLogGonder(interaction.guild, {
      baslik: '🧹 TOPLU MESAJ SİLİNDİ',
      renk: TEMA.RENKLER.BILGI,
      aciklama: `${interaction.channel} kanalında **${silinen.size}** adet mesaj silindi.`,
      alanlar: [
        { name: 'Kanal', value: `${interaction.channel.name}`, inline: true },
        { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
        { name: 'Filtre', value: hedefKullanici ? hedefKullanici.tag : 'Genel', inline: true }
      ]
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ content: `Mesajlar silinemedi: ${err.message}` });
  }
}
