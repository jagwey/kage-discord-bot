import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { stickerleriSunucuyaYukle, yuklemeDurumu } from '../services/stickerServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sticker-yukle')
  .setDescription('Kage stickerlarını sunucuya gerçek sticker (yuva yoksa emoji) olarak ekle.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
  .setDMPermission(false)
  .addStringOption(o => o.setName('tur').setDescription('Hangi set? (varsayılan: ikisi)')
    .addChoices({ name: 'Kage (erkek)', value: 'erkek' }, { name: 'Kunoichi (kadın)', value: 'kunoichi' }));

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuildExpressions)) {
    return interaction.reply({ content: '❌ Bunun için **Emoji ve Sticker Yönet** yetkisi gerekir.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const tur = interaction.options.getString('tur');
  await interaction.guild.stickers.fetch().catch(() => null);
  const s = await stickerleriSunucuyaYukle(interaction.guild, tur ? { turler: [tur] } : {});

  const satirlar = [];
  if (s.eklenen.length) satirlar.push(`✅ Sticker olarak eklendi (${s.eklenen.length}): ${s.eklenen.join(', ')}`);
  if (s.emoji.length) satirlar.push(`🙂 Emoji olarak eklendi (${s.emoji.length}): ${s.emoji.join(', ')}`);
  if (s.atlanan.length) satirlar.push(`⏭️ Zaten var (${s.atlanan.length})`);
  if (s.hatalar.length) satirlar.push(`⚠️ Sorunlar:\n${s.hatalar.slice(0, 6).map(h => `• ${h}`).join('\n')}`);
  if (!s.eklenen.length && !s.emoji.length && !s.atlanan.length) satirlar.push('Hiçbir şey eklenemedi.');
  if (s.hatalar.some(h => /yuvası/.test(h)) || Object.keys(yuklemeDurumu(interaction.guild.id)).length < 14) {
    satirlar.push('ℹ️ Sticker yuvası sunucu seviyesine bağlı (seviye 0 = 5 yuva). Yuva yoksa ilk stickerlar eklenir, kalanlar sohbette dosya olarak gider.');
  }
  await interaction.editReply({ content: satirlar.join('\n').slice(0, 1900) });
}
