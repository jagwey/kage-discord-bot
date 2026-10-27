import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { bossDurumu, saldir, ganimetHavuzu } from '../services/bossServisi.js';

export const butonOnek = 'kage_boss:';

export const data = new SlashCommandBuilder()
  .setName('boss')
  .setDescription('Sunucunun ortak dünya bossuna saldır; ölünce ganimet hasar payına göre bölünür.')
  .setDMPermission(false);

function can(b) {
  const oran = Math.max(0, b.can / b.maksCan);
  const dolu = Math.round(oran * 20);
  return `${'█'.repeat(dolu)}${'░'.repeat(20 - dolu)} ${b.can}/${b.maksCan}`;
}

function sureYaz(ms) {
  const s = Math.floor(ms / 60000);
  return `${Math.floor(s / 60)} sa ${s % 60} dk`;
}

function panel(guildId, not = '') {
  const b = bossDurumu(guildId);
  const ilk = b.siralama.slice(0, 5)
    .map((x, i) => `${i + 1}. <@${x.uid}> — ${x.toplam} hasar`)
    .join('\n') || 'Henüz kimse vurmadı.';
  const embed = kageEmbed({
    baslik: `${b.emoji} ${b.ad.toUpperCase()} • SEVİYE ${b.seviye}`,
    renk: TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: (not ? `${not}\n\n` : '') + `\`${can(b)}\``,
    alanlar: [
      { name: 'En çok hasar', value: ilk, inline: false },
      { name: 'Kalan süre', value: sureYaz(b.kalanMs), inline: true },
      { name: 'Ganimet havuzu', value: ryoYaz(ganimetHavuzu(b.seviye)), inline: true },
      { name: 'Sunucu sicili', value: `${b.oldurulen} öldürüldü • ${b.kacan} kaçtı`, inline: true }
    ],
    altMetin: 'Herkes saatte bir kez saldırabilir. Ölümcül vuruşu yapan ekstra pay alır.'
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}vur`).setLabel('Saldır').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`${butonOnek}yenile`).setLabel('Yenile').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.guildId));
}

export async function buton(interaction) {
  const eylem = interaction.customId.slice(butonOnek.length);
  if (eylem === 'yenile') return interaction.update(panel(interaction.guildId));

  const s = saldir(interaction.guildId, interaction.user.id);
  if (!s.basarili) {
    return interaction.reply({ content: `Kılıcın dinleniyor, **${sureYaz(s.beklemeMs)}** sonra tekrar vurabilirsin.`, flags: MessageFlags.Ephemeral });
  }
  let not = `${interaction.user} **${s.hasar}** hasar vurdu${s.kritik ? ' (KRİTİK!)' : ''}.`;
  if (s.oldu) {
    const satirlar = s.odul.sort((a, b) => b.miktar - a.miktar).slice(0, 5).map(o => `<@${o.uid}> +${ryoYaz(o.miktar)}`);
    not += `\n🏆 **Boss devrildi!** Ganimet dağıtıldı:\n${satirlar.join('\n')}`;
  }
  if (s.notlar?.length) not += `\n${s.notlar.join('\n')}`;
  return interaction.update(panel(interaction.guildId, not));
}
