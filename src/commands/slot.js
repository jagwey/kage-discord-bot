import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { bakiyeGetir, ryoEkle, ryoDus, MAKS_BAHIS } from '../services/ekonomiServisi.js';
import { bekle, ryoYaz, oyunStickerEkini } from '../config/oyunGorsel.js';

export const data = new SlashCommandBuilder()
  .setName('slot')
  .setDescription('Kage Şans Makinesi: makarayı çevir, semboller hizalanırsa Ryo kazan.')
  .addIntegerOption(opt =>
    opt.setName('bahis')
      .setDescription(`Ortaya koymak istediğiniz Ryo miktarı (10 - ${MAKS_BAHIS})`)
      .setRequired(true)
      .setMinValue(10)
      .setMaxValue(MAKS_BAHIS)
  );

/**
 * Ağırlıklar toplamı 100. Çarpanlar `slotBeklenenGeriDonus` ile hesaplanan ~%93 geri
 * dönüş (RTP) verecek şekilde seçildi; kasa uzun vadede hafif kazanır, ekonomi şişmez.
 */
export const SEMBOLLER = [
  { emoji: '🍒', ad: 'Kiraz', agirlik: 30, uclu: 2, cift: 1.0 },
  { emoji: '⛩️', ad: 'Torii', agirlik: 25, uclu: 4, cift: 1.2 },
  { emoji: '🗡️', ad: 'Katana', agirlik: 20, uclu: 6, cift: 1.5 },
  { emoji: '🐉', ad: 'Ejder', agirlik: 15, uclu: 12, cift: 2.0 },
  { emoji: '👑', ad: 'Şogun Tacı', agirlik: 10, uclu: 25, cift: 3.0 }
];

const TOPLAM_AGIRLIK = SEMBOLLER.reduce((t, s) => t + s.agirlik, 0);
const DONME = '🌀';

function sembolSec() {
  let r = Math.random() * TOPLAM_AGIRLIK;
  for (const s of SEMBOLLER) {
    r -= s.agirlik;
    if (r < 0) return s;
  }
  return SEMBOLLER[0];
}

/** Üç makara sonucu için çarpan ve etiket döner. */
export function slotSonucu(a, b, c) {
  if (a === b && b === c) return { carpan: a.uclu, tur: 'uclu', sembol: a };
  if (a === b || a === c) return { carpan: a.cift, tur: 'cift', sembol: a };
  if (b === c) return { carpan: b.cift, tur: 'cift', sembol: b };
  return { carpan: 0, tur: 'yok', sembol: null };
}

/** Tüm 125 kombinasyonu ağırlıklarıyla toplayarak tam RTP hesaplar (test için). */
export function slotBeklenenGeriDonus() {
  let rtp = 0;
  for (const a of SEMBOLLER) for (const b of SEMBOLLER) for (const c of SEMBOLLER) {
    const p = (a.agirlik / TOPLAM_AGIRLIK) * (b.agirlik / TOPLAM_AGIRLIK) * (c.agirlik / TOPLAM_AGIRLIK);
    rtp += p * slotSonucu(a, b, c).carpan;
  }
  return rtp;
}

const cerceve = (m1, m2, m3) =>
  '```\n' +
  '╔═══════════════════╗\n' +
  '║   KAGE  ŞANS  95  ║\n' +
  '╠═══════════════════╣\n' +
  `║   ${m1}   ${m2}   ${m3}   ║\n` +
  '╚═══════════════════╝\n' +
  '```';

const tekrarButonu = (kapali = false, etiket = 'Tekrar Çevir') =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('slot_tekrar').setLabel(etiket).setEmoji('🎰')
      .setStyle(ButtonStyle.Success).setDisabled(kapali)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const bahis = interaction.options.getInteger('bahis');

  const mevcut = bakiyeGetir(userId).ryo;
  if (mevcut < bahis) {
    return interaction.reply({
      content: `❌ Yetersiz bakiye! Cüzdanında **${ryoYaz(mevcut)}** var, gereken bahis: **${ryoYaz(bahis)}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
  if (!ryoDus(userId, bahis, 'slot bahis')) {
    return interaction.reply({ content: '❌ Bahis düşülemedi, bakiye değişmiş olabilir.', flags: MessageFlags.Ephemeral });
  }

  const mesaj = await interaction.reply({
    embeds: [kageEmbed({
      baslik: '🎰 KAGE ŞANS MAKİNESİ',
      renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
      aciklama: `${cerceve(DONME, DONME, DONME)}\nMakaralar dönüyor…`,
      altMetin: `Bahis: ${ryoYaz(bahis)}`
    })],
    fetchReply: true
  });

  let mesgul = false;

  /** Bir turu oynatır: makaralar sırayla durur, sonuç yazılır. Bahis önceden düşülmüş olmalı. */
  async function turuOyna(duzenle) {
    const a = sembolSec(), b = sembolSec(), c = sembolSec();
    const baslik = '🎰 KAGE ŞANS MAKİNESİ';
    const aralar = [
      [DONME, DONME, DONME, 'Makaralar dönüyor…'],
      [a.emoji, DONME, DONME, 'İlk makara durdu…'],
      [a.emoji, b.emoji, DONME, 'İkinci makara durdu… nefesini tut!']
    ];
    for (const [x, y, z, not] of aralar) {
      await duzenle({
        embeds: [kageEmbed({
          baslik, renk: TEMA.RENKLER.GOLGE_KIRMIZISI,
          aciklama: `${cerceve(x, y, z)}\n${not}`,
          altMetin: `Bahis: ${ryoYaz(bahis)}`
        })],
        components: [tekrarButonu(true)]
      });
      await bekle(900);
    }

    const sonuc = slotSonucu(a, b, c);
    const odeme = Math.floor(bahis * sonuc.carpan);
    if (odeme > 0) ryoEkle(userId, odeme, 'slot ödeme');
    const net = odeme - bahis;
    const bakiye = bakiyeGetir(userId).ryo;

    let baslikSon, renk, durum, duyguSonuc;
    if (sonuc.tur === 'uclu') {
      const buyuk = sonuc.sembol.uclu >= 12;
      baslikSon = buyuk ? '👑 BÜYÜK İKRAMİYE!' : '🎉 ÜÇLÜ HİZA!';
      renk = buyuk ? TEMA.RENKLER.ALTIN : TEMA.RENKLER.BASARI;
      durum = `${sonuc.sembol.emoji} ×3 • **${sonuc.sembol.uclu}×** çarpan\n**+${ryoYaz(net)}** net kazanç`;
      duyguSonuc = 'para';
    } else if (sonuc.tur === 'cift') {
      baslikSon = net > 0 ? '✨ ÇİFT EŞLEŞME' : '🤝 BAHİS İADE';
      renk = net > 0 ? TEMA.RENKLER.BASARI : TEMA.RENKLER.BILGI;
      durum = net > 0
        ? `${sonuc.sembol.emoji} ×2 • **${sonuc.carpan}×** çarpan\n**+${ryoYaz(net)}** net kazanç`
        : `${sonuc.sembol.emoji} ×2 • bahsin geri döndü.`;
      duyguSonuc = net > 0 ? 'zafer' : 'cay';
    } else {
      baslikSon = '💀 KAYBETTİN';
      renk = TEMA.RENKLER.HATA;
      durum = `Hizalama yok. **-${ryoYaz(bahis)}**`;
      duyguSonuc = 'aglama';
    }

    const { files, attachmentUrl } = oyunStickerEkini(interaction.user, interaction.member, duyguSonuc);
    const sonucEmbed = kageEmbed({
      baslik: baslikSon,
      renk,
      aciklama: `${cerceve(a.emoji, b.emoji, c.emoji)}\n${durum}\n🪙 Bakiye: **${ryoYaz(bakiye)}**`,
      altMetin: tekrarMumkun ? `Bahis: ${ryoYaz(bahis)} • 45 sn içinde tekrar çevirebilirsin` : 'Bakiyen bir sonraki tur için yetersiz'
    });
    if (attachmentUrl) sonucEmbed.setThumbnail(attachmentUrl);

    const tekrarMumkun = bakiye >= bahis;
    await duzenle({
      embeds: [sonucEmbed],
      files,
      components: tekrarMumkun ? [tekrarButonu(false)] : []
    });
  }

  const collector = mesaj.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.customId === 'slot_tekrar',
    time: 45000
  });

  collector.on('collect', async bi => {
    if (bi.user.id !== userId) {
      return bi.reply({ content: '⛔ Bu makine senin değil. Kendi `/slot` oyununu başlat.', flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    await bi.deferUpdate().catch(() => null);
    if (mesgul) return;
    mesgul = true;
    try {
      if (!ryoDus(userId, bahis, 'slot bahis')) {
        await mesaj.edit({ components: [] }).catch(() => null);
        return collector.stop('bakiye');
      }
      await turuOyna(p => mesaj.edit(p));
      collector.resetTimer();
    } catch (err) {
      console.error('[Slot] Tur hatası:', err.message);
    } finally {
      mesgul = false;
    }
  });

  collector.on('end', () => {
    if (!mesgul) mesaj.edit({ components: [] }).catch(() => null);
  });

  mesgul = true;
  try {
    await turuOyna(p => mesaj.edit(p));
  } catch (err) {
    console.error('[Slot] Tur hatası:', err.message);
  } finally {
    mesgul = false;
  }
}
