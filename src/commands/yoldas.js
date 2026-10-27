import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoYaz } from '../config/oyunGorsel.js';
import { bakiyeGetir, ryoDus, ryoEkle } from '../services/ekonomiServisi.js';
import {
  YOLDAS_TURLERI,
  EVRIM_SEVIYESI,
  BESLEME_UCRETI,
  EGITIM_UCRETI,
  OYUN_BEKLEME_MS,
  EGITIM_BEKLEME_MS,
  SEFER_SURELERI,
  kullaniciYoldasGetir,
  yoldasSec,
  yoldasBesle,
  yoldasOyna,
  yoldasEgit,
  yoldasSeferBaslat,
  yoldasSeferTopla,
  yoldasIsimVer,
  yoldasDurumu,
  yoldasGucu,
  yoldasAdi,
  evrimlestiMi
} from '../services/yoldasServisi.js';
import { oyunOlayi } from '../services/oyunOlayServisi.js';

export const butonOnek = 'kage_yoldas:';

export const data = new SlashCommandBuilder()
    .setName('yoldas')
    .setDescription('Zindan ve dövüşlerde sana eşlik eden kutsal gölge yoldaşını yönet.')
    .addSubcommand(sub =>
      sub
        .setName('bilgi')
        .setDescription('Yoldaş yuvasını açar: besle, oyna, eğit, sefere gönder.')
    )
    .addSubcommand(sub =>
      sub
        .setName('sec')
        .setDescription('Kendine yeni bir gölge yoldaşı seç.')
        .addStringOption(opt =>
          opt
            .setName('tur')
            .setDescription('Seçmek istediğin yoldaş')
            .setRequired(true)
            .addChoices(
              { name: '🐺 Gölge Kurdu (+%15 Kritik Hasar)', value: 'kurt' },
              { name: '🦊 Alev Tilkisi (+%20 Ek Ryo)', value: 'tilki' },
              { name: '🦅 Mistik Kuzgun (%15 Kaçınma)', value: 'kuzgun' },
              { name: '🐉 Yeşim Ejderi (%20 Hasar Kalkanı - 2.500 Ryo)', value: 'ejder' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('besle')
        .setDescription(`Yoldaşına ${BESLEME_UCRETI} Ryo değerinde leziz et ikram et ve XP kazandır.`)
    )
    .addSubcommand(sub =>
      sub
        .setName('isim')
        .setDescription('Yoldaşına bir isim ver.')
        .addStringOption(opt => opt.setName('ad').setDescription('2-24 karakter').setRequired(true).setMaxLength(24))
    );

const RUH_YAZISI = {
  ac: '😫 **Aç** • savaş bonusu yarıya düştü',
  kuskun: '😞 **Küskün** • savaş bonusu yarıya düştü',
  normal: '🙂 **Huzurlu**',
  mutlu: '😄 **Mutlu** • savaş bonusu +%10'
};

function cubuk(deger, maks, renk, uzunluk = 10) {
  const dolu = Math.round(Math.max(0, Math.min(1, deger / maks)) * uzunluk);
  return `${renk.repeat(dolu)}${'⬛'.repeat(uzunluk - dolu)} \`${deger}/${maks}\``;
}

function sureYaz(ms) {
  const dk = Math.max(1, Math.ceil(ms / 60_000));
  const sa = Math.floor(dk / 60);
  return sa ? `${sa} sa ${dk % 60} dk` : `${dk} dk`;
}

function evre(yoldas) {
  if (evrimlestiMi(yoldas)) return '🌟 Efsanevi biçim';
  if (yoldas.seviye >= 5) return '🌿 Genç savaşçı';
  return '🥚 Yavru';
}

function secimPaneli(userId, not = '') {
  const ryo = bakiyeGetir(userId).ryo;
  const embed = kageEmbed({
    baslik: '🐾 YOLDAŞ YUVASI • Yoldaşını Seç',
    renk: TEMA.RENKLER.ALTIN,
    aciklama: (not ? `${not}\n\n` : '') + 'Zindanlarda yanında savaşacak, seferlerde ganimet toplayacak bir gölge yoldaşı seç.\n​',
    alanlar: Object.values(YOLDAS_TURLERI).map(t => ({
      name: `${t.ad}${t.fiyat ? ` • ${ryoYaz(t.fiyat)}` : ' • Ücretsiz'}`,
      value: `-# ${t.aciklama}`,
      inline: false
    })),
    altMetin: `Cüzdan: ${ryoYaz(ryo)} • Seviye ${EVRIM_SEVIYESI}'da evrimleşir`
  });
  const row = new ActionRowBuilder().addComponents(
    Object.values(YOLDAS_TURLERI).map(t =>
      new ButtonBuilder()
        .setCustomId(`${butonOnek}sec:${userId}:${t.id}`)
        .setLabel(t.ad.split(' (')[0].split(' ').slice(1).join(' '))
        .setEmoji(t.ad.split(' ')[0])
        .setStyle(t.fiyat ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(t.fiyat > ryo)
    )
  );
  return { embeds: [embed], components: [row] };
}

function yuvaPaneli(userId, not = '', simdi = Date.now()) {
  const yoldas = kullaniciYoldasGetir(userId);
  if (!yoldas) return secimPaneli(userId, not);

  const tur = YOLDAS_TURLERI[yoldas.turId];
  const d = yoldasDurumu(yoldas, simdi);
  const ryo = bakiyeGetir(userId).ryo;
  const gerekenXp = yoldas.seviye * 100;

  let seferSatiri = '';
  if (yoldas.sefer) {
    const kalan = yoldas.sefer.bitis - simdi;
    seferSatiri = kalan > 0
      ? `\n🗺️ **Seferde** • ${yoldas.sefer.saat} saatlik yolculuk, dönüşe **${sureYaz(kalan)}**`
      : `\n📦 **Seferden döndü!** Ganimeti toplamayı bekliyor.`;
  }

  const embed = kageEmbed({
    baslik: `🐾 YOLDAŞ YUVASI • ${yoldasAdi(yoldas)}`,
    renk: evrimlestiMi(yoldas) ? TEMA.RENKLER.ALTIN : TEMA.RENKLER.KAN_KIRMIZISI,
    aciklama: (not ? `${not}\n\n` : '') +
      `${evre(yoldas)} • **Seviye ${yoldas.seviye}**${evrimlestiMi(yoldas) ? '' : ` • Seviye ${EVRIM_SEVIYESI}'da evrimleşir`}\n` +
      `${RUH_YAZISI[d.ruh]}${seferSatiri}\n​`,
    alanlar: [
      { name: '📊 XP', value: cubuk(yoldas.xp || 0, gerekenXp, '🟦'), inline: false },
      { name: '🍖 Tokluk', value: cubuk(d.tokluk, 100, d.tokluk < 20 ? '🟥' : d.tokluk < 50 ? '🟨' : '🟩'), inline: false },
      { name: '💞 Mutluluk', value: cubuk(d.mutluluk, 100, d.mutluluk < 20 ? '🟥' : d.mutluluk < 50 ? '🟨' : '🟪'), inline: false },
      { name: '✨ Savaş Bonusu', value: `\`+%${yoldasGucu(yoldas, tur, simdi)} ${tur.bonusTip.toUpperCase()}\``, inline: true },
      { name: '🗺️ Seferler', value: `\`${yoldas.seferSayisi || 0}\``, inline: true },
      { name: '💰 Cüzdan', value: `\`${ryoYaz(ryo)}\``, inline: true }
    ],
    altMetin: 'Tokluk saatte 3, mutluluk saatte 2 düşer • /yoldas isim ile ad koy'
  });

  const seferde = !!yoldas.sefer;
  const oyunKalan = (yoldas.sonOyun || 0) + OYUN_BEKLEME_MS - simdi;
  const egitimKalan = (yoldas.sonEgitim || 0) + EGITIM_BEKLEME_MS - simdi;
  const b = (eylem, param = '') => `${butonOnek}${eylem}:${userId}${param ? `:${param}` : ''}`;

  const bakim = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(b('besle')).setEmoji('🍖')
      .setLabel(`Besle (${BESLEME_UCRETI})`).setStyle(ButtonStyle.Success)
      .setDisabled(seferde || d.tokluk >= 95 || ryo < BESLEME_UCRETI),
    new ButtonBuilder().setCustomId(b('oyna')).setEmoji('🎾')
      .setLabel(oyunKalan > 0 ? `Oyna (${sureYaz(oyunKalan)})` : 'Oyna').setStyle(ButtonStyle.Primary)
      .setDisabled(seferde || oyunKalan > 0 || d.tokluk < 10),
    new ButtonBuilder().setCustomId(b('egit')).setEmoji('🥋')
      .setLabel(egitimKalan > 0 ? `Eğit (${sureYaz(egitimKalan)})` : `Eğit (${EGITIM_UCRETI})`).setStyle(ButtonStyle.Danger)
      .setDisabled(seferde || egitimKalan > 0 || d.tokluk < 30 || d.mutluluk < 30 || ryo < EGITIM_UCRETI),
    new ButtonBuilder().setCustomId(b('yenile')).setEmoji('🔄').setLabel('Yenile').setStyle(ButtonStyle.Secondary)
  );

  const sefer = new ActionRowBuilder();
  if (seferde) {
    const kalan = yoldas.sefer.bitis - simdi;
    sefer.addComponents(
      new ButtonBuilder().setCustomId(b('topla')).setEmoji('📦')
        .setLabel(kalan > 0 ? `Dönüşe ${sureYaz(kalan)}` : 'Ganimeti Topla')
        .setStyle(kalan > 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(kalan > 0)
    );
  } else {
    sefer.addComponents(SEFER_SURELERI.map(saat =>
      new ButtonBuilder().setCustomId(b('sefer', saat)).setEmoji('🗺️')
        .setLabel(`Sefer ${saat} sa`).setStyle(ButtonStyle.Secondary)
        .setDisabled(d.tokluk < 25)
    ));
  }

  return { embeds: [embed], components: [bakim, sefer] };
}

function ilerlemeNotu(sonuc, userId) {
  let not = '';
  if (sonuc.seviyeAtladi) not += `\n🌟 **Seviye ${sonuc.yoldas.seviye}!** Savaş bonusu güçlendi.`;
  if (sonuc.evrimOldu) {
    not += `\n🌟 **EVRİM!** Yoldaşın **${yoldasAdi(sonuc.yoldas)}** biçimine dönüştü. Savaş bonusu artık x1.5.`;
    const { notlar } = oyunOlayi(userId, 'evrim');
    if (notlar.length) not += `\n${notlar.join('\n')}`;
  }
  return not;
}

const SEBEP = {
  yok: '🐾 Henüz bir yoldaşın yok.',
  seferde: '🗺️ Yoldaşın seferde. Dönmesini bekle.',
  tok: '🍖 Yoldaşın tıka basa tok. Biraz sonra tekrar dene.',
  ac: '😫 Yoldaşın çok aç. Önce besle.',
  yorgun: '😮‍💨 Eğitim için tokluk ve mutluluk en az 30 olmalı.',
  kisa: '❌ İsim 2-24 karakter olmalı.',
  seferYok: '🗺️ Yoldaşın seferde değil.',
  sure: '❌ Geçersiz sefer süresi.'
};

function sebepYaz(sonuc, ucret) {
  if (sonuc.sebep === 'bekle') return `⏳ Biraz bekle: **${sureYaz(sonuc.kalanMs)}** kaldı.`;
  if (sonuc.sebep === 'ryo') return `❌ Bunun için **${ryoYaz(ucret)}** gerekir.`;
  return SEBEP[sonuc.sebep] || '❌ Bu işlem şu an yapılamadı.';
}

/** Butonlar ve alt komutlar için ortak eylem yürütücü; panelin üstüne yazılacak notu döner. */
function eylemYap(userId, eylem, param) {
  if (eylem === 'besle') {
    const s = yoldasBesle(userId, { ode: () => ryoDus(userId, BESLEME_UCRETI, 'Yoldaş besleme') });
    if (!s.basarili) return sebepYaz(s, BESLEME_UCRETI);
    return `🍖 **${yoldasAdi(s.yoldas)}** afiyetle karnını doyurdu! Tokluk +40, mutluluk +10, **+${s.xp} XP**.` + ilerlemeNotu(s, userId);
  }
  if (eylem === 'oyna') {
    const s = yoldasOyna(userId);
    if (!s.basarili) return sebepYaz(s);
    return `🎾 **${yoldasAdi(s.yoldas)}** ile oynadın, kuyruğu durmuyor! Mutluluk +25, **+${s.xp} XP**.` + ilerlemeNotu(s, userId);
  }
  if (eylem === 'egit') {
    const s = yoldasEgit(userId, { ode: () => ryoDus(userId, EGITIM_UCRETI, 'Yoldaş eğitimi') });
    if (!s.basarili) return sebepYaz(s, EGITIM_UCRETI);
    return `🥋 Dojoda ter döktünüz. **${yoldasAdi(s.yoldas)}** yeni teknikler öğrendi: **+${s.xp} XP**.` + ilerlemeNotu(s, userId);
  }
  if (eylem === 'sefer') {
    const saat = Number(param);
    const s = yoldasSeferBaslat(userId, saat);
    if (!s.basarili) return sebepYaz(s);
    return `🗺️ **${yoldasAdi(s.yoldas)}** ${saat} saatlik sefere çıktı. Döndüğünde ganimetini topla.`;
  }
  if (eylem === 'topla') {
    const s = yoldasSeferTopla(userId);
    if (!s.basarili) return sebepYaz(s);
    ryoEkle(userId, s.ryo, 'Yoldaş seferi');
    const { notlar } = oyunOlayi(userId, 'sefer', { kat: s.saat });
    return `📦 **${yoldasAdi(s.yoldas)}** seferden döndü: **+${ryoYaz(s.ryo)}**, **+${s.xp} XP**.` +
      ilerlemeNotu(s, userId) + (notlar.length ? `\n${notlar.join('\n')}` : '');
  }
  if (eylem === 'sec') {
    const tur = YOLDAS_TURLERI[param];
    if (!tur) return '❌ Geçersiz yoldaş türü.';
    if (kullaniciYoldasGetir(userId)?.turId === tur.id) return `🐾 **${tur.ad}** zaten yoldaşın.`;
    if (tur.fiyat > 0 && !ryoDus(userId, tur.fiyat, `Yoldaş: ${tur.ad}`)) {
      return `❌ **${tur.ad}** çok nadir bir yoldaştır! Sahiplenmek için **${ryoYaz(tur.fiyat)}** gerekir.`;
    }
    const yeni = yoldasSec(userId, tur.id);
    return `🎉 **${yeni.ad}** artık senin kutsal gölge yoldaşın!`;
  }
  return '';
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (sub === 'isim') {
    const s = yoldasIsimVer(userId, interaction.options.getString('ad'));
    if (!s.basarili) {
      return interaction.reply({ content: s.sebep === 'yok' ? '🐾 Önce `/yoldas sec` ile bir yoldaş edin.' : SEBEP.kisa, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply(yuvaPaneli(userId, `✍️ Yoldaşının yeni adı: **${s.isim}**`));
  }

  if (sub === 'sec') return interaction.reply(yuvaPaneli(userId, eylemYap(userId, 'sec', interaction.options.getString('tur'))));
  if (sub === 'besle') {
    if (!kullaniciYoldasGetir(userId)) return interaction.reply(secimPaneli(userId, '🐾 Önce bir yoldaş seç.'));
    return interaction.reply(yuvaPaneli(userId, eylemYap(userId, 'besle')));
  }
  return interaction.reply(yuvaPaneli(userId));
}

export async function buton(interaction) {
  const [eylem, sahip, param] = interaction.customId.slice(butonOnek.length).split(':');
  if (sahip !== interaction.user.id) {
    return interaction.reply({ content: 'Bu yoldaş yuvası sadece komutu yazana aittir. Kendin için `/yoldas bilgi` yaz.', flags: MessageFlags.Ephemeral });
  }
  const not = eylem === 'yenile' ? '' : eylemYap(sahip, eylem, param);
  return interaction.update(yuvaPaneli(sahip, not));
}
