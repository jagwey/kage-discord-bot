import { tekGorev } from './tekGorev.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { haftayiKapat } from './klanSavasServisi.js';
import { cekilisYap } from './piyangoServisi.js';
import { turnuvaKapat } from './balikServisi.js';
import { baskinAyarGetir, baskinlariSurdur } from './baskinServisi.js';

// Haftalık klan savaşı kapanışı, piyango çekilişi ve yarıda kalan baskınlar.
// Servisler tembel çalışır (ilk komutta da kapanır); bu zamanlayıcı kimse oynamasa bile
// sonuçların zamanında açıklanmasını sağlar.
const KONTROL_ARALIGI_MS = 60 * 60 * 1000;

/** Sonuçları baskın kanalı ayarlı sunuculara duyurur. */
async function duyur(client, embed) {
  for (const guild of client.guilds.cache.values()) {
    const { kanalId } = baskinAyarGetir(guild.id);
    const kanal = kanalId ? guild.channels.cache.get(kanalId) : null;
    if (!kanal?.isTextBased()) continue;
    await kanal.send({ embeds: [embed] }).catch(err => console.warn(`[Etkinlik] ${guild.name} duyurusu:`, err.message));
  }
}

async function dmGonder(client, userId, icerik) {
  const user = await client.users.fetch(userId).catch(() => null);
  await user?.send(icerik).catch(() => null);
}

export async function haftalikSonuclariIsle(client, simdi = Date.now()) {
  const klan = haftayiKapat(simdi);
  if (klan) {
    const ilk = [...klan.odemeler].sort((a, b) => b.miktar - a.miktar).slice(0, 5)
      .map(o => `<@${o.uid}> +${o.miktar} Ryo`).join('\n');
    await duyur(client, kageEmbed({
      baslik: `KLAN SAVAŞI ŞAMPİYONU • ${klan.ad}`,
      renk: TEMA.RENKLER.ALTIN,
      aciklama: `**${klan.ad}** ${klan.hafta} haftasını **${klan.puan}** puanla kazandı!\n` +
        `Klan kasasına **${klan.kasaPayi} Ryo**, üyelere **${klan.havuz - klan.kasaPayi} Ryo** dağıtıldı.\n\n${ilk}`
    }));
  }

  const piyango = cekilisYap(simdi);
  if (piyango) {
    await duyur(client, kageEmbed({
      baslik: 'HAFTALIK PİYANGO ÇEKİLDİ',
      renk: TEMA.RENKLER.ALTIN,
      aciklama: `🎟️ Talih kuşu <@${piyango.kazanan}> başına kondu! **${piyango.ikramiye} Ryo** ikramiye.\n` +
        `${piyango.katilimci} katılımcı, ${piyango.biletSayisi} bilet. Kazananın bileti: ${piyango.kazananBilet}.`
    }));
    await dmGonder(client, piyango.kazanan, `🎟️ Haftalık piyangoyu kazandın! **${piyango.ikramiye} Ryo** cüzdanına yattı.`);
  }

  const balik = turnuvaKapat(simdi);
  if (balik) {
    const madalya = ['🥇', '🥈', '🥉'];
    await duyur(client, kageEmbed({
      baslik: 'BALIK TURNUVASI SONUÇLANDI',
      renk: TEMA.RENKLER.ALTIN,
      aciklama: `${balik.hafta} haftasının en ağır balıkları:\n\n` +
        balik.kazananlar.map((k, i) => `${madalya[i]} <@${k.uid}> **${k.kg} kg** (+${k.odul} Ryo)`).join('\n')
    }));
    for (const [i, k] of balik.kazananlar.entries()) {
      await dmGonder(client, k.uid, `🎣 Balık turnuvasında **${i + 1}.** oldun (${k.kg} kg)! **${k.odul} Ryo** cüzdanına yattı.`);
    }
  }
  return { klan, piyango, balik };
}

/** @param {import('discord.js').Client} client */
let baslatildi = false;
export function etkinlikServisiniBaslat(client) {
  if (baslatildi) return;
  baslatildi = true;
  baskinlariSurdur(client);
  const tur = tekGorev(() => haftalikSonuclariIsle(client), err => console.error('[Etkinlik]', err.message));
  setTimeout(tur, 45_000);
  setInterval(tur, KONTROL_ARALIGI_MS);
  console.log('[Etkinlik] klan savaşı, piyango ve baskın zamanlayıcıları devrede.');
}
