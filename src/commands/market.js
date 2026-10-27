import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { MARKET_URUNLERI, marketSatinAl, bakiyeGetir } from '../services/ekonomiServisi.js';
import { ryoYaz } from '../config/oyunGorsel.js';

export const butonOnek = 'kage_market:';

const TIP_BASLIK = { unvan: '🎖️ Unvanlar', muska: '🧿 Muskalar', kart: '🎫 Kartlar' };
const STILLER = { unvan: ButtonStyle.Secondary, muska: ButtonStyle.Primary, kart: ButtonStyle.Success };

export const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Kage samuray pazarını açar; unvanlar ve eşyalar satın alırsınız.');

function tezgah(userId, not = '') {
  const b = bakiyeGetir(userId);
  const alanlar = Object.entries(TIP_BASLIK).map(([tip, baslik]) => ({
    name: baslik,
    value: MARKET_URUNLERI.filter(u => u.tip === tip).map(u => {
      const sende = b.envanter.includes(u.ad);
      const aktif = u.tip === 'unvan' && b.unvan === u.deger;
      const durum = aktif ? '🟢 kuşanılı' : sende ? '✅ sende' : b.ryo >= u.fiyat ? `\`${ryoYaz(u.fiyat)}\`` : `🔒 \`${ryoYaz(u.fiyat)}\``;
      return `**${u.ad}** • ${durum}\n-# ${u.desc}`;
    }).join('\n'),
    inline: false
  }));

  const embed = kageEmbed({
    baslik: '🏮 KAGE SAMURAY PAZARI',
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: (not ? `${not}\n\n` : '') + `💰 **Cüzdan:** \`${ryoYaz(b.ryo)}\`  •  🎖️ **Unvan:** ${b.unvan}`,
    alanlar,
    altMetin: 'Sahip olduğun unvana tıklarsan ücretsiz kuşanırsın • kage95.com'
  });

  const butonlar = MARKET_URUNLERI.map(u => {
    const sende = b.envanter.includes(u.ad);
    const kilitli = !sende && b.ryo < u.fiyat;
    const tekrarAlinamaz = sende && u.tip !== 'unvan';
    return new ButtonBuilder()
      .setCustomId(`${butonOnek}al:${userId}:${u.id}`)
      .setLabel((sende ? (u.tip === 'unvan' ? `Kuşan: ${u.deger}` : u.deger) : `${u.deger} • ${u.fiyat}`).slice(0, 80))
      .setStyle(sende ? ButtonStyle.Secondary : STILLER[u.tip] || ButtonStyle.Secondary)
      .setDisabled(kilitli || tekrarAlinamaz || (u.tip === 'unvan' && b.unvan === u.deger));
  });
  const satirlar = [];
  for (let i = 0; i < butonlar.length; i += 5) satirlar.push(new ActionRowBuilder().addComponents(butonlar.slice(i, i + 5)));
  return { embeds: [embed], components: satirlar };
}

export async function execute(interaction) {
  return interaction.reply(tezgah(interaction.user.id));
}

export async function buton(interaction) {
  const [, sahip, urunId] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu pazar tezgahı sadece komutu yazana aittir. Kendin için `/market` yaz.', flags: MessageFlags.Ephemeral });
  }
  const sonuc = marketSatinAl(sahip, urunId);
  const not = !sonuc.basarili
    ? `❌ ${sonuc.mesaj}`
    : sonuc.tekrar
      ? `🔁 **${sonuc.urun.ad}** kuşanıldı.`
      : `🎉 **${sonuc.urun.ad}** satın alındı!`;
  return interaction.update(tezgah(sahip, not));
}
