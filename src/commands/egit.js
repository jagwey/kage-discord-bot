import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { egitimEkle, egitimListe, egitimSil, STICKER_DUYGULARI } from '../services/egitimServisi.js';

export const data = new SlashCommandBuilder()
  .setName('egit')
  .setDescription('Kage yapay zekasına sticker, bilgi ve davranış kuralı öğretirsiniz.')
  .addSubcommand(s => s
    .setName('ekle')
    .setDescription('Yeni bir kural öğret.')
    .addStringOption(o => o.setName('tip').setDescription('Ne öğretiyorsun?').setRequired(true)
      .addChoices(
        { name: 'Sticker: şu durumda şu ruh hali/sticker', value: 'sticker' },
        { name: 'Bilgi: şunu bil', value: 'bilgi' },
        { name: 'Davranış: şöyle davran', value: 'davranis' }
      ))
    .addStringOption(o => o.setName('anahtar').setDescription('Durum/anahtar kelimeler, virgülle ayır (sticker ve bilgi için).'))
    .addStringOption(o => o.setName('icerik').setDescription('Bilgi veya davranış metni.'))
    .addStringOption(o => o.setName('sticker').setDescription('Sticker ruh hali (sticker tipi için).')
      .addChoices(...STICKER_DUYGULARI.map(d => ({ name: d, value: d }))))
    .addStringOption(o => o.setName('kapsam').setDescription('Kime geçerli? (varsayılan: sadece sen)')
      .addChoices(
        { name: 'Sadece ben', value: 'kisisel' },
        { name: 'Tüm sunucu (yönetici)', value: 'sunucu' }
      )))
  .addSubcommand(s => s.setName('liste').setDescription('Öğrettiğin ve sunucuda geçerli kuralları göster.'))
  .addSubcommand(s => s
    .setName('sil')
    .setDescription('Bir kuralı sil.')
    .addIntegerOption(o => o.setName('no').setDescription('Kural numarası').setRequired(true).setMinValue(1)));

const TIP_ETIKET = { sticker: '🎭 Sticker', bilgi: '📖 Bilgi', davranis: '🧭 Davranış' };

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const yonetici = interaction.memberPermissions?.has('ManageGuild') ?? false;

  if (sub === 'ekle') {
    const tip = interaction.options.getString('tip');
    const kapsam = interaction.options.getString('kapsam') || 'kisisel';
    const deger = tip === 'sticker' ? interaction.options.getString('sticker') : interaction.options.getString('icerik');
    const sonuc = egitimEkle({
      guildId, userId, kapsam, tip, yonetici,
      anahtar: interaction.options.getString('anahtar'),
      deger
    });
    if (!sonuc.basarili) {
      return interaction.reply({ content: `❌ ${sonuc.mesaj}`, flags: MessageFlags.Ephemeral });
    }
    const k = sonuc.kural;
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '🥋 ÖĞRETİ KAYDEDİLDİ',
        renk: TEMA.RENKLER.BASARI,
        aciklama: `**#${k.id}** • ${TIP_ETIKET[k.tip]} • ${k.kapsam === 'sunucu' ? 'Sunucu geneli' : 'Kişisel'}\n` +
          (k.anahtarlar.length ? `Anahtar: \`${k.anahtarlar.join(', ')}\`\n` : '') +
          `İçerik: ${k.deger}`
      })],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === 'liste') {
    const kurallar = egitimListe(guildId, userId);
    if (!kurallar.length) {
      return interaction.reply({ content: 'Henüz öğretilmiş kural yok. `/egit ekle` ile başla.', flags: MessageFlags.Ephemeral });
    }
    const satirlar = kurallar.slice(-25).map(k =>
      `**#${k.id}** ${TIP_ETIKET[k.tip]} ${k.kapsam === 'sunucu' ? '🌐' : '👤'} ` +
      `${k.anahtarlar.length ? `\`${k.anahtarlar.join(', ')}\` → ` : ''}${k.deger}`.slice(0, 160)
    );
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '📜 ÖĞRETİLMİŞ KURALLAR',
        renk: TEMA.RENKLER.BILGI,
        aciklama: satirlar.join('\n').slice(0, 3800),
        altMetin: '👤 kişisel • 🌐 sunucu geneli'
      })],
      flags: MessageFlags.Ephemeral
    });
  }

  const sonuc = egitimSil({ id: interaction.options.getInteger('no'), guildId, userId, yonetici });
  return interaction.reply({
    content: sonuc.basarili ? `🗑️ Kural #${sonuc.kural.id} silindi.` : `❌ ${sonuc.mesaj}`,
    flags: MessageFlags.Ephemeral
  });
}
