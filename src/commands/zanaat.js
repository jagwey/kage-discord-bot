import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import {
  MALZEMELER, TARIFLER, bonusMetni, malzemeMetni, zanaatProfili, esyaDov, esyaKusan, zanaatBonusu
} from '../services/zanaatServisi.js';
import { oyunOlayi } from '../services/oyunOlayServisi.js';

const TARIF_SECENEKLERI = Object.entries(TARIFLER).map(([id, t]) => ({ name: `${t.emoji} ${t.ad}`, value: id }));

export const data = new SlashCommandBuilder()
  .setName('zanaat')
  .setDescription('Zindan ve gölden topladığın malzemelerle demircide silah ve tılsım döv.')
  .addSubcommand(s => s.setName('canta').setDescription('Malzemelerini, eşyalarını ve kuşandıklarını gösterir.'))
  .addSubcommand(s => s.setName('tarifler').setDescription('Demircinin dövebildiği bütün eşyalar.'))
  .addSubcommand(s => s
    .setName('yap')
    .setDescription('Bir eşya döv. Malzeme ve demirci ücreti düşülür.')
    .addStringOption(o => o.setName('esya').setDescription('Dövülecek eşya').setRequired(true).addChoices(...TARIF_SECENEKLERI)))
  .addSubcommand(s => s
    .setName('kusan')
    .setDescription('Dövdüğün bir eşyayı kuşan. Her yuvaya (silah, tılsım) bir eşya.')
    .addStringOption(o => o.setName('esya').setDescription('Kuşanılacak eşya').setRequired(true).addChoices(...TARIF_SECENEKLERI)));

function bonusOzeti(b) {
  const parcalar = [];
  if (b.hasar) parcalar.push(`+%${b.hasar} hasar`);
  if (b.kritik) parcalar.push(`+%${b.kritik} Gölge şansı`);
  if (b.can) parcalar.push(`+${b.can} can`);
  if (b.ryo) parcalar.push(`+%${b.ryo} Ryo`);
  if (b.kacinma) parcalar.push(`+%${b.kacinma} kaçınma`);
  return parcalar.join(', ') || 'Bonus yok';
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (sub === 'canta') {
    const p = zanaatProfili(userId);
    const malzeme = Object.entries(MALZEMELER)
      .map(([id, m]) => `${m.emoji} ${m.ad}: **${p.malzeme[id] || 0}** _(${m.kaynak})_`)
      .join('\n');
    const esyalar = p.esyalar.map(id => {
      const t = TARIFLER[id];
      const takili = p.kusanilan[t.yuva] === id ? ' ✅' : '';
      return `${t.emoji} ${t.ad}${takili}`;
    }).join('\n') || 'Henüz eşya dövmedin. `/zanaat tarifler` ile başla.';
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '🧰 ZANAAT ÇANTASI',
        renk: TEMA.RENKLER.BILGI,
        alanlar: [
          { name: 'Malzemeler', value: malzeme, inline: false },
          { name: 'Eşyalar (✅ kuşanılı)', value: esyalar, inline: true },
          { name: 'Toplam bonus (zindanda)', value: bonusOzeti(zanaatBonusu(userId)), inline: true }
        ],
        altMetin: 'Malzemeler zindan zaferi, balık ve boss öldürmeden düşer.'
      })],
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === 'tarifler') {
    const p = zanaatProfili(userId);
    const alanlar = Object.entries(TARIFLER).map(([id, t]) => ({
      name: `${t.emoji} ${t.ad} (${t.yuva === 'silah' ? 'silah' : 'tılsım'})${p.esyalar.includes(id) ? ' ✅' : ''}`,
      value: `${malzemeMetni(t.malzeme)} + ${ryoYaz(t.ryo)}\n${bonusMetni(t.bonus)}`,
      inline: true
    }));
    return interaction.reply({
      embeds: [kageEmbed({
        baslik: '⚒️ DEMİRCİ TARİFLERİ',
        renk: TEMA.RENKLER.ALTIN,
        aciklama: 'Çelik sabırla dövülür. Her eşya bir kez dövülür, yuvası boşsa kendiliğinden kuşanılır.',
        alanlar
      })]
    });
  }

  const esyaId = interaction.options.getString('esya');

  if (sub === 'yap') {
    const s = esyaDov(userId, esyaId);
    if (!s.basarili) return interaction.reply({ content: `❌ ${s.mesaj}`, flags: MessageFlags.Ephemeral });
    let mesaj = `🔨 Örs kızardı, çekiç indi: ${s.tarif.emoji} **${s.tarif.ad}** dövüldü! (${bonusMetni(s.tarif.bonus)})`;
    if (s.kusanildi) mesaj += '\nYuva boştu, eşya kuşanıldı.';
    const { notlar } = oyunOlayi(userId, 'zanaat');
    if (notlar.length) mesaj += `\n${notlar.join('\n')}`;
    return interaction.reply({ content: mesaj });
  }

  if (sub === 'kusan') {
    const s = esyaKusan(userId, esyaId);
    if (!s.basarili) return interaction.reply({ content: `❌ ${s.mesaj}`, flags: MessageFlags.Ephemeral });
    return interaction.reply({
      content: `✅ ${s.tarif.emoji} **${s.tarif.ad}** kuşanıldı. Zindan bonusun: ${bonusOzeti(zanaatBonusu(userId))}`,
      flags: MessageFlags.Ephemeral
    });
  }
}
