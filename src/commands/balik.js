import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import {
  balikDurumu, oltaAt, oltaCek, cantayiSat, oltaYukselt, akvaryumaKoy, akvaryumdanCikar, akvaryumTopla,
  akvaryumGeliri, turnuvaDurumu, balikUygunMu,
  BALIKLAR, TUR_SAYISI, MAKS_OLTA, GUNLUK_ATIS, MEVSIMLER, AKVARYUM_YUVA, AKVARYUM_BIRIKIM_SAAT,
  TURNUVA_ODULLERI, CEKME_PENCERESI_MS
} from '../services/balikServisi.js';

export const butonOnek = 'kage_balik:';

export const data = new SlashCommandBuilder()
  .setName('balik')
  .setDescription('Gölette olta at, doğru anda çek, akvaryum kur ve haftalık turnuvada yarış.');

const SEKMELER = [
  { id: 'golet', ad: 'Gölet', emoji: '🎣' },
  { id: 'akvaryum', ad: 'Akvaryum', emoji: '🐠' },
  { id: 'turnuva', ad: 'Turnuva', emoji: '🏆' }
];

const balikBul = id => BALIKLAR.find(b => b.id === id);

function sekmeSatiri(userId, aktif) {
  return new ActionRowBuilder().addComponents(SEKMELER.map(s =>
    new ButtonBuilder()
      .setCustomId(`${butonOnek}sekme:${userId}:${s.id}`)
      .setLabel(s.ad).setEmoji(s.emoji)
      .setStyle(s.id === aktif ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(s.id === aktif)
  ));
}

function sureYaz(ms) {
  const dk = Math.max(0, Math.floor(ms / 60000));
  const gun = Math.floor(dk / 1440);
  const saat = Math.floor((dk % 1440) / 60);
  return gun ? `${gun} gün ${saat} sa` : `${saat} sa ${dk % 60} dk`;
}

function goletPaneli(userId, not, simdi) {
  const d = balikDurumu(userId, simdi);
  const cantaSatir = BALIKLAR
    .filter(b => d.canta[b.id])
    .map(b => `${b.emoji} ${b.ad} x${d.canta[b.id]}`)
    .join('\n') || 'Çanta boş.';
  const rekor = d.rekor ? balikBul(d.rekor.id) : null;
  const ozel = BALIKLAR.filter(b => (b.gece || b.mevsim) && balikUygunMu(b, simdi));
  const ms = MEVSIMLER[d.mevsim];
  const vakit = `${d.geceMi ? '🌙 Gece' : '☀️ Gündüz'} • ${ms.emoji} ${ms.ad}` +
    (ozel.length ? `\nŞu an çıkan özel balıklar: ${ozel.map(b => `${b.emoji} ${b.ad}`).join(', ')}` : '');

  const embed = kageEmbed({
    baslik: 'GÖLET',
    renk: TEMA.RENKLER.BILGI,
    aciklama: (not ? `${not}\n\n` : '') +
      `${vakit}\nOlta seviyesi **${d.olta}/${MAKS_OLTA}** • Bugünkü atış **${d.bugun}/${GUNLUK_ATIS}**`,
    alanlar: [
      { name: `Çanta (${ryoYaz(d.cantaDeger)})`, value: cantaSatir, inline: false },
      { name: 'Koleksiyon', value: `${d.kesfedilen.length}/${TUR_SAYISI} tür`, inline: true },
      { name: 'Rekor', value: rekor ? `${rekor.emoji} ${rekor.ad} ${d.rekor.kg} kg` : 'Henüz yok', inline: true },
      { name: 'Sonraki olta', value: d.sonrakiBedel ? ryoYaz(d.sonrakiBedel) : 'En yüksek seviye', inline: true }
    ],
    altMetin: 'Olta at, şamandıra batınca Çek! Erken ya da geç çekersen balık kaçar.'
  });

  const oltaButonu = d.bekleyen
    ? new ButtonBuilder().setCustomId(`${butonOnek}cek:${userId}`).setLabel('Çek!').setEmoji('🪝')
      .setStyle(simdi >= d.bekleyen.isirma ? ButtonStyle.Danger : ButtonStyle.Secondary)
    : new ButtonBuilder().setCustomId(`${butonOnek}at:${userId}`).setLabel('Olta at').setEmoji('🎣')
      .setStyle(ButtonStyle.Primary).setDisabled(d.kalanAtis < 1);
  const ust = new ActionRowBuilder().addComponents(
    oltaButonu,
    new ButtonBuilder().setCustomId(`${butonOnek}sat:${userId}`).setLabel('Çantayı sat').setEmoji('💰')
      .setStyle(ButtonStyle.Success).setDisabled(d.cantaDeger < 1 || !!d.bekleyen),
    new ButtonBuilder().setCustomId(`${butonOnek}yukselt:${userId}`).setLabel('Olta yükselt').setEmoji('⬆️')
      .setStyle(ButtonStyle.Secondary).setDisabled(d.olta >= MAKS_OLTA || !!d.bekleyen)
  );
  const sonAv = d.sonAv && d.canta[d.sonAv.id] ? balikBul(d.sonAv.id) : null;
  if (sonAv && !d.bekleyen) {
    ust.addComponents(new ButtonBuilder().setCustomId(`${butonOnek}koy:${userId}`)
      .setLabel(`Akvaryuma koy (${sonAv.ad})`).setEmoji('🐠').setStyle(ButtonStyle.Secondary)
      .setDisabled(d.akvaryum.length >= AKVARYUM_YUVA));
  }
  return { embeds: [embed], components: [ust, sekmeSatiri(userId, 'golet')] };
}

function akvaryumPaneli(userId, not, simdi) {
  const d = balikDurumu(userId, simdi);
  const yuvalar = Array.from({ length: AKVARYUM_YUVA }, (_, i) => {
    const av = d.akvaryum[i];
    if (!av) return `\`${i + 1}\` · boş yuva`;
    const b = balikBul(av.id);
    return `\`${i + 1}\` · ${b.emoji} **${b.ad}** ${av.kg} kg • saatte ${ryoYaz(akvaryumGeliri(av))}`;
  }).join('\n');
  const embed = kageEmbed({
    baslik: 'AKVARYUM',
    renk: TEMA.RENKLER.BILGI,
    aciklama: (not ? `${not}\n\n` : '') + yuvalar,
    alanlar: [
      { name: 'Saatlik gelir', value: ryoYaz(d.saatlikGelir), inline: true },
      { name: 'Biriken', value: ryoYaz(d.akvaryumBirikim), inline: true },
      { name: 'Kasa sınırı', value: `${AKVARYUM_BIRIKIM_SAAT} saatlik gelir`, inline: true }
    ],
    altMetin: 'Gölette yakaladığın balığı "Akvaryuma koy" ile buraya al. Çıkardığın balık çantana döner.'
  });
  const ust = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${butonOnek}topla:${userId}`).setLabel('Topla').setEmoji('💰')
      .setStyle(ButtonStyle.Success).setDisabled(d.akvaryumBirikim < 1)
  );
  const satirlar = [ust];
  if (d.akvaryum.length) {
    satirlar.push(new ActionRowBuilder().addComponents(d.akvaryum.map((av, i) =>
      new ButtonBuilder().setCustomId(`${butonOnek}cikar:${userId}:${i}`)
        .setLabel(`${i + 1}. çıkar`).setEmoji(balikBul(av.id).emoji).setStyle(ButtonStyle.Secondary)
    )));
  }
  satirlar.push(sekmeSatiri(userId, 'akvaryum'));
  return { embeds: [embed], components: satirlar };
}

function turnuvaPaneli(userId, not, simdi) {
  const t = turnuvaDurumu(userId, simdi);
  const madalya = ['🥇', '🥈', '🥉'];
  const satir = (k, i) => {
    const b = balikBul(k.id);
    return `${madalya[i] || `\`${i + 1}.\``} <@${k.uid}> ${b.emoji} ${b.ad} **${k.kg} kg**`;
  };
  const liste = t.ilk.map(satir).join('\n') || 'Bu hafta henüz kimse balık tutmadı. İlk sen ol!';
  const gecen = t.gecen
    ? t.gecen.kazananlar.map((k, i) => `${madalya[i]} <@${k.uid}> ${k.kg} kg (+${ryoYaz(k.odul)})`).join('\n')
    : 'Henüz kapanan turnuva yok.';
  const embed = kageEmbed({
    baslik: 'HAFTALIK BALIK TURNUVASI',
    renk: TEMA.RENKLER.ALTIN,
    aciklama: (not ? `${not}\n\n` : '') +
      `Haftanın en ağır balığını tutan kazanır. Bitime **${sureYaz(t.kalanMs)}**, ${t.katilimci} katılımcı.\n\n${liste}`,
    alanlar: [
      { name: 'Senin en iyin', value: t.benim ? `${t.benim.sira}. sıra • ${balikBul(t.benim.id).emoji} ${t.benim.kg} kg` : 'Bu hafta kaydın yok.', inline: true },
      { name: 'Ödüller', value: TURNUVA_ODULLERI.map((o, i) => `${madalya[i]} ${ryoYaz(o)}`).join('\n'), inline: true },
      { name: 'Geçen hafta', value: gecen, inline: false }
    ],
    altMetin: 'Kusursuz çekiş balığı %20 ağırlaştırır. Hafta pazar gece yarısı kapanır.'
  });
  return { embeds: [embed], components: [sekmeSatiri(userId, 'turnuva')] };
}

function panel(userId, sekme = 'golet', not = '', simdi = Date.now()) {
  if (sekme === 'akvaryum') return akvaryumPaneli(userId, not, simdi);
  if (sekme === 'turnuva') return turnuvaPaneli(userId, not, simdi);
  return goletPaneli(userId, not, simdi);
}

export async function execute(interaction) {
  return interaction.reply(panel(interaction.user.id));
}

function cekNotu(s) {
  if (!s.basarili) {
    if (s.sebep === 'erken') return '💨 Şamandıra batmadan çektin, balık ürküp kaçtı.';
    if (s.sebep === 'gec') return '💨 Geç kaldın, balık yemi alıp kaçtı.';
    return 'Suda olta yok. Önce olta at.';
  }
  let not = s.balik.cop
    ? `${s.balik.emoji} Oltaya **${s.balik.ad}** takıldı. Şanssız atış.`
    : `${s.balik.emoji} **${s.balik.ad}** yakaladın (${s.kg} kg)!`;
  if (s.kusursuz) not = `🎯 **Kusursuz çekiş!** ${not}`;
  if (s.yeniTur) not += `\n🆕 Yeni tür keşfi: +${ryoYaz(s.bonus)}`;
  if (s.yeniRekor) not += '\n🏆 Kişisel rekor!';
  if (s.turnuvaRekoru) not += '\n📈 Bu haftaki turnuva kaydın yenilendi.';
  return not;
}

/** Şamandıra batınca paneli kırmızı Çek! butonuyla günceller; pencere kaçarsa avı kaçmış sayar. */
function samandiraZamanla(interaction, sahip, atis, isirmaMs) {
  const hala = () => balikDurumu(sahip).bekleyen?.atis === atis;
  setTimeout(() => {
    if (!hala()) return;
    interaction.editReply(panel(sahip, 'golet', '‼️ **ŞAMANDIRA BATTI! ÇEK!**')).catch(() => null);
    setTimeout(() => {
      // Pencere kapandığı için bekleyen artık "aktif" görünmez; çekilmemişse oltaCek 'gec' döner.
      const s = oltaCek(sahip);
      if (s.sebep === 'yok') return;
      let not = cekNotu(s);
      if (s.notlar?.length) not += `\n${s.notlar.join('\n')}`;
      interaction.editReply(panel(sahip, 'golet', not)).catch(() => null);
    }, CEKME_PENCERESI_MS + 300);
  }, isirmaMs);
}

export async function buton(interaction) {
  const [eylem, sahip, param] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu olta sana ait değil. Kendin için `/balik` yaz.', flags: MessageFlags.Ephemeral });
  }
  if (eylem === 'sekme') return interaction.update(panel(sahip, param));

  let sekme = 'golet';
  let not = '';
  if (eylem === 'at') {
    const s = oltaAt(sahip);
    if (s.basarili) {
      await interaction.update(panel(sahip, 'golet', '🎣 Olta suda. Şamandırayı izle, batınca **Çek!**'));
      samandiraZamanla(interaction, sahip, s.atis, s.isirmaMs);
      return;
    }
    if (s.sebep === 'suda') not = 'Olta zaten suda, şamandırayı izle.';
    else if (s.sebep === 'limit') not = 'Bugünlük atış hakkın bitti. Yarın gel.';
    else not = `Olta suya dönüyor, **${Math.ceil(s.beklemeMs / 1000)} sn** bekle.`;
  } else if (eylem === 'cek') {
    const s = oltaCek(sahip);
    not = cekNotu(s);
    if (s.notlar?.length) not += `\n${s.notlar.join('\n')}`;
  } else if (eylem === 'sat') {
    const s = cantayiSat(sahip);
    not = s.basarili ? `💰 ${s.adet} av satıldı: **${ryoYaz(s.miktar)}**.` : 'Satılacak av yok.';
  } else if (eylem === 'yukselt') {
    const s = oltaYukselt(sahip);
    if (s.basarili) not = `⬆️ Olta **${s.olta}. seviye** oldu (-${ryoYaz(s.bedel)}). Nadir balık şansı arttı.`;
    else if (s.sebep === 'yetersiz') not = `Yetersiz Ryo. Gereken: ${ryoYaz(s.bedel)}.`;
    else not = 'Olta zaten en yüksek seviyede.';
  } else if (eylem === 'koy') {
    const s = akvaryumaKoy(sahip);
    if (s.basarili) {
      const b = balikBul(s.av.id);
      not = `🐠 ${b.emoji} **${b.ad}** (${s.av.kg} kg) akvaryuma kondu. Saatte ${ryoYaz(s.gelir)} üretecek.`;
      sekme = 'akvaryum';
    } else not = s.mesaj;
  } else if (eylem === 'cikar') {
    sekme = 'akvaryum';
    const s = akvaryumdanCikar(sahip, Number(param));
    not = s.basarili ? `${balikBul(s.av.id).emoji} **${balikBul(s.av.id).ad}** akvaryumdan çıkarıldı, çantana döndü.` : s.mesaj;
  } else if (eylem === 'topla') {
    sekme = 'akvaryum';
    const s = akvaryumTopla(sahip);
    not = s.basarili ? `💰 Akvaryumdan **${ryoYaz(s.miktar)}** toplandı.` : s.mesaj;
  }
  return interaction.update(panel(sahip, sekme, not));
}
