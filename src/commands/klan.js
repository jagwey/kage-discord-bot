import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { TEMA } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { bakiyeGetir, ryoDus } from '../services/ekonomiServisi.js';
import {
  klanKur,
  klanBul,
  kullaniciKlaniniBul,
  klanaKatil,
  klandanAyril,
  klanaBagisYap,
  klanLiderlikSiralamasi
} from '../services/klanServisi.js';
import { savasDurumu, SAVAS_PUANLARI, KASA_PAYI } from '../services/klanSavasServisi.js';

const KLAN_KURMA_UCRETI = 2500;

export const data = new SlashCommandBuilder()
    .setName('klan')
    .setDescription('Samuray klanı kur, katıl, kasaya bağış yap veya klan liderlik tablosunu incele.')
    .addSubcommand(sub =>
      sub
        .setName('bilgi')
        .setDescription('Kendi klanının veya belirtilen klanın detaylarını görüntüler.')
        .addStringOption(opt =>
          opt
            .setName('isim')
            .setDescription('İncelenecek klan adı (boş bırakırsan kendi klanını gösterir)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('kur')
        .setDescription(`2.500 Ryo karşılığında kendi samuray klanını kur.`)
        .addStringOption(opt =>
          opt
            .setName('isim')
            .setDescription('Klanının adı')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('aciklama')
            .setDescription('Klanının sloganı veya açıklaması')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('katil')
        .setDescription('Var olan bir samuray klanına katıl.')
        .addStringOption(opt =>
          opt
            .setName('isim')
            .setDescription('Katılmak istediğin klanın adı')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('ayril')
        .setDescription('Mevcut klanından ayrıl.')
    )
    .addSubcommand(sub =>
      sub
        .setName('bagis')
        .setDescription('Klan kasasına Ryo bağışla ve klanına seviye atlat.')
        .addIntegerOption(opt =>
          opt
            .setName('miktar')
            .setDescription('Bağışlanacak Ryo miktarı')
            .setRequired(true)
            .setMinValue(50)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('liderlik')
        .setDescription('Sunucudaki en güçlü ve zengin samuray klanlarını listeler.')
    )
    .addSubcommand(sub =>
      sub
        .setName('savas')
        .setDescription('Haftalık klan savaşı: puan tablosu, ödül havuzu ve son şampiyon.')
    );

export async function execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const userName = interaction.user.username;

    if (sub === 'bilgi') {
      const arananAd = interaction.options.getString('isim');
      const klan = arananAd ? klanBul(arananAd) : kullaniciKlaniniBul(userId);

      if (!klan) {
        return interaction.reply({
          content: arananAd
            ? `❌ **${arananAd}** adında bir klan bulunamadı.`
            : '❌ Herhangi bir klanın üyesi değilsin! Bir klana katılmak için `/klan katil <isim>`, yeni klan açmak için `/klan kur <isim>` kullanabilirsin.',
          ephemeral: true
        });
      }

      const gerekenXp = klan.seviye * 1000;
      const embed = new EmbedBuilder()
        .setColor(TEMA.KIRMIZI || 0xe53935)
        .setTitle(`⛩️ ${klan.ad} Klanı`)
        .setDescription(`*${klan.aciklama}*`)
        .addFields(
          { name: '👑 Klan Lideri', value: `<@${klan.liderId}>`, inline: true },
          { name: '⭐ Klan Seviyesi', value: `**${klan.seviye}**`, inline: true },
          { name: '👥 Üye Sayısı', value: `**${klan.uyeler.length} / ${klan.maksUye}**`, inline: true },
          { name: '💰 Klan Kasası', value: `**${ryoYaz(klan.kasa)}**`, inline: true },
          { name: '📈 Seviye İlerlemesi', value: `\`${klan.xp} / ${gerekenXp} XP\``, inline: true },
          { name: '🏆 Savaş Şampiyonluğu', value: `**${klan.sampiyonluk || 0}** hafta`, inline: true },
          {
            name: '🗡️ Savaşçılar',
            value: klan.uyeler.map(u => `• ${u.rol === 'Lider' ? '👑' : '⚔️'} ${u.ad}`).slice(0, 10).join('\n') + (klan.uyeler.length > 10 ? `\n*...ve ${klan.uyeler.length - 10} üye daha*` : '')
          }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kur') {
      const isim = interaction.options.getString('isim');
      const aciklama = interaction.options.getString('aciklama') || undefined;

      const bakiye = bakiyeGetir(userId);
      if (bakiye < KLAN_KURMA_UCRETI) {
        return interaction.reply({
          content: `❌ Klan sancağını dikmek için **${ryoYaz(KLAN_KURMA_UCRETI)}** gerekir (Mevcut cüzdanın: **${ryoYaz(bakiye)}**).`,
          ephemeral: true
        });
      }

      try {
        const yeniKlan = klanKur(userId, userName, isim, aciklama);
        ryoDus(userId, KLAN_KURMA_UCRETI);

        const embed = new EmbedBuilder()
          .setColor(TEMA.KIRMIZI || 0xe53935)
          .setTitle('🚩 Yeni Bir Samuray Klanı Yükseldi!')
          .setDescription(`**${yeniKlan.ad}** klanı resmen kuruldu!\nKlan Lideri: <@${userId}>`)
          .addFields(
            { name: 'Maksimum Kapasite', value: `${yeniKlan.maksUye} Savaşçı`, inline: true },
            { name: 'Klan Seviyesi', value: '1', inline: true }
          )
          .setFooter({ text: 'Diğer üyeler /klan katil komutuyla sancağın altına girebilir.' });

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'katil') {
      const isim = interaction.options.getString('isim');
      try {
        const klan = klanaKatil(userId, userName, isim);
        return interaction.reply({
          content: `⚔️ Tebrikler! **${klan.ad}** klanının sancağı altına girdin. Klanındaki savaşçılarla birlikte şan ve şöhret kazan!`
        });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'ayril') {
      try {
        const { klanFeshedildi, klanAdi } = klandanAyril(userId);
        if (klanFeshedildi) {
          return interaction.reply({
            content: `🚪 **${klanAdi}** klanının son üyesi olarak ayrıldın ve klan sancağı tarihe gömüldü.`
          });
        }
        return interaction.reply({
          content: `🚪 **${klanAdi}** klanından başarıyla ayrıldın. Artık bağımsız bir roninsin.`
        });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'bagis') {
      const miktar = interaction.options.getInteger('miktar');
      const bakiye = bakiyeGetir(userId);

      if (bakiye < miktar) {
        return interaction.reply({
          content: `❌ Bağışlamak istediğin kadar cüzdanında Ryo yok! (Mevcut: **${ryoYaz(bakiye)}**).`,
          ephemeral: true
        });
      }

      try {
        ryoDus(userId, miktar);
        const { klan, seviyeAtladi } = klanaBagisYap(userId, miktar);

        let msj = `💰 **${interaction.user.username}**, klan kasasına **${ryoYaz(miktar)}** bağışladı!\nKlan Kasası: **${ryoYaz(klan.kasa)}** (+${Math.floor(miktar / 2)} XP)`;
        if (seviyeAtladi) {
          msj += `\n\n🎉 **MÜJDE!** Klanınız **Seviye ${klan.seviye}** seviyesine ulaştı! Maksimum üye kapasitesi **${klan.maksUye}** kişiye çıktı!`;
        }
        return interaction.reply({ content: msj });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'savas') {
      const d = savasDurumu();
      const benimKlan = kullaniciKlaniniBul(userId);
      const liste = d.siralama.slice(0, 10).map((k, i) => {
        const madalya = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${madalya} **${k.ad}** — **${k.toplam}** puan`;
      }).join('\n') || 'Bu hafta henüz hiçbir klan puan almadı. İlk kanı sen dök!';

      const alanlar = [
        { name: '💰 Ödül Havuzu', value: `**${ryoYaz(d.havuz)}**\n%${Math.round(KASA_PAYI * 100)} kasaya, kalanı üyelere puanla`, inline: true },
        { name: '⏳ Bitiş', value: `<t:${Math.floor(d.bitis / 1000)}:R>`, inline: true },
        {
          name: '🎯 Puan Kaynakları',
          value: `🎣 Balık +${SAVAS_PUANLARI.balik} • 🏯 Zindan +${SAVAS_PUANLARI.zindan} (kat çarpanı)\n👹 Boss vuruşu +${SAVAS_PUANLARI.boss} • Boss öldürme +${SAVAS_PUANLARI.bossOldur}`,
          inline: false
        }
      ];
      if (benimKlan) {
        const kayit = d.siralama.find(k => k.id === benimKlan.id);
        const sira = kayit ? d.siralama.indexOf(kayit) + 1 : '-';
        alanlar.push({
          name: `⛩️ ${benimKlan.ad}`,
          value: `Sıra: **${sira}** • Klan puanı: **${kayit?.toplam || 0}** • Senin katkın: **${kayit?.uyeler?.[userId] || 0}**`,
          inline: false
        });
      }
      if (d.sonKazanan) {
        alanlar.push({ name: '👑 Geçen Haftanın Şampiyonu', value: `**${d.sonKazanan.ad}** (${d.sonKazanan.puan} puan)`, inline: false });
      }

      const embed = new EmbedBuilder()
        .setColor(TEMA.KIRMIZI || 0xe53935)
        .setTitle(`⚔️ Klan Savaşı • ${d.hafta} haftası`)
        .setDescription(liste)
        .addFields(alanlar)
        .setFooter({ text: 'Balık tut, zindana in, bossa vur: her hamle klanına puan yazar.' });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'liderlik') {
      const sirali = klanLiderlikSiralamasi();
      if (!sirali.length) {
        return interaction.reply({
          content: '⛩️ Sunucuda henüz kurulmuş bir klan bulunmuyor. İlk klanı sen kurmak için: `/klan kur <isim>`',
          ephemeral: true
        });
      }

      const liste = sirali
        .slice(0, 10)
        .map((k, i) => {
          const madalya = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${madalya} **${k.ad}** — Seviye: **${k.seviye}** | Kasa: **${ryoYaz(k.kasa)}** | Üyeler: **${k.uyeler.length}**`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(TEMA.KIRMIZI || 0xe53935)
        .setTitle('🏆 Sunucu Klan Liderlik Tablosu')
        .setDescription(liste)
        .setFooter({ text: 'Klan kasasına bağış yaparak klanını zirveye taşı!' });

      return interaction.reply({ embeds: [embed] });
    }
  }
