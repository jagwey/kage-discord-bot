import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { kageEmbed, TEMA } from '../config/tema.js';
import {
  otomodAyarGetir,
  otomodAyarGuncelle,
  otomodDurumu,
  ihlalGetir,
  ihlalSifirla
} from '../services/otomodServisi.js';

export const data = new SlashCommandBuilder()
  .setName('otomod')
  .setDescription('Otomatik küfür/yasaklı kelime moderasyonu')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false)
  .addSubcommand(s => s
    .setName('durum')
    .setDescription('Otomod ayarlarını ve ihlalli üyeleri göster'))
  .addSubcommand(s => s
    .setName('ac')
    .setDescription('Otomodu aç'))
  .addSubcommand(s => s
    .setName('kapat')
    .setDescription('Otomodu kapat'))
  .addSubcommand(s => s
    .setName('kelime-ekle')
    .setDescription('Sunucuya özel yasaklı kelime ekle')
    .addStringOption(o => o.setName('kelime').setDescription('Yasaklanacak kelime').setRequired(true).setMaxLength(32)))
  .addSubcommand(s => s
    .setName('kelime-cikar')
    .setDescription('Sunucuya özel yasaklı kelimeyi çıkar')
    .addStringOption(o => o.setName('kelime').setDescription('Çıkarılacak kelime').setRequired(true).setMaxLength(32)))
  .addSubcommand(s => s
    .setName('esik')
    .setDescription('Kaçıncı ihlalde timeout verileceğini ayarla')
    .addIntegerOption(o => o.setName('sayi').setDescription('İhlal eşiği (2-10)').setRequired(true).setMinValue(2).setMaxValue(10)))
  .addSubcommand(s => s
    .setName('ihlal')
    .setDescription('Bir üyenin ihlal puanını göster')
    .addUserOption(o => o.setName('uye').setDescription('Üye').setRequired(true)))
  .addSubcommand(s => s
    .setName('sifirla')
    .setDescription('Bir üyenin ihlal puanını sıfırla')
    .addUserOption(o => o.setName('uye').setDescription('Üye').setRequired(true)));

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({ content: 'Bu komut için Üyeleri Zaman Aşımına Uğrat yetkisi gerekir.', flags: MessageFlags.Ephemeral });
  }

  const gid = interaction.guildId;
  const alt = interaction.options.getSubcommand();

  const cevapla = (aciklama, renk = TEMA.RENKLER.BASARI) =>
    interaction.reply({
      embeds: [kageEmbed({ baslik: 'Otomod', aciklama, renk })],
      flags: MessageFlags.Ephemeral
    });

  if (alt === 'ac' || alt === 'kapat') {
    otomodAyarGuncelle(gid, { acik: alt === 'ac' });
    return cevapla(alt === 'ac' ? 'Otomod **açıldı**. Yetkililer muaf.' : 'Otomod **kapatıldı**.');
  }

  if (alt === 'kelime-ekle' || alt === 'kelime-cikar') {
    const kelime = interaction.options.getString('kelime').trim().toLocaleLowerCase('tr');
    const liste = otomodAyarGetir(gid).ozelKelimeler;
    if (alt === 'kelime-ekle') {
      if (kelime.length < 3) return cevapla('Kelime en az 3 harf olmalı.', TEMA.RENKLER.HATA);
      if (liste.includes(kelime)) return cevapla('Bu kelime zaten listede.', TEMA.RENKLER.HATA);
      if (liste.length >= 100) return cevapla('Özel liste dolu (en fazla 100 kelime).', TEMA.RENKLER.HATA);
      otomodAyarGuncelle(gid, { ozelKelimeler: [...liste, kelime] });
      return cevapla(`\`${kelime}\` yasaklı listeye eklendi.`);
    }
    if (!liste.includes(kelime)) return cevapla('Bu kelime listede yok.', TEMA.RENKLER.HATA);
    otomodAyarGuncelle(gid, { ozelKelimeler: liste.filter(k => k !== kelime) });
    return cevapla(`\`${kelime}\` listeden çıkarıldı.`);
  }

  if (alt === 'esik') {
    const sayi = interaction.options.getInteger('sayi');
    otomodAyarGuncelle(gid, { timeoutEsik: sayi });
    return cevapla(`Timeout eşiği **${sayi}** ihlal olarak ayarlandı.`);
  }

  if (alt === 'ihlal') {
    const uye = interaction.options.getUser('uye');
    return cevapla(`${uye} güncel ihlal puanı: **${ihlalGetir(gid, uye.id)}**`);
  }

  if (alt === 'sifirla') {
    const uye = interaction.options.getUser('uye');
    ihlalSifirla(gid, uye.id);
    return cevapla(`${uye} ihlal puanı sıfırlandı.`);
  }

  // durum
  const d = otomodDurumu(gid);
  const ihlalliler = d.ihlalliler.slice(0, 10).map(x => `<@${x.userId}>: ${x.puan}`).join('\n') || 'Yok';
  return cevapla(
    `Durum: **${d.acik ? 'açık' : 'kapalı'}**\n` +
    `Timeout eşiği: **${d.timeoutEsik}**\n` +
    `Özel kelimeler: ${d.ozelKelimeler.length ? d.ozelKelimeler.map(k => `\`${k}\``).join(', ') : 'Yok'}\n\n` +
    `**İhlalliler**\n${ihlalliler}`,
    TEMA.RENKLER.BILGI
  );
}
