import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

/**
 * Oyun panelleri için ortak "sıradaki adım" butonları. Bir sonucun altına
 * başka oyun komutlarını açan butonlar koyar; tıklayan kişi o komutu kendi
 * adına yazmış gibi yeni bir panel açar.
 */

export const GECIS_ONEK = 'kgit:';

/** Butonla açılabilen komutlar. `alt` alt komut gerektiren komutlar içindir. */
export const GECISLER = {
  gunluk: { etiket: 'Günlük', emoji: '🎁' },
  gorev: { etiket: 'Görevler', emoji: '📋' },
  zindan: { etiket: 'Zindan', emoji: '⚔️' },
  boss: { etiket: 'Boss', emoji: '👹' },
  kule: { etiket: 'Kule', emoji: '🗼' },
  balik: { etiket: 'Balık', emoji: '🎣' },
  bahce: { etiket: 'Bahçe', emoji: '🌱' },
  dojo: { etiket: 'Dojo', emoji: '🏯' },
  demirci: { etiket: 'Ocak', emoji: '🔥' },
  yoldas: { etiket: 'Yoldaş', emoji: '🐾', alt: 'bilgi' },
  envanter: { etiket: 'Envanter', emoji: '🎒' },
  basarim: { etiket: 'Başarımlar', emoji: '🏅' },
  bakiye: { etiket: 'Cüzdan', emoji: '💰' }
};

/**
 * En fazla 5 geçiş butonluk bir satır.
 * @param {...string} komutlar GECISLER anahtarları
 */
export function gecisSatiri(...komutlar) {
  const satir = new ActionRowBuilder();
  for (const ad of komutlar.filter(k => GECISLER[k]).slice(0, 5)) {
    const g = GECISLER[ad];
    satir.addComponents(new ButtonBuilder()
      .setCustomId(`${GECIS_ONEK}${ad}`)
      .setLabel(g.etiket)
      .setEmoji(g.emoji)
      .setStyle(ButtonStyle.Secondary));
  }
  return satir;
}

export const gecisButonuMu = id => typeof id === 'string' && id.startsWith(GECIS_ONEK);

/** Hiçbir seçeneği verilmemiş bir slash komutu gibi davranan seçenek nesnesi. */
function bosSecenekler(alt) {
  const yok = () => null;
  return {
    getSubcommand: () => alt ?? null,
    getSubcommandGroup: yok,
    getString: yok, getInteger: yok, getNumber: yok, getBoolean: yok,
    getUser: yok, getMember: yok, getChannel: yok, getRole: yok,
    getMentionable: yok, getAttachment: yok, getFocused: yok,
    get: yok, data: []
  };
}

/**
 * Geçiş butonunu hedef komutun `execute` fonksiyonuna yönlendirir. Buton etkileşimi
 * bir Proxy ile sarılır: yöntemler asıl etkileşime bağlanır, `options` ve
 * `commandName` komut çağrısı gibi görünür.
 */
export async function gecisButonunuIsle(interaction) {
  const ad = interaction.customId.slice(GECIS_ONEK.length);
  const g = GECISLER[ad];
  const komut = g && interaction.client.commands.get(ad);
  if (!komut) {
    return interaction.reply({ content: '❌ Bu panel artık açılamıyor.', flags: MessageFlags.Ephemeral });
  }
  const secenekler = bosSecenekler(g.alt);
  const sarili = new Proxy(interaction, {
    get(hedef, ozellik) {
      if (ozellik === 'options') return secenekler;
      if (ozellik === 'commandName') return ad;
      const deger = Reflect.get(hedef, ozellik, hedef);
      return typeof deger === 'function' ? deger.bind(hedef) : deger;
    }
  });
  return komut.execute(sarili);
}
