import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { golgeGozDurumu, golgeGozTopluAnaliz } from '../services/golgeGozServisi.js';

export const data = new SlashCommandBuilder()
  .setName('golge-goz')
  .setDescription('Kage-95 evreninin tüm sunucuyu izleyen ve otonom öğrenen Gölge Gözü radarı.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName('durum')
      .setDescription('Gölge Gözü canlı telemetrisini ve istatistiklerini gösterir.')
  )
  .addSubcommand(sub =>
    sub.setName('rapor')
      .setDescription('Son sohbetlerden otonom olarak öğrenilen gerçekleri ve yakalanan şüpheleri listeler.')
  )
  .addSubcommand(sub =>
    sub.setName('tara')
      .setDescription('Sohbet havuzunda biriken mesajları yapay zekayla hemen tarar.')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const durum = golgeGozDurumu();

  if (sub === 'durum') {
    const embed = kageEmbed({
      baslik: '👁️ KAGE-95 GÖLGE GÖZÜ • CANLI RADAR',
      renk: TEMA.RENKLER.ALTIN,
      aciklama: `Kage-95 Gölge Gözü, sunucudaki tüm kanalları **sıfır gecikmeyle (0 ms)** sessizce izler; reklam ve toksik içerikleri sezer, önemli sohbetleri hafif mikro havuzda toplayarak **kendi kendini eğitir**.\n\n` +
        `🛡️ **Sistem Yükü & Kota Güvencesi:** Mesajlar tek tek API'ye gönderilmez; mikro tampon sayesinde sıfır API yorgunluğu ve %100 ücretsiz model optimizasyonu ile çalışır.`,
      alanlar: [
        {
          name: '📡 İzlenen Mesaj',
          value: `\`${durum.toplamIncelenenMesaj.toLocaleString('tr-TR')} mesaj\``,
          inline: true
        },
        {
          name: '🧠 Otonom Öğrenilen Bilgi',
          value: `\`${durum.ogrenilenBilgiSayisi.toLocaleString('tr-TR')} gerçek\``,
          inline: true
        },
        {
          name: '🚨 Önlenen Şüpheli Hareket',
          value: `\`${durum.onlenenIhlalSayisi.toLocaleString('tr-TR')} ihlal\``,
          inline: true
        },
        {
          name: '⏱️ Son Otonom Tarama',
          value: durum.sonTaramaZamani ? `<t:${Math.floor(new Date(durum.sonTaramaZamani).getTime() / 1000)}:R>` : 'Henüz yapılmadı',
          inline: true
        },
        {
          name: '⚙️ Radar Durumu',
          value: durum.acik ? '🟢 `Aktif & Nöbette`' : '🔴 `Devre Dışı`',
          inline: true
        }
      ],
      altMetin: `Gölge Gözü Radarı • Yetkili: ${interaction.user.username}`
    });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'rapor') {
    const ogrenilenler = (durum.sonOgrenilenler || []).slice(0, 8);
    const ihlaller = (durum.sonIhlaller || []).slice(0, 5);

    const ogrenilenMetin = ogrenilenler.length
      ? ogrenilenler.map(o => `• **${o.kullanici}:** *${o.bilgi}*`).join('\n')
      : 'Henüz taze bir bilgi öğrenilmedi.';

    const ihlalMetin = ihlaller.length
      ? ihlaller.map(i => `• 🚨 **${i.kullanici}** (#${i.kanal}) ➔ \`${i.tip}\``).join('\n')
      : '🟢 Son dönemde şüpheli bir ihlal sezilmedi.';

    const embed = kageEmbed({
      baslik: '📜 GÖLGE GÖZÜ İSTİHBARAT RAPORU',
      renk: TEMA.RENKLER.BILGI,
      aciklama: `Gölge Gözü'nün sunucu sohbetlerinden yapay zeka ile süzdüğü son istihbarat ve güvenlik kayıtları:`,
      alanlar: [
        {
          name: '🧠 Son Öğrenilen Gerçekler',
          value: ogrenilenMetin,
          inline: false
        },
        {
          name: '🛡️ Yakalanan Güvenlik Kayıtları',
          value: ihlalMetin,
          inline: false
        }
      ],
      altMetin: 'Kage Güvenlik & Otonom İstihbarat'
    });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  if (sub === 'tara') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await golgeGozTopluAnaliz(interaction.client);
      return interaction.editReply({
        content: '✅ **Gölge Gözü taraması başarıyla tamamlandı!** Havuzdaki mesajlar yapay zekayla incelendi ve çıkarılan gerçekler merkezi hafızaya işlendi.'
      });
    } catch (err) {
      return interaction.editReply({
        content: `❌ Tarama sırasında aksaklık: ${err.message}`
      });
    }
  }
}
