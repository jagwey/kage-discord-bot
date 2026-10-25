import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { bakiyeGetir } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('envanter')
  .setDescription('Kuşandığınız katanayı, unvanınızı, cüzdanınızı ve samuray istatistiklerinizi görüntüler.')
  .addUserOption(opt =>
    opt.setName('kullanici')
      .setDescription('Envanterini görmek istediğiniz samuray (boşsa kendiniz)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('kullanici') || interaction.user;
  const b = bakiyeGetir(targetUser.id);
  const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 256 });

  const envanterMetni = (b.envanter && b.envanter.length > 0)
    ? b.envanter.map(e => `• ${e}`).join('\n')
    : '*Henüz pazardan özel bir eşya alınmamış.*';

  const embed = kageEmbed({
    baslik: `📜 SAMURAY KÜTÜĞÜ VE ENVANTERİ • ${targetUser.username}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `*${rastgeleSlogan()}*\n\n` +
      `👤 **Unvan:** \`${b.unvan}\`\n` +
      `🗡️ **Kuşanılan Katana:** **${b.kilic.ad}** (Sv. ${b.kilic.seviye}/5 • Güç +%${b.kilic.bonus})\n` +
      `💰 **Nakit Cüzdan:** \`${b.ryo} Ryo\`\n` +
      `🏦 **Banka Kasası:** \`${b.banka} Ryo\`\n\n` +
      `⚔️ **Savaş Sicili:**\n` +
      `• Düello Zaferleri: \`${b.duelloZafer}\` zafer / \`${b.duelloMaglubiyet}\` mağlubiyet\n` +
      `• Temizlenen Zindanlar: \`${b.zindanZafer}\` zindan\n` +
      `• Günlük Seri (Streak): \`${b.streak}\` gün\n\n` +
      `🎒 **Çanta ve Eşyalar:**\n${envanterMetni}`,
    thumbnail: avatarUrl,
    footer: `Kage 95 Samuray Kartı • kage95.com`
  });

  return interaction.reply({ embeds: [embed] });
}
