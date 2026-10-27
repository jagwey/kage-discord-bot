import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle, ryoDus, bakiyeGetir } from '../services/ekonomiServisi.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { sahipMi } from '../services/aiErisimServisi.js';

const MAKS = 1_000_000;

const uyeSecenegi = o => o.setName('uye').setDescription('Hedef üye').setRequired(true);
const miktarSecenegi = o => o.setName('miktar').setDescription(`Ryo miktarı (1 - ${MAKS})`)
  .setRequired(true).setMinValue(1).setMaxValue(MAKS);
const nedenSecenegi = o => o.setName('neden').setDescription('Kayda düşülecek neden').setMaxLength(100);

export const data = new SlashCommandBuilder()
  .setName('ryo')
  .setDescription('Yönetim: üyelere Ryo yükler, geri alır veya cüzdanına bakar.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s.setName('ver').setDescription('Üyeye Ryo yükler.')
    .addUserOption(uyeSecenegi).addIntegerOption(miktarSecenegi).addStringOption(nedenSecenegi))
  .addSubcommand(s => s.setName('al').setDescription('Üyeden Ryo geri alır (bakiye yetmezse eldekinin hepsi).')
    .addUserOption(uyeSecenegi).addIntegerOption(miktarSecenegi).addStringOption(nedenSecenegi))
  .addSubcommand(s => s.setName('bak').setDescription('Üyenin cüzdanını ve bankasını gösterir.')
    .addUserOption(uyeSecenegi));

export async function execute(interaction) {
  const member = interaction.member;
  const yetkili = sahipMi(member, interaction.client) || member?.permissions?.has(PermissionFlagsBits.Administrator);
  if (!yetkili) {
    return interaction.reply({ content: '❌ Ryo hazinesini yalnızca sunucu sahibi ve yöneticiler yönetir.', flags: MessageFlags.Ephemeral });
  }

  const alt = interaction.options.getSubcommand();
  const uye = interaction.options.getUser('uye');
  if (uye.bot) return interaction.reply({ content: '❌ Botların cüzdanı yok.', flags: MessageFlags.Ephemeral });

  if (alt === 'bak') {
    const b = bakiyeGetir(uye.id);
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '💰 CÜZDAN',
        renk: TEMA.RENKLER.ALTIN,
        aciklama: `<@${uye.id}>\nCüzdan: **${ryoYaz(b.ryo)}**\nBanka: **${ryoYaz(b.banka)}**`
      })],
      flags: MessageFlags.Ephemeral
    });
  }

  const miktar = interaction.options.getInteger('miktar');
  const ek = interaction.options.getString('neden');
  const kayit = n => `${n} <- ${interaction.user.id}${ek ? `: ${ek}` : ''}`;

  if (alt === 'ver') {
    const yeni = ryoEkle(uye.id, miktar, kayit('Yönetici yüklemesi'));
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '💰 HAZİNEDEN RYO',
        renk: TEMA.RENKLER.ALTIN,
        aciklama: `<@${uye.id}> cüzdanına **+${ryoYaz(miktar)}** yüklendi.${ek ? `\nNeden: ${ek}` : ''}\nYeni bakiye: **${ryoYaz(yeni)}**`
      })],
      allowedMentions: { users: [uye.id] }
    });
  }

  // al: bakiye yetmezse eldeki kadarı alınır, negatif bakiye oluşmaz
  const alinan = Math.min(miktar, bakiyeGetir(uye.id).ryo);
  ryoDus(uye.id, alinan, kayit('Yönetici kesintisi'));
  return interaction.reply({
    embeds: [kageEmbed({
      baslik: '💸 HAZİNEYE İADE',
      aciklama: `<@${uye.id}> cüzdanından **-${ryoYaz(alinan)}** alındı.${alinan < miktar ? ' (Cüzdanda bu kadarı vardı.)' : ''}${ek ? `\nNeden: ${ek}` : ''}\nYeni bakiye: **${ryoYaz(bakiyeGetir(uye.id).ryo)}**`
    })],
    flags: MessageFlags.Ephemeral
  });
}
