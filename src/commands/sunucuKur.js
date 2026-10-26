import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { kageMimarisiInsaEt, sunucuDurumunuCikar } from '../services/sunucuMimarisiServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sunucu-kur')
  .setDescription('Roller, kayıt kapısı, manga ve oyun odalarıyla sunucuyu kurar. Tekrar çalıştırmak güvenli.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addStringOption(o => o
    .setName('mod')
    .setDescription('Kur: eksikleri tamamla. Önizle: değişiklik yapmadan durumu göster.')
    .addChoices({ name: 'Kur (eksikleri tamamla)', value: 'kur' }, { name: 'Önizle (değişiklik yapma)', value: 'onizle' }))
  .addStringOption(o => o
    .setName('ai-tema')
    .setDescription('Yapay zeka kurallar ve karşılamayı bu temaya göre yazsın (örn: siberpunk samuray)')
    .setMaxLength(120))
  .addBooleanOption(o => o
    .setName('kopya-sil')
    .setDescription('Aynı işi yapan kopya kanalları sil (varsayılan: sadece raporla)'));

const liste = (dizi, en = 6) => dizi.length
  ? dizi.slice(0, en).join(', ') + (dizi.length > en ? ` ve ${dizi.length - en} tane daha` : '')
  : '—';

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = interaction.guild;
  const mod = interaction.options.getString('mod') || 'kur';
  const tema = interaction.options.getString('ai-tema') || '';
  const kopyaSil = interaction.options.getBoolean('kopya-sil') || false;

  const durum = await sunucuDurumunuCikar(guild);
  const onizleme = kageEmbed({
    baslik: mod === 'onizle' ? 'KURULUM ÖNİZLEMESİ' : 'KAGE KALESİ KURULUMU',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: `**${guild.name}** sunucusunun mevcut durumu kontrol edildi. Hiçbir kanal veya rol silinmez` +
      (kopyaSil ? ', yalnız kopya kanallar silinir' : '') + '. Var olanlar yeniden kullanılır, eksikler eklenir.',
    alanlar: [
      { name: `Roller (${durum.rolYeni.length} yeni, ${durum.rolVar.length} var)`, value: liste(durum.rolYeni), inline: false },
      { name: `Kanallar (${durum.kanalYeni.length} yeni, ${durum.kanalVar.length} var)`, value: liste(durum.kanalYeni, 8), inline: false },
      { name: `Kopyalar (${durum.kopyalar.length})`, value: liste(durum.kopyalar.map(k => k.ad)), inline: false },
      { name: 'Yapay zeka', value: tema ? `Tema: *${tema}*` : 'Kapalı: standart kurallar ve karşılama kullanılır.', inline: false }
    ],
    altMetin: mod === 'onizle' ? 'Önizleme: hiçbir şey değişmedi.' : 'Onaylamak için 60 saniyen var.'
  });

  if (mod === 'onizle') return interaction.editReply({ embeds: [onizleme] });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('kurulum_onayla').setLabel('Kur').setStyle(ButtonStyle.Success).setEmoji(TEMA.EMOJILER.TORII),
    new ButtonBuilder().setCustomId('kurulum_iptal').setLabel('İptal').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );
  const yanit = await interaction.editReply({ embeds: [onizleme], components: [row] });

  const collector = yanit.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
    filter: i => i.user.id === interaction.user.id
  });

  let islendi = false;
  collector.on('collect', async i => {
    islendi = true;
    collector.stop();
    if (i.customId === 'kurulum_iptal') {
      return i.update({ content: `${TEMA.EMOJILER.KATANA} Kurulum iptal edildi.`, embeds: [], components: [] });
    }

    await i.update({
      content: tema
        ? '⛩️ **Kale inşa ediliyor.** Yapay zeka metinleri yazıyor, bu birkaç dakika sürebilir...'
        : '⛩️ **Kale inşa ediliyor.** Roller, kanallar ve kayıt kapısı ayarlanıyor, bekle...',
      embeds: [],
      components: []
    });

    try {
      const s = await kageMimarisiInsaEt(guild, interaction, { tema, kopyaSil });
      const r = s.rapor;
      const alanlar = [
        { name: 'Roller', value: `${r.rolYeni.length} yeni • ${r.rolVar.length} mevcut`, inline: true },
        { name: 'Kanallar', value: `${r.kanalYeni.length} yeni • ${r.kanalVar.length} mevcut • ${r.tasinan.length} taşındı`, inline: true },
        { name: 'Mesajlar', value: `${r.mesaj.length} tanıtım gönderildi`, inline: true },
        { name: 'Kayıt kapısı', value: `${s.kayitKapisi}`, inline: true },
        { name: 'Manga bildirimleri', value: `${s.mangaDuyuru}`, inline: true },
        { name: 'Yapay zeka', value: `${s.aiKanal}${r.ai ? ' • metinleri yapay zeka yazdı' : ''}`, inline: true }
      ];
      const kopyalar = [...r.kopyalar, ...r.silinenKopya.map(k => `${k} (silindi)`)];
      if (kopyalar.length) alanlar.push({ name: 'Kopyalar', value: liste(kopyalar, 8), inline: false });
      if (r.uyarilar.length) alanlar.push({ name: 'Uyarılar', value: liste(r.uyarilar, 3).slice(0, 1000), inline: false });

      await interaction.editReply({
        content: null,
        embeds: [kageEmbed({
          baslik: 'KAGE KALESİ HAZIR',
          renk: r.uyarilar.length ? TEMA.RENKLER.ALTIN : TEMA.RENKLER.BASARI,
          aciklama: 'Kurulum bitti. Tekrar çalıştırırsan yalnız eksikler tamamlanır, aynı mesajlar tekrar gönderilmez.\n' +
            'Yetki dağılımı için ŞOGUN KALESİ içindeki **şogun-meclisi** kanalına bak.',
          alanlar
        })],
        components: []
      });
    } catch (err) {
      console.error('[SunucuKur Hatası]:', err);
      await interaction.editReply({ content: `❌ Kurulum sırasında hata: ${err.message}`, embeds: [], components: [] });
    }
  });

  collector.on('end', async () => {
    if (islendi) return;
    await interaction.editReply({ content: 'Süre doldu, kurulum iptal edildi.', embeds: [], components: [] }).catch(() => {});
  });
}
