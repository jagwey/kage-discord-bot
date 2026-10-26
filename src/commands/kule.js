import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import {
  kuleDurumu, kuleBasla, kuleSavas, kuleSec, kuleCekil, kuleSiralamasi,
  BUFFLAR, GUNLUK_HAK, OLUM_ORANI, bossKatiMi
} from '../services/kuleServisi.js';

export const butonOnek = 'kage_kule:';

export const data = new SlashCommandBuilder()
  .setName('kule')
  .setDescription('Gölge Kulesi: kat kat tırman, her katta bir güçlenme seç, ölmeden önce ödülünü çek.');

function dugme(id, etiket, emoji, stil, userId, kapali = false) {
  return new ButtonBuilder().setCustomId(`${butonOnek}${id}:${userId}`).setLabel(etiket).setEmoji(emoji).setStyle(stil).setDisabled(kapali);
}

function panel(userId, not = '') {
  const d = kuleDurumu(userId);
  const a = d.aktif;
  const alanlar = [
    { name: 'Rekor', value: `${d.enIyi} kat`, inline: true },
    { name: 'Bugünkü hak', value: `${d.hak}/${GUNLUK_HAK}`, inline: true }
  ];
  let aciklama = not ? `${not}\n\n` : '';
  const rows = [];

  if (!a) {
    aciklama += `Kuleye girmek için bir hak harca. Her kat savaşı kazanırsan ödül birikir; ölürsen ödülün **%${Math.round(OLUM_ORANI * 100)}'ini** alırsın, **Çekil** dersen tamamını.`;
    rows.push(new ActionRowBuilder().addComponents(
      dugme('basla', 'Kuleye gir', '🏯', ButtonStyle.Primary, userId, d.hak < 1),
      dugme('sira', 'Sıralama', '🏆', ButtonStyle.Secondary, userId)
    ));
  } else {
    const dus = d.siradaki;
    alanlar.unshift(
      { name: 'Kat', value: `${a.kat}${bossKatiMi(a.kat) ? ' (BOSS)' : ''}`, inline: true },
      { name: 'Can', value: `${a.can}/${a.maksCan}`, inline: true },
      { name: 'Güç', value: String(a.guc), inline: true },
      { name: 'Birikmiş ödül', value: ryoYaz(a.odul), inline: true }
    );
    if (a.secenek) {
      aciklama += 'Bir güçlenme seç:\n' + a.secenek.map(id => `${BUFFLAR[id].emoji} **${BUFFLAR[id].ad}**: ${BUFFLAR[id].aciklama}`).join('\n');
      rows.push(new ActionRowBuilder().addComponents(
        ...a.secenek.map(id => dugme(`sec_${id}`, BUFFLAR[id].ad, BUFFLAR[id].emoji, ButtonStyle.Success, userId))
      ));
      rows.push(new ActionRowBuilder().addComponents(dugme('cekil', 'Çekil ve ödülü al', '💰', ButtonStyle.Secondary, userId)));
    } else {
      aciklama += `Karşındaki: **${dus.ad}** (can ${dus.can}, güç ${dus.guc})`;
      rows.push(new ActionRowBuilder().addComponents(
        dugme('savas', 'Savaş', '⚔️', ButtonStyle.Danger, userId),
        dugme('cekil', 'Çekil ve ödülü al', '💰', ButtonStyle.Secondary, userId)
      ));
    }
  }
  const embed = kageEmbed({ baslik: 'GÖLGE KULESİ', renk: TEMA.RENKLER.GOLGE_KIRMIZISI, aciklama, alanlar });
  return { embeds: [embed], components: rows };
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.user.id));
}

export async function buton(interaction) {
  const [eylem, sahip] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu kule senin değil. Kendin için `/kule` yaz.', ephemeral: true });
  }
  let not = '';
  if (eylem === 'basla') {
    const s = kuleBasla(sahip);
    not = s.basarili ? 'Kuleye girdin. İlk katta bir Gölge Askeri bekliyor.' : (s.sebep === 'hak' ? 'Bugünkü hakların bitti.' : 'Zaten kuledesin.');
  } else if (eylem === 'savas') {
    const s = kuleSavas(sahip);
    if (!s.basarili) not = 'Önce bir güçlenme seçmelisin.';
    else if (s.kazandi) not = `⚔️ Kat ${s.kat} geçildi (+${ryoYaz(s.kazanc)} birikti). Kalan can: ${s.can}.`;
    else {
      not = `💀 Kat ${s.kat}'de düştün. ${s.katSayisi} kat tamamladın, ${ryoYaz(s.odenen)} aldın.`;
      if (s.yeniRekor) not += '\n🏆 Yeni rekor!';
    }
  } else if (eylem.startsWith('sec_')) {
    const s = kuleSec(sahip, eylem.slice(4));
    not = s.basarili ? `${s.buff.emoji} **${s.buff.ad}** alındı.` : 'Geçersiz seçim.';
  } else if (eylem === 'cekil') {
    const s = kuleCekil(sahip);
    if (s.basarili) {
      not = `💰 Kuleden çekildin: ${s.katSayisi} kat, **${ryoYaz(s.odenen)}** kazandın.`;
      if (s.yeniRekor) not += '\n🏆 Yeni rekor!';
    } else not = 'Kulede değilsin.';
  } else if (eylem === 'sira') {
    const liste = kuleSiralamasi(10);
    not = liste.length
      ? '**Kule sıralaması**\n' + liste.map((x, i) => `${i + 1}. <@${x.uid}> — ${x.enIyi} kat`).join('\n')
      : 'Henüz kimse kuleye tırmanmadı.';
  }
  return interaction.update(panel(sahip, not));
}
