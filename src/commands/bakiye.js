import { SlashCommandBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, liderlikListesi } from '../services/ekonomiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('bakiye')
  .setDescription('Cüzdanınızdaki Ryo miktarını, düello skorunuzu ve klan derecenizi gösterir.')
  .addUserOption(opt =>
    opt.setName('kullanici')
      .setDescription('Bakiyesini görüntülemek istediğiniz üye (boş bırakılırsa kendiniz)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const hedef = interaction.options.getUser('kullanici') || interaction.user;
  const b = bakiyeGetir(hedef.id);
  const liderler = liderlikListesi(100);
  const sira = liderler.findIndex(l => l.userId === hedef.id) + 1 || '100+';

  let unvan = 'Fakir Ronin';
  if (b.toplam >= 10000) unvan = 'Altın Kage Milyarderi';
  else if (b.toplam >= 5000) unvan = 'Zengin Daimyo';
  else if (b.toplam >= 2000) unvan = 'Kıdemli Tüccar';
  else if (b.toplam >= 500) unvan = 'Şerefli Samuray';

  const embed = kageEmbed({
    baslik: `🪙 SAMURAY CÜZDANI • ${hedef.username}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `Kage dünyasındaki ekonomik varlığınız ve klan servetiniz.\n\n👑 **Ekonomi Unvanı:** \`${unvan}\`\n🏆 **Sunucu Sıralaması:** \`#${sira}\``,
    thumbnail: hedef.displayAvatarURL({ dynamic: true, size: 256 }),
    alanlar: [
      { name: '💰 Nakit (Cüzdan)', value: `\`${b.ryo.toLocaleString('tr-TR')} Ryo\``, inline: true },
      { name: '🔥 Giriş Serisi', value: `\`${b.streak} Gün\``, inline: true },
      { name: '⚔️ Düello Sicili', value: `\`${b.duelloZafer}G / ${b.duelloMaglubiyet}M\``, inline: true },
      { name: '🏰 Zindan Keşfi', value: `\`${b.zindanZafer} Zafer\``, inline: true }
    ],
    altMetin: `Günlük ödülünüzü almak için /gunluk yazabilirsiniz.`
  });

  return interaction.reply({ embeds: [embed] });
}
