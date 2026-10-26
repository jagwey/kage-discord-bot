import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { hafizaYukle, hafizaArama, bilgiOgren, gunlukDerinOgrenme, profilGetir, kullaniciHafizasiGetir, kullaniciUnut } from '../services/kageHafizaServisi.js';

export const data = new SlashCommandBuilder()
  .setName('hafiza')
  .setDescription('Kage AI derin hafıza bankasını görüntüleyin, bilgi arayın veya senkronize edin.')
  .addSubcommand(sub =>
    sub
      .setName('durum')
      .setDescription('Yapay zekanın kalıcı hafıza ve öğrenme durumunu inceler.')
  )
  .addSubcommand(sub =>
    sub
      .setName('ara')
      .setDescription('Yapay zekanın hafıza bankasında konu veya kişi arayın.')
      .addStringOption(opt =>
        opt
          .setName('sorgu')
          .setDescription('Aranacak kelime veya konu başlığı')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('ogren')
      .setDescription('Yapay zekanın kalıcı hafıza bankasına yeni bilgi veya kural kaydedin.')
      .addStringOption(opt =>
        opt
          .setName('kategori')
          .setDescription('Bilgi kategorisi')
          .setRequired(true)
          .addChoices(
            { name: '🌐 Web Sitesi / Manga', value: 'site' },
            { name: '🏰 Sunucu Düzeni', value: 'sunucu' },
            { name: '📜 Kural / Kanun', value: 'kural' },
            { name: '🥋 Felsefe / Bushido', value: 'felsefe' },
            { name: '💡 Genel Bilgi', value: 'genel' }
          )
      )
      .addStringOption(opt =>
        opt
          .setName('baslik')
          .setDescription('Bilgi başlığı (Örn: Manga Güncelleme Saati)')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('bilgi')
          .setDescription('Kage AI tarafından hatırlanacak detaylı içerik')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('profil')
      .setDescription('Kage\'nin senin hakkında hafızasında tuttuğu profili gösterir.')
  )
  .addSubcommand(sub =>
    sub
      .setName('unut')
      .setDescription('Kage senin profilini ve kişisel notlarını kalıcı olarak unutur.')
  )
  .addSubcommand(sub =>
    sub
      .setName('yenile')
      .setDescription('(Şogun/Yetkili) Siteden ve sunucudan anında derin öğrenme senkronizasyonu yapar.')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const hafiza = hafizaYukle();

  // 1. DURUM
  if (sub === 'durum') {
    const site = hafiza.siteVerileri || {};
    const sunucu = hafiza.sunucuVerileri || {};
    const gunluk = (hafiza.gunlukDusunceGunlugu || []).slice(-1)[0] || { ozet: 'Henüz günlük kaydı yok.' };
    const ogrenilenSayisi = (hafiza.ogrenilenBilgiler || []).length;
    const kullaniciNotuSayisi = Object.keys(hafiza.kullaniciNotlari || {}).length;

    const embed = kageEmbed({
      baslik: '🧠 KAGE AI • DERİN HAFIZA VE ÖĞRENME BANKASI',
      renk: TEMA.RENKLER.BILGI,
      aciklama: `Kage-95 yapay zekası her gün sitemiz **kage95.com** ve Discord sunucumuzla kendini eğitir, öğrendiklerini \`data/kage_hafiza.json\` dosyasına kaydeder.\n\n` +
        `📊 **Hafıza Telemetrisi:**\n` +
        `• Hafıza Versiyonu: \`v${hafiza.versiyon || '2.0.0'}\`\n` +
        `• Toplam Öğrenme Döngüsü: \`#${hafiza.ogrenmeSayisi || 0}\`\n` +
        `• Kayıtlı Bilgi Sayısı: \`${ogrenilenSayisi} Madde\`\n` +
        `• Tanınan Kullanıcı Profili: \`${kullaniciNotuSayisi} Kişi\`\n` +
        `• Son Senkronizasyon: <t:${Math.floor(new Date(hafiza.sonGuncelleme).getTime() / 1000)}:R>\n\n` +
        `🌐 **Canlı kage95.com Belleği:**\n` +
        `• İndekslenen Manga: \`${site.toplamManga || 0} Seri\`\n` +
        `• Trend Seriler: *${(site.trendMangalar || []).slice(0, 3).map(m => m.mangaAdi).join(', ') || 'Yok'}*\n\n` +
        `🏰 **Discord Sunucu Belleği:**\n` +
        `• Kayıtlı Samuray: \`${sunucu.toplamUye || 0} Üye\`\n` +
        `• Kanal / Rol Mimarisi: \`${sunucu.kanalSayisi || 0} Kanal\` / \`${sunucu.rolSayisi || 0} Rol\`\n\n` +
        `📜 **Gölge Günlüğü (Son Düşünce):**\n` +
        `*"${gunluk.ozet}"*`,
      altMetin: `Kage AI Kalıcı Bellek • kage95.com`
    });

    return interaction.reply({ embeds: [embed] });
  }

  // 2. ARA
  if (sub === 'ara') {
    const sorgu = interaction.options.getString('sorgu');
    const sonuclar = hafizaArama(sorgu, 5);

    if (sonuclar.length === 0) {
      return interaction.reply({
        content: `🔍 Hafıza bankamda **"${sorgu}"** ile eşleşen bir kayıt bulunamadı.`,
        ephemeral: true
      });
    }

    const liste = sonuclar.map((s, i) => 
      `**${i + 1}. [${s.tur.toUpperCase()}] ${s.baslik}**\n${s.detay}`
    ).join('\n\n');

    const embed = kageEmbed({
      baslik: `🔍 HAFIZA ARAMA SONUÇLARI • "${sorgu.toUpperCase()}"`,
      renk: TEMA.RENKLER.BASARI,
      aciklama: `Kage derin hafıza bankasında arandı ve en alakalı kayıtlar bulundu:\n\n${liste}`,
      altMetin: `Toplam ${sonuclar.length} kayıt eşleşti`
    });

    return interaction.reply({ embeds: [embed] });
  }

  // 3. ÖĞREN
  if (sub === 'ogren') {
    const kategori = interaction.options.getString('kategori');
    const baslik = interaction.options.getString('baslik');
    const bilgi = interaction.options.getString('bilgi');

    const kayit = bilgiOgren(kategori, baslik, bilgi, interaction.user.tag);

    const embed = kageEmbed({
      baslik: '🧠 YENİ BİLGİ HAFIZAYA KAZINDI',
      renk: TEMA.RENKLER.BASARI,
      aciklama: `Bu bilgiyi kalıcı hafıza bankama (\`kage_hafiza.json\`) kaydettim **${interaction.user.displayName}**!\n\n` +
        `🏷️ **Kategori:** \`${kategori.toUpperCase()}\`\n` +
        `📌 **Başlık:** **${baslik}**\n` +
        `📜 **İçerik:**\n*"${bilgi}"*\n\n` +
        `*Artık bana bu konu hakkında soru sorulduğunda veya zorlandığımda bu bilgiyi hatırlayacağım!*`,
      altMetin: `Kayıt ID: ${kayit.id} • Ekleyen: ${interaction.user.tag}`
    });

    return interaction.reply({ embeds: [embed] });
  }

  // PROFİL
  if (sub === 'profil') {
    const p = profilGetir(interaction.user.id);
    const notlar = kullaniciHafizasiGetir(interaction.user.id);
    const liste = a => (a?.length ? a.join(', ') : '—');
    const embed = kageEmbed({
      baslik: `🧠 KAGE'NİN SENİN HAKKINDAKİ HAFIZASI • ${interaction.user.displayName}`,
      renk: TEMA.RENKLER.BILGI,
      aciklama: p || notlar
        ? `• **İlgi alanları:** ${liste(p?.ilgiAlanlari)}\n` +
          `• **Favori seriler:** ${liste(p?.favoriMangalar)}\n` +
          `• **Ton:** ${p?.ton || '—'} | **Dil:** ${p?.dil || '—'}\n` +
          `• **Özet:** ${p?.kisaOzet || '—'}\n\n` +
          `Silmek için \`/hafiza unut\`.`
        : 'Hakkında henüz bir şey öğrenmedim.',
      altMetin: 'Sadece sana görünür'
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // UNUT
  if (sub === 'unut') {
    const r = kullaniciUnut(interaction.user.id);
    return interaction.reply({
      content: r.profil || r.not
        ? `🌫️ Unuttum. Profil silindi${r.not ? `, ${r.not} kişisel not silindi` : ''}.`
        : 'Zaten hakkında kayıt yok.',
      ephemeral: true
    });
  }

  // 4. YENİLE (Şogun / Admin)
  if (sub === 'yenile') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '⛔ Derin öğrenme senkronizasyonunu manuel tetiklemek için Şogun (Yönetici) yetkisi gerekir.',
        ephemeral: true
      });
    }

    await interaction.deferReply();
    try {
      const yeniHafiza = await gunlukDerinOgrenme(interaction.client);
      const embed = kageEmbed({
        baslik: '⚡ DERİN ÖĞRENME & SENKRONİZASYON TAMAMLANDI',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `Kage-95 yapay zekası tüm kaynakları baştan sona taradı ve hafızasını tazeledi!\n\n` +
          `• 🔄 **Öğrenme Döngüsü:** \`#${yeniHafiza.ogrenmeSayisi}\`\n` +
          `• 🌐 **kage95.com:** \`${yeniHafiza.siteVerileri.toplamManga} Manga\` ve son bölümler indekslendi.\n` +
          `• 🏰 **Discord Sunucusu:** \`${yeniHafiza.sunucuVerileri.toplamUye} Samuray\` ve klan hazinesi güncellendi.\n` +
          `• 💾 **Kalıcı Dosya:** \`data/kage_hafiza.json\` diske güvenle mühürlendi.`,
        altMetin: `Kage AI Otonom Öğrenme Motoru`
      });
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({
        content: `❌ Öğrenme senkronizasyonu sırasında hata oluştu: ${err.message}`
      });
    }
  }
}
