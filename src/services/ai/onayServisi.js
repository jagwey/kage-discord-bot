import crypto from 'crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { aiEylemiCalistir } from '../aiAjanServisi.js';
import { denetimKaydet } from './denetim.js';

const ONAY_ONEKI = 'kage_onay:';
const IPTAL_ONEKI = 'kage_iptal:';
const OMUR_MS = 2 * 60 * 1000;

// id -> { eylem, parametreler, guildId, channelId, userId, exp }
const bekleyenler = new Map();

function suresiDolanlariSil() {
  const simdi = Date.now();
  for (const [id, k] of bekleyenler) if (k.exp < simdi) bekleyenler.delete(id);
}

function ozet(eylem, parametreler) {
  const p = Object.entries(parametreler || {})
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(', ');
  return `**${eylem}**${p ? ` (${p})` : ''}`;
}

/** Yıkıcı bir eylem için onay bekleyen kayıt açar; mesaja eklenecek butonları döndürür. */
export function onayOlustur({ eylem, parametreler, guild, channel, userId }) {
  suresiDolanlariSil();
  const id = crypto.randomBytes(6).toString('hex');
  bekleyenler.set(id, {
    eylem,
    parametreler: parametreler || {},
    guildId: guild?.id,
    channelId: channel?.id,
    userId,
    exp: Date.now() + OMUR_MS
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${ONAY_ONEKI}${id}`).setLabel('Onayla').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`${IPTAL_ONEKI}${id}`).setLabel('Vazgeç').setStyle(ButtonStyle.Secondary)
  );
  return { id, row, metin: `⚠️ Onay gerekiyor: ${ozet(eylem, parametreler)}\nSadece isteyen kişi onaylayabilir, 2 dk geçerli.` };
}

export function onayButonuMu(customId) {
  return customId.startsWith(ONAY_ONEKI) || customId.startsWith(IPTAL_ONEKI);
}

/** interactionCreate içinden çağrılır. */
export async function onayButonunuIsle(interaction) {
  const onay = interaction.customId.startsWith(ONAY_ONEKI);
  const id = interaction.customId.slice((onay ? ONAY_ONEKI : IPTAL_ONEKI).length);
  const kayit = bekleyenler.get(id);

  if (!kayit || kayit.exp < Date.now()) {
    bekleyenler.delete(id);
    return interaction.update({ content: '⌛ Bu onayın süresi doldu.', components: [] }).catch(() => null);
  }
  if (interaction.user.id !== kayit.userId) {
    return interaction.reply({ content: 'Bu onay sana ait değil.', ephemeral: true }).catch(() => null);
  }
  if (interaction.guildId !== kayit.guildId) return;

  bekleyenler.delete(id);

  if (!onay) {
    return interaction.update({ content: `🚫 İptal edildi: ${ozet(kayit.eylem, kayit.parametreler)}`, components: [] }).catch(() => null);
  }

  await interaction.deferUpdate().catch(() => null);

  let sonuc;
  try {
    sonuc = await aiEylemiCalistir({
      eylem: kayit.eylem,
      parametreler: kayit.parametreler,
      guild: interaction.guild,
      channel: interaction.channel,
      member: interaction.member,
      client: interaction.client
    });
  } catch (err) {
    sonuc = { basarili: false, hata: err.message };
  }

  denetimKaydet({
    guildId: kayit.guildId,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    eylem: kayit.eylem,
    parametreler: kayit.parametreler,
    sonuc,
    onayli: true
  });

  const durum = sonuc.basarili
    ? `✅ Yapıldı: ${ozet(kayit.eylem, kayit.parametreler)}\n${String(sonuc.detay || '').slice(0, 1500)}`
    : `❌ Başarısız: ${ozet(kayit.eylem, kayit.parametreler)}\n${String(sonuc.hata || '').slice(0, 1500)}`;

  // Kanal silindiyse editReply de başarısız olabilir; sessizce geç
  return interaction.editReply({ content: durum, components: [] }).catch(() => null);
}
