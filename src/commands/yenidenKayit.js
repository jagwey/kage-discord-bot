import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { kayitModaliOlustur, kullaniciKayitBilgileriniGetir } from '../services/kayitServisi.js';
import { kageEmbed, TEMA } from '../config/tema.js';

export const data = new SlashCommandBuilder()
  .setName('yeniden-kayit')
  .setDescription('Kage kalesi kimliğinizi, cinsiyetinizi ve profilinizi yeniden belirleyin.')
  .addUserOption(opt =>
    opt
      .setName('uye')
      .setDescription('Kaydı yenilenecek üye (Yalnızca yetkililer başka üyeyi seçebilir)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const hedefUser = interaction.options.getUser('uye');

  // 1. Kullanıcı kendi kaydını yeniliyorsa doğrudan Modalı aç
  if (!hedefUser || hedefUser.id === interaction.user.id) {
    const varsayilanlar = kullaniciKayitBilgileriniGetir(interaction.user.id, interaction.member);
    const modal = kayitModaliOlustur(varsayilanlar);
    return interaction.showModal(modal);
  }

  // 2. Yetkili başka bir üyenin kaydını sıfırlamak istiyorsa
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: '⛔ Başka bir üyenin kaydını sıfırlamak için Rolleri Yönet yetkisine sahip olmalısınız.',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });
  const hedefMember = await interaction.guild.members.fetch(hedefUser.id).catch(() => null);
  if (!hedefMember) {
    return interaction.editReply({ content: '❌ Hedef üye sunucuda bulunamadı.' });
  }

  // Eski rolleri temizle, Ronin (Kayıtsız) rolünü ver
  const kunoichiRole = interaction.guild.roles.cache.find(r => r.name.includes('Kunoichi'));
  const samurayRole = interaction.guild.roles.cache.find(r => r.name.includes('Samurayı'));
  const shinobiRole = interaction.guild.roles.cache.find(r => r.name.includes('Shinobi'));
  const roninRole = interaction.guild.roles.cache.find(r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));

  try {
    if (kunoichiRole && hedefMember.roles.cache.has(kunoichiRole.id)) await hedefMember.roles.remove(kunoichiRole);
    if (samurayRole && hedefMember.roles.cache.has(samurayRole.id)) await hedefMember.roles.remove(samurayRole);
    if (shinobiRole && hedefMember.roles.cache.has(shinobiRole.id)) await hedefMember.roles.remove(shinobiRole);
    if (roninRole) await hedefMember.roles.add(roninRole);

    // Takma adındaki sembolü temizle
    const temizIsim = hedefMember.displayName.replace(/[🌸🗡️]/g, '').trim();
    await hedefMember.setNickname(temizIsim).catch(() => {});
  } catch (err) {
    console.warn('[YenidenKayit] Rol sıfırlama uyarısı:', err.message);
  }

  const embed = kageEmbed({
    baslik: '🔄 KAYIT MÜHRÜ SIFIRLANDI',
    renk: TEMA.RENKLER.UYARI,
    aciklama: `**${hedefMember}** kullanıcısının klan kayıt mührü sıfırlandı ve \`Ronin (Kayıtsız)\` durumuna alındı.\n\n` +
      `Kullanıcı artık kayıt panelinden veya \`/yeniden-kayit\` komutuyla baştan kayıt olabilir.`,
    altMetin: `Yetkili: ${interaction.user.tag}`
  });

  return interaction.editReply({ embeds: [embed] });
}
