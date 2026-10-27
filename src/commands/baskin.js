import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { sahipMi } from '../services/aiErisimServisi.js';
import {
  BUTON_ONEK, DUSMANLAR, MIN_PAY, aktifBaskin, baskinAyarGetir, baskinAyarGuncelle, baskinIlanEt, baskinaKatil, baskinMesaji
} from '../services/baskinServisi.js';

export const butonOnek = BUTON_ONEK;

export const data = new SlashCommandBuilder()
  .setName('baskin')
  .setDescription('Gölge baskını: düşman kasabaya dayanır, 5 dakikada toplanan savunucular ganimeti böler.')
  .addSubcommand(s => s.setName('bilgi').setDescription('Süren baskını ve kuralları gösterir.'))
  .addSubcommand(s => s.setName('baslat').setDescription('Yönetim: bu kanalda hemen bir baskın başlatır.'))
  .addSubcommand(s => s
    .setName('otomatik')
    .setDescription('Yönetim: otomatik baskınları ve duyuru kanalını ayarlar.')
    .addBooleanOption(o => o.setName('acik').setDescription('Otomatik baskınlar açık mı?').setRequired(true))
    .addChannelOption(o => o.setName('kanal').setDescription('Baskın ve haftalık sonuç kanalı').addChannelTypes(ChannelType.GuildText)));

function yetkili(interaction) {
  return sahipMi(interaction.member, interaction.client) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

export async function execute(interaction) {
  if (!interaction.guild) return interaction.reply({ content: '❌ Baskınlar yalnızca sunucularda olur.', flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'bilgi') {
    const b = aktifBaskin(guildId);
    const ayar = baskinAyarGetir(guildId);
    const dusmanlar = DUSMANLAR.map(d => `${d.emoji} **${d.ad}**: ${d.gerekli}+ savunucu, ${d.ganimet} Ryo`).join('\n');
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '🛡️ GÖLGE BASKINLARI',
        renk: TEMA.RENKLER.KAN_KIRMIZISI,
        aciklama:
          (b ? `⚠️ Şu an **${b.dusman.ad}** saldırıyor! ${b.katilanlar.length}/${b.dusman.gerekli} savunucu, bitiş <t:${Math.floor(b.bitis / 1000)}:R>.\n\n` : '') +
          `Düşman geldiğinde 5 dakika içinde **Surları savun** butonuna bas. Yeterli savunucu toplanırsa ganimet eşit bölünür (kişi başı en az ${MIN_PAY} Ryo).\n\n${dusmanlar}`,
        alanlar: [
          { name: 'Otomatik baskın', value: ayar.otomatik ? 'Açık' : 'Kapalı', inline: true },
          { name: 'Kanal', value: ayar.kanalId ? `<#${ayar.kanalId}>` : 'Ayarlanmadı', inline: true }
        ],
        altMetin: 'Otomatik baskınlar sohbet hareketliyken en çok 2 saatte bir çıkar.'
      })]
    });
  }

  if (!yetkili(interaction)) {
    return interaction.reply({ content: '❌ Bunu yalnızca sunucuyu yönetenler yapabilir.', flags: MessageFlags.Ephemeral });
  }

  if (sub === 'baslat') {
    if (!interaction.channel?.isTextBased()) return interaction.reply({ content: '❌ Bu kanala baskın ilan edilemez.', flags: MessageFlags.Ephemeral });
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const b = await baskinIlanEt(interaction.channel);
    return interaction.editReply(b ? `⚔️ ${b.dusman.emoji} ${b.dusman.ad} kapıya dayandı.` : '❌ Sunucuda zaten süren bir baskın var.');
  }

  if (sub === 'otomatik') {
    const acik = interaction.options.getBoolean('acik');
    const kanal = interaction.options.getChannel('kanal');
    const mevcut = baskinAyarGetir(guildId);
    const kanalId = kanal?.id || mevcut.kanalId || interaction.channelId;
    baskinAyarGuncelle(guildId, { otomatik: acik, kanalId });
    return interaction.reply({
      content: `✅ Otomatik baskınlar **${acik ? 'açık' : 'kapalı'}**. Baskın ve haftalık sonuç kanalı: <#${kanalId}>`,
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function buton(interaction) {
  const [eylem, baskinId] = interaction.customId.slice(butonOnek.length).split(':');
  if (eylem !== 'katil' || !interaction.guild) return;
  const s = baskinaKatil(interaction.guild.id, interaction.user.id, baskinId);
  if (!s.basarili) {
    const mesaj = s.sebep === 'zaten' ? 'Zaten surlardasın, samuray.' : 'Bu baskın sona erdi.';
    return interaction.reply({ content: `❌ ${mesaj}`, flags: MessageFlags.Ephemeral });
  }
  return interaction.update(baskinMesaji(s.baskin));
}
