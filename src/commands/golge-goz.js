import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import {
  golgeGozDurumu, golgeGozTopluAnaliz, golgeGozAyarGetir, golgeGozAyarGuncelle,
  hakimDavasiBaslat, aktifDavalar
} from '../services/golgeGozServisi.js';
import { haftalikRaporOlustur } from '../services/toplulukServisi.js';

export const data = new SlashCommandBuilder()
  .setName('golge-goz')
  .setDescription('Sohbeti anlık izleyen, uyaran, kavgayı sezen ve öğrenen Gölge Göz.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName('durum')
      .setDescription('Gölge Göz ayarlarını ve sayaçlarını gösterir.')
  )
  .addSubcommand(sub =>
    sub.setName('rapor')
      .setDescription('Son öğrenilen bilgileri ve yakalanan ihlalleri listeler.')
  )
  .addSubcommand(sub =>
    sub.setName('tara')
      .setDescription('Sohbet havuzunda biriken mesajları yapay zekayla hemen tarar.')
  )
  .addSubcommand(sub =>
    sub.setName('ayar')
      .setDescription('Gölge Göz davranışını ayarlar.')
      .addBooleanOption(o => o.setName('acik').setDescription('Gölge Göz bu sunucuda açık mı'))
      .addBooleanOption(o => o.setName('uyari').setDescription('Küfür edene kanalda anında uyarı'))
      .addBooleanOption(o => o.setName('yetkilileri-uyar').setDescription('Yöneticiler ve sunucu sahibi de uyarılsın'))
      .addBooleanOption(o => o.setName('hakim-modu').setDescription('Kavga çıkınca Yargıç Kage devreye girsin'))
      .addBooleanOption(o => o.setName('sahibe-bildir').setDescription('Senden bahsedilince ya da işine yarar bilgi geçince seni etiketlesin'))
      .addRoleOption(o => o.setName('yetkili-rol').setDescription('Kavgada etiketlenecek mod rolü (yoksa sunucu sahibi)'))
      .addBooleanOption(o => o.setName('haftalik-rapor').setDescription('Pazar akşamı sahibe haftalık özet DM gitsin'))
      .addBooleanOption(o => o.setName('kayit-hatirlat').setDescription('24 saattir kayıt olmayana nazik DM gitsin'))
      .addBooleanOption(o => o.setName('tanistir').setDescription('Yeni kayıt olanı aynı türleri seven eski üyeyle tanıştır'))
  )
  .addSubcommand(sub =>
    sub.setName('haftalik')
      .setDescription('Son 7 günün sahip raporunu şimdi gösterir.')
  )
  .addSubcommand(sub =>
    sub.setName('hakim')
      .setDescription('İki üye arasında Yargıç Kage davası açar.')
      .addUserOption(o => o.setName('kisi1').setDescription('Birinci taraf').setRequired(true))
      .addUserOption(o => o.setName('kisi2').setDescription('İkinci taraf').setRequired(true))
      .addStringOption(o => o.setName('konu').setDescription('Anlaşmazlık neyle ilgili').setMaxLength(300))
  );

const evet = deger => (deger ? 'açık' : 'kapalı');

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const durum = golgeGozDurumu();
  const guildId = interaction.guild.id;

  if (sub === 'durum') {
    const ayar = golgeGozAyarGetir(guildId);
    const davalar = aktifDavalar().filter(d => interaction.guild.channels.cache.has(d.kanalId));
    const sonTarama = durum.sonTaramaZamani
      ? `<t:${Math.floor(new Date(durum.sonTaramaZamani).getTime() / 1000)}:R>`
      : 'henüz yok';
    const satirlar = [
      `👁️ Gölge Göz ${ayar.acik ? 'nöbette' : 'kapalı'}`,
      `uyarı ${evet(ayar.uyari)} • yetkilileri uyar ${evet(ayar.yetkilileriUyar)} • hakim modu ${evet(ayar.hakimModu)} • sahibe bildir ${evet(ayar.sahibeBildir)}`,
      `haftalık rapor ${evet(ayar.haftalikRapor)} • kayıt hatırlat ${evet(ayar.kayitHatirlat)} • tanıştır ${evet(ayar.tanistir)}`,
      `kavgada çağrılan: ${ayar.yetkiliRolId ? `<@&${ayar.yetkiliRolId}>` : 'sunucu sahibi'}`,
      `${durum.toplamIncelenenMesaj.toLocaleString('tr-TR')} mesaj okundu • ${durum.ogrenilenBilgiSayisi} bilgi öğrenildi • ${durum.onlenenIhlalSayisi} ihlal`,
      `son öğrenme taraması ${sonTarama}`
    ];
    if (davalar.length) satirlar.push(`açık dava: ${davalar.map(d => `<#${d.kanalId}>`).join(', ')}`);
    return interaction.reply({ content: `${satirlar.join('\n')}\n-# Gölge Göz`, allowedMentions: { parse: [] } });
  }

  if (sub === 'rapor') {
    const ogrenilenler = (durum.sonOgrenilenler || []).slice(0, 8)
      .map(o => `• ${o.kullanici}: ${o.bilgi}`);
    const ihlaller = (durum.sonIhlaller || []).slice(0, 6)
      .map(i => `• ${i.kullanici} #${i.kanal}: ${i.tip}`);
    const metin = [
      '🧠 Son öğrenilenler',
      ogrenilenler.length ? ogrenilenler.join('\n') : 'henüz yok',
      '',
      '🚨 Son ihlaller',
      ihlaller.length ? ihlaller.join('\n') : 'temiz'
    ].join('\n').slice(0, 1900);
    return interaction.reply({ content: `${metin}\n-# Gölge Göz`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'tara') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await golgeGozTopluAnaliz(interaction.client);
      return interaction.editReply({ content: 'havuz tarandı, öğrenilenler hafızaya işlendi.\n-# Gölge Göz' });
    } catch (err) {
      return interaction.editReply({ content: `tarama olmadı: ${err.message}` });
    }
  }

  if (sub === 'ayar') {
    const degisim = {};
    const acik = interaction.options.getBoolean('acik');
    const uyari = interaction.options.getBoolean('uyari');
    const yetkilileriUyar = interaction.options.getBoolean('yetkilileri-uyar');
    const hakimModu = interaction.options.getBoolean('hakim-modu');
    const sahibeBildir = interaction.options.getBoolean('sahibe-bildir');
    const rol = interaction.options.getRole('yetkili-rol');
    if (acik !== null) degisim.acik = acik;
    if (uyari !== null) degisim.uyari = uyari;
    if (yetkilileriUyar !== null) degisim.yetkilileriUyar = yetkilileriUyar;
    if (hakimModu !== null) degisim.hakimModu = hakimModu;
    if (sahibeBildir !== null) degisim.sahibeBildir = sahibeBildir;
    if (rol) degisim.yetkiliRolId = rol.id;
    for (const [secenek, anahtar] of [['haftalik-rapor', 'haftalikRapor'], ['kayit-hatirlat', 'kayitHatirlat'], ['tanistir', 'tanistir']]) {
      const deger = interaction.options.getBoolean(secenek);
      if (deger !== null) degisim[anahtar] = deger;
    }

    const ayar = Object.keys(degisim).length ? golgeGozAyarGuncelle(guildId, degisim) : golgeGozAyarGetir(guildId);
    return interaction.reply({
      content: `${Object.keys(degisim).length ? '✅ kaydedildi' : 'değişiklik yok'}\n` +
        `açık ${evet(ayar.acik)} • uyarı ${evet(ayar.uyari)} • yetkilileri uyar ${evet(ayar.yetkilileriUyar)} • hakim modu ${evet(ayar.hakimModu)} • sahibe bildir ${evet(ayar.sahibeBildir)}\n` +
        `haftalık rapor ${evet(ayar.haftalikRapor)} • kayıt hatırlat ${evet(ayar.kayitHatirlat)} • tanıştır ${evet(ayar.tanistir)}\n` +
        `kavgada çağrılan: ${ayar.yetkiliRolId ? `<@&${ayar.yetkiliRolId}>` : 'sunucu sahibi'}\n-# Gölge Göz`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  }

  if (sub === 'haftalik') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const rapor = await haftalikRaporOlustur(interaction.guild);
    return interaction.editReply({ content: rapor, allowedMentions: { parse: [] } });
  }

  if (sub === 'hakim') {
    const k1 = interaction.options.getUser('kisi1');
    const k2 = interaction.options.getUser('kisi2');
    if (k1.id === k2.id || k1.bot || k2.bot) {
      return interaction.reply({ content: 'iki farklı insan üye seç.', flags: MessageFlags.Ephemeral });
    }
    const ad = u => interaction.guild.members.cache.get(u.id)?.displayName || u.username;
    const acildi = await hakimDavasiBaslat(interaction.channel, [
      { id: k1.id, ad: ad(k1) },
      { id: k2.id, ad: ad(k2) }
    ], { ozet: interaction.options.getString('konu') || '', baslatan: interaction.user.id });
    return interaction.reply({
      content: acildi ? '⚖️ dava açıldı.' : 'bu kanalda zaten açık bir dava var.',
      flags: MessageFlags.Ephemeral
    });
  }
}
