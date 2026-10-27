import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { saygiIhlaliVarMi } from '../services/egitimServisi.js';
import { hafizaYukle, hafizaArama, bilgiOgren, gunlukDerinOgrenme, profilGetir, kullaniciHafizasiGetir, kullaniciUnut } from '../services/kageHafizaServisi.js';
import { akilliAiUret, motorEtiketi } from '../services/aiRouterServisi.js';

// Hafızanın tamamını kısa satırlar halinde modele verip sorguya anlamca en yakın kayıtları seçtirir.
async function hafizadanYapayZekaSec(sorgu, kullanici) {
  const h = hafizaYukle();
  const satirlar = [
    ...h.ogrenilenBilgiler.map(b => `[${b.kategori}] ${b.baslik}: ${b.icerik}`),
    ...Object.values(h.kullaniciNotlari).map(u => `[kişi] ${u.kullaniciAdi}: ${(u.notlar || []).join(' • ')}`)
  ];
  if (satirlar.length === 0) return null;

  const { metin, saglayici } = await akilliAiUret({
    system: 'Sen Kage\'nin hafıza arama yardımcısısın. Sadece verilen kayıtlara dayan, uydurma. ' +
      'Sorguyla anlamca ilgili olan kayıtları seç (yazım hatası, takma ad, eş anlam olabilir) ve 1-4 kısa düz satırla aktar. ' +
      'Başlık, liste işareti, kalın yazı kullanma. Hiçbiri ilgili değilse sadece YOK yaz.',
    prompt: `Sorgu: ${sorgu}\n\nKayıtlar:\n${satirlar.join('\n').slice(0, 12000)}`,
    gorevTipi: 'hizli_sohbet',
    userId: kullanici.id,
    userName: kullanici.username
  });
  const temiz = String(metin || '').trim();
  if (!temiz || /^YOK\b/i.test(temiz)) return null;
  return { metin: temiz, motor: motorEtiketi(saglayici) };
}

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

    if (sonuclar.length > 0) {
      const liste = sonuclar.map(s => `**${s.baslik}**: ${s.detay}`.slice(0, 380)).join('\n');
      return interaction.reply({
        content: `${liste}\n-# hafıza • ${sonuclar.length} kayıt`.slice(0, 2000),
        allowedMentions: { parse: [] }
      });
    }

    // Kelime eşleşmedi: yapay zeka tüm hafızaya bakıp anlamca en yakın kaydı seçer
    await interaction.deferReply();
    const cevap = await hafizadanYapayZekaSec(sorgu, interaction.user).catch(() => null);
    return interaction.editReply({
      content: cevap
        ? `${cevap.metin.slice(0, 1900)}\n-# ${cevap.motor}`
        : `"${sorgu}" ile ilgili hafızamda bir şey yok`,
      allowedMentions: { parse: [] }
    });
  }

  // 3. ÖĞREN
  if (sub === 'ogren') {
    const kategori = interaction.options.getString('kategori');
    const baslik = interaction.options.getString('baslik');
    const bilgi = interaction.options.getString('bilgi');

    if (saygiIhlaliVarMi(`${baslik} ${bilgi}`)) {
      return interaction.reply({ content: '❌ Aile, din, dil veya ırka hakaret içeren bilgi öğretilemez.', flags: MessageFlags.Ephemeral });
    }

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
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // UNUT
  if (sub === 'unut') {
    const r = kullaniciUnut(interaction.user.id);
    return interaction.reply({
      content: r.profil || r.not
        ? `🌫️ Unuttum. Profil silindi${r.not ? `, ${r.not} kişisel not silindi` : ''}.`
        : 'Zaten hakkında kayıt yok.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 4. YENİLE (Şogun / Admin)
  if (sub === 'yenile') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '⛔ Derin öğrenme senkronizasyonunu manuel tetiklemek için Şogun (Yönetici) yetkisi gerekir.',
        flags: MessageFlags.Ephemeral
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
