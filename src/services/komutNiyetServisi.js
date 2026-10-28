import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

/**
 * Doğal dille yazılan oyun ve ekonomi komutlarını yapay zekaya gitmeden yakalar.
 * "kage yoldaşımı besle" gibi bir mesaj küçük bir onay butonu açar; onaylanınca
 * gerçek slash komutunun execute fonksiyonu sahte bir etkileşimle çalıştırılır.
 * Tamamen yerel regex ile çalışır, büyük sunucularda API kotası harcamaz.
 */

const ONEK = 'kniyet:';
const BEKLEME_MS = 60_000;
const ISTEK_ARALIK_MS = 3000;
const EN_FAZLA_KELIME = 8;

const bekleyenler = new Map();
const sonIstek = new Map();
let sayac = 0;

const HARF = { ş: 's', ğ: 'g', ı: 'i', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };

export function niyetMetniNormalle(metin) {
  return String(metin || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[şğıüöçâîû]/g, h => HARF[h])
    .replace(/<[@#][!&]?\d+>/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const sayiBul = t => {
  const m = t.match(/\b(\d{1,9})\b/);
  return m ? Number(m[1]) : null;
};

// Soru soran ("zindan nasıl oynanır") komut değil sohbet ister; onu chatbota bırakırız.
const SORU = /\b(nasil|neden|nedir|niye|ne ise|nerede|kimdir|anlat|acikla)\b/;

const YOLDAS_TURU = [
  [/\b(kurt|golge kurdu)\b/, 'kurt'],
  [/\b(tilki|alev tilkisi)\b/, 'tilki'],
  [/\b(kuzgun|mistik kuzgun)\b/, 'kuzgun'],
  [/\b(ejder\w*|yesim ejderi)\b/, 'ejder']
];

const MALZEME_ADLARI = [
  [/\bdemir\w*\b/, 'demir'],
  [/\b(golge ?ozu|oz)\w*\b/, 'golge_ozu'],
  [/\bpul\w*\b/, 'pul'],
  [/\bmercan\w*\b/, 'mercan'],
  [/\bruh\w*\b/, 'ruh_tasi']
];

// Sıra önemli: daha özel desenler üstte.
const NIYETLER = [
  {
    desen: /\b(besle|doyur|mama ver|yemek ver)\b/,
    kur: () => ({ komut: 'yoldas', alt: 'besle', etiket: '🐺 Yoldaşını besleyeyim mi?' })
  },
  {
    desen: /\byoldas\w*\b.*\b(sec|al|sahiplen|edin)\w*\b|\b(sahiplen)\w*\b/,
    kur: t => {
      const tur = YOLDAS_TURU.find(([d]) => d.test(t))?.[1];
      if (!tur) return { komut: 'yoldas', alt: 'bilgi', etiket: '🐾 Yoldaş bilgini açayım mı?' };
      return { komut: 'yoldas', alt: 'sec', secenekler: { tur }, etiket: `🐾 Yoldaş olarak **${tur}** seçeyim mi?` };
    }
  },
  {
    desen: /\b(yoldas\w*|pet\w*)\b/,
    kur: () => ({ komut: 'yoldas', alt: 'bilgi', etiket: '🐾 Yoldaş bilgini açayım mı?' })
  },
  {
    desen: /\bgunluk\w*\b/,
    kur: () => ({ komut: 'gunluk', etiket: '🎁 Günlük ödülünü alayım mı?' })
  },
  {
    desen: /\b(balik\w*|olta\w*)\b/,
    kur: () => ({ komut: 'balik', etiket: '🎣 Oltayı atayım mı?' })
  },
  {
    desen: /\b(bahce\w*|tarla\w*|hasat\w*)\b/,
    kur: () => ({ komut: 'bahce', etiket: '🌱 Bahçeni açayım mı?' })
  },
  {
    desen: /\bzindan\w*\b/,
    kur: t => {
      if (/\bprofil\w*\b/.test(t)) return { komut: 'zindan', secenekler: { islem: 'profil' }, etiket: '🗝️ Zindan profilini açayım mı?' };
      if (/\b(sirala\w*|liderlik)\b/.test(t)) return { komut: 'zindan', secenekler: { islem: 'siralama' }, etiket: '🗝️ Zindan sıralamasını açayım mı?' };
      return { komut: 'zindan', secenekler: { islem: 'sefer' }, etiket: '🗝️ Zindana sefere çıkayım mı?' };
    }
  },
  {
    desen: /\b(boss\w*|patron\w*)\b/,
    kur: () => ({ komut: 'boss', etiket: '👹 Boss savaşını açayım mı?' })
  },
  {
    desen: /\bkule\w*\b/,
    kur: () => ({ komut: 'kule', etiket: '🗼 Kuleye tırmanayım mı?' })
  },
  {
    desen: /\b(dojo\w*|antrenman\w*|idman\w*)\b/,
    kur: () => ({ komut: 'dojo', etiket: '🥋 Dojoya gireyim mi?' })
  },
  {
    desen: /\b(demirci\w*|silah\w*|kilic\w* (gelistir|yukselt|bile))\b/,
    kur: () => ({ komut: 'demirci', etiket: '⚒️ Demirciyi açayım mı?' })
  },
  {
    desen: /\bslot\w*\b/,
    kur: t => {
      const bahis = sayiBul(t) || 100;
      return { komut: 'slot', secenekler: { bahis }, etiket: `🎰 **${bahis}** Ryo ile slot çevireyim mi?` };
    }
  },
  {
    desen: /\b(blackjack|bj|yirmi bir|21 oyna)\b/,
    kur: t => {
      const bahis = sayiBul(t.replace(/\b21\b/, ' ')) || 100;
      return { komut: 'blackjack', secenekler: { bahis }, etiket: `🃏 **${bahis}** Ryo ile blackjack açayım mı?` };
    }
  },
  {
    desen: /\b(yazi ?tura|yazitura|para at|jeton at)\b/,
    kur: t => {
      const kalan = t.replace(/\b(yazi ?tura|yazitura)\b/g, ' ');
      const secim = /\btura\b/.test(kalan) ? 'tura' : 'yazi';
      const bahis = sayiBul(kalan) || 100;
      return { komut: 'yazitura', secenekler: { bahis, secim }, etiket: `🪙 **${bahis}** Ryo, **${secim}** diyorum. Atayım mı?` };
    }
  },
  {
    desen: /\b(kehanet\w*|fal\w*|falim\w*|sansim\w*)\b/,
    kur: () => ({ komut: 'kehanet', etiket: '🔮 Bugünün kehanetine bakayım mı?' })
  },
  {
    desen: /\bgorev\w*\b/,
    kur: () => ({ komut: 'gorev', etiket: '📜 Günlük görevlerini göstereyim mi?' })
  },
  {
    desen: /\bduello\w*\b/,
    kur: (t, ctx) => {
      const rakip = ctx.etiketlenenler[0];
      if (!rakip) return null;
      const bahis = sayiBul(t);
      return {
        komut: 'duello',
        secenekler: { rakip, ...(bahis ? { bahis } : {}) },
        etiket: `⚔️ ${rakip} ile${bahis ? ` **${bahis}** Ryo'ya` : ''} düello açayım mı?`
      };
    }
  },
  {
    desen: /\b(ode|gonder|yolla|transfer)\w*\b/,
    kur: (t, ctx) => {
      const alici = ctx.etiketlenenler[0];
      const miktar = sayiBul(t);
      if (!alici || !miktar) return null;
      return {
        komut: 'ode',
        secenekler: { alici, miktar },
        etiket: `💸 ${alici} kişisine **${miktar}** Ryo göndereyim mi?`
      };
    }
  },
  {
    desen: /\bklan\w*\b/,
    kur: (t, ctx) => {
      const isim = ctx.hamMetin.replace(/^.*?\bklan\w*\s+\S+\s*/iu, '').trim().slice(0, 32);
      if (/\bsavas\w*\b/.test(t)) return { komut: 'klan', alt: 'savas', etiket: '⚔️ Klan savaşı tablosunu açayım mı?' };
      if (/\b(bagis|bagisla|yatir)\w*\b/.test(t)) {
        const miktar = sayiBul(t);
        if (!miktar) return null;
        return { komut: 'klan', alt: 'bagis', secenekler: { miktar }, etiket: `🏯 Klana **${miktar}** Ryo bağışlayayım mı?` };
      }
      if (/\b(kur|olustur|ac)\b/.test(t) && isim) {
        return { komut: 'klan', alt: 'kur', secenekler: { isim }, etiket: `🏯 **${isim}** klanını kurayım mı? (2500 Ryo)` };
      }
      if (/\b(katil|gir)\w*\b/.test(t) && isim) {
        return { komut: 'klan', alt: 'katil', secenekler: { isim }, etiket: `🏯 **${isim}** klanına katılayım mı?` };
      }
      if (/\b(ayril|cik)\w*\b/.test(t)) return { komut: 'klan', alt: 'ayril', etiket: '🏯 Klandan ayrılayım mı?' };
      if (/\b(sirala\w*|liderlik|top)\b/.test(t)) return { komut: 'klan', alt: 'liderlik', etiket: '🏯 Klan sıralamasını açayım mı?' };
      return { komut: 'klan', alt: 'bilgi', etiket: '🏯 Klan bilgini açayım mı?' };
    }
  },
  {
    desen: /\b(seviye\w*|level\w*|rank\w*|xp)\b/,
    kur: (t, ctx) => {
      if (/\b(sirala\w*|liderlik|top)\b/.test(t)) return { komut: 'seviye', alt: 'siralama', etiket: '📈 Seviye sıralamasını açayım mı?' };
      const uye = ctx.etiketlenenler[0];
      return { komut: 'seviye', alt: 'bak', secenekler: uye ? { uye } : {}, etiket: `📈 ${uye ? `${uye} için` : 'Senin'} seviyeye bakayım mı?` };
    }
  },
  {
    desen: /\b(liderlik\w*|zenginler|siralama\w*|top ?10)\b/,
    kur: () => ({ komut: 'liderlik', etiket: '🏆 Liderlik tablosunu açayım mı?' })
  },
  {
    desen: /\b(bakiye\w*|param\w*|cuzdan\w*|kac ryo\w*|ne kadar ryo\w*)\b/,
    kur: (t, ctx) => {
      const kullanici = ctx.etiketlenenler[0];
      return { komut: 'bakiye', secenekler: kullanici ? { kullanici } : {}, etiket: `💰 ${kullanici ? `${kullanici} bakiyesine` : 'Bakiyene'} bakayım mı?` };
    }
  },
  {
    desen: /\b(envanter\w*|canta\w*|esyalar\w*)\b/,
    kur: (t, ctx) => {
      const kullanici = ctx.etiketlenenler[0];
      return { komut: 'envanter', secenekler: kullanici ? { kullanici } : {}, etiket: '🎒 Envanteri açayım mı?' };
    }
  },
  {
    desen: /\bkara ?borsa\w*\b/,
    kur: () => ({ komut: 'karaborsa', alt: 'bak', etiket: '🏮 Kara borsayı açayım mı?' })
  },
  {
    desen: /\bpiyango\w*\b/,
    kur: t => {
      const adet = Math.min(50, sayiBul(t) || 0);
      if (adet && /\bbilet\w*\b/.test(t)) return { komut: 'piyango', alt: 'bilet', secenekler: { adet }, etiket: `🎟️ **${adet}** piyango bileti alayım mı?` };
      return { komut: 'piyango', alt: 'durum', etiket: '🎟️ Piyango durumunu göstereyim mi?' };
    }
  },
  {
    desen: /\b(basarim\w*|rozet\w*)\b/,
    kur: () => ({ komut: 'basarim', etiket: '🏅 Başarımlarını göstereyim mi?' })
  },
  {
    desen: /\bbaskin\w*\b/,
    kur: () => ({ komut: 'baskin', alt: 'bilgi', etiket: '🛡️ Baskın bilgisini açayım mı?' })
  },
  {
    desen: /\b(zanaat\w*|craft\w*)\b/,
    kur: t => (/\btarif\w*\b/.test(t)
      ? { komut: 'zanaat', alt: 'tarifler', etiket: '⚒️ Tarifleri göstereyim mi?' }
      : { komut: 'zanaat', alt: 'canta', etiket: '🧰 Zanaat çantanı açayım mı?' })
  },
  {
    desen: /\b(market\w*|dukkan\w*|magaza\w*)\b/,
    kur: () => ({ komut: 'market', etiket: '🏪 Marketi açayım mı?' })
  },
  {
    desen: /\bhafizam\b/,
    kur: () => ({ komut: 'hafizam', etiket: '🧠 Hafıza parşömenini açayım mı?' })
  },
  {
    desen: /\bprofil\w*\b/,
    kur: () => ({ komut: 'profil', etiket: '🪪 Profilini açayım mı?' })
  },
  {
    desen: /\bdogum gun\w*\b/,
    kur: () => ({ komut: 'dogum-gunu', alt: 'yaklasan', etiket: '🎂 Yaklaşan doğum günlerini göstereyim mi?' })
  },
  {
    desen: /\b(rastgele|random) manga\b|\bmanga oner\w*\b/,
    kur: () => ({ komut: 'rastgele-manga', etiket: '📚 Rastgele bir manga önereyim mi?' })
  },
  {
    desen: /^manga\b/,
    kur: (t, ctx) => {
      const isim = ctx.hamMetin.replace(/^\s*manga\w*\s*/iu, '').trim().slice(0, 100);
      if (!isim) return { komut: 'rastgele-manga', etiket: '📚 Rastgele bir manga önereyim mi?' };
      return { komut: 'manga', secenekler: { isim }, etiket: `📚 **${isim}** mangasını arayayım mı?` };
    }
  },
  {
    desen: /\b(indie oyun\w*|devlog)\b/,
    kur: () => ({ komut: 'oyun', etiket: '🎮 Kage 95 indie oyun dosyasını açayım mı?' })
  },
  {
    desen: /\b(komutlar\w*|yardim|kisa komut\w*)\b/,
    kur: () => ({ kilavuz: true })
  }
];

/*
 * Kısa komutlar: "k yt 100", "k slot 50", "k g". Önek "k" ya da "kage".
 * İlk ad Türkçe asıl addır; OwO alışkanlığı olanlar için İngilizce adlar da çalışır.
 * Kısa komut yazan ne istediğini bildiği için onay sorulmadan hemen çalışır.
 */
const bahisVeSecim = arg => {
  const secim = /\b(t|tura)\b/.test(arg) ? 'tura' : 'yazi';
  return { bahis: sayiBul(arg) || 100, secim };
};
const kimse = ctx => ctx.etiketlenenler[0];

const KISA_KOMUTLAR = [
  { adlar: ['yt', 'yazitura', 'cf', 'coinflip'], ozet: 'yt 100 t', aciklama: 'yazı tura', kur: arg => ({ komut: 'yazitura', secenekler: bahisVeSecim(arg) }) },
  { adlar: ['slot', 's', 'slots'], ozet: 'slot 100', aciklama: 'slot', kur: arg => ({ komut: 'slot', secenekler: { bahis: sayiBul(arg) || 100 } }) },
  { adlar: ['bj', 'blackjack'], ozet: 'bj 100', aciklama: 'blackjack', kur: arg => ({ komut: 'blackjack', secenekler: { bahis: sayiBul(arg) || 100 } }) },
  { adlar: ['g', 'gunluk', 'd', 'daily'], ozet: 'g', aciklama: 'günlük ödül', kur: () => ({ komut: 'gunluk' }) },
  { adlar: ['b', 'balik', 'olta', 'h', 'hunt', 'fish'], ozet: 'b', aciklama: 'balık tut', kur: () => ({ komut: 'balik' }) },
  { adlar: ['bahce', 'tarla', 'farm'], ozet: 'bahce', aciklama: 'bahçeni aç', kur: () => ({ komut: 'bahce' }) },
  {
    adlar: ['z', 'zindan', 'sefer', 'dungeon'], ozet: 'z', aciklama: 'zindan seferi', kur: arg => ({
      komut: 'zindan',
      secenekler: { islem: /\bprofil|\bp\b/.test(arg) ? 'profil' : /\b(top|sira)/.test(arg) ? 'siralama' : 'sefer' }
    })
  },
  { adlar: ['boss', 'bs'], ozet: 'boss', aciklama: 'sunucu bossu', kur: () => ({ komut: 'boss' }) },
  { adlar: ['kule', 'tower'], ozet: 'kule', aciklama: 'kule', kur: () => ({ komut: 'kule' }) },
  { adlar: ['dojo', 'train'], ozet: 'dojo', aciklama: 'dojo', kur: () => ({ komut: 'dojo' }) },
  { adlar: ['demirci', 'forge', 'smith'], ozet: 'demirci', aciklama: 'demirci', kur: () => ({ komut: 'demirci' }) },
  { adlar: ['fal', 'pray', 'kehanet'], ozet: 'fal', aciklama: 'günlük kehanet', kur: () => ({ komut: 'kehanet' }) },
  { adlar: ['gorev', 'q', 'quest'], ozet: 'gorev', aciklama: 'görevler', kur: () => ({ komut: 'gorev' }) },
  { adlar: ['para', 'bakiye', 'cuzdan', 'cash', 'bal'], ozet: 'para', aciklama: 'bakiye', kur: (arg, ctx) => ({ komut: 'bakiye', secenekler: kimse(ctx) ? { kullanici: kimse(ctx) } : {} }) },
  {
    adlar: ['ver', 'ode', 'give'], ozet: 'ver @üye 500', aciklama: 'Ryo gönder', kur: (arg, ctx) => {
      const miktar = sayiBul(arg);
      return kimse(ctx) && miktar ? { komut: 'ode', secenekler: { alici: kimse(ctx), miktar } } : { eksik: 'ver @üye 500' };
    }
  },
  {
    adlar: ['duello', 'vs', 'duel'], ozet: 'duello @üye 100', aciklama: 'düello', kur: (arg, ctx) => {
      if (!kimse(ctx)) return { eksik: 'duello @üye 100' };
      const bahis = sayiBul(arg);
      return { komut: 'duello', secenekler: { rakip: kimse(ctx), ...(bahis ? { bahis } : {}) } };
    }
  },
  { adlar: ['p', 'profil', 'profile'], ozet: 'p', aciklama: 'profil', kur: () => ({ komut: 'profil' }) },
  { adlar: ['canta', 'envanter', 'inv', 'i'], ozet: 'canta', aciklama: 'envanter', kur: (arg, ctx) => ({ komut: 'envanter', secenekler: kimse(ctx) ? { kullanici: kimse(ctx) } : {} }) },
  { adlar: ['seviye', 'xp', 'lvl', 'level'], ozet: 'seviye', aciklama: 'seviye', kur: (arg, ctx) => (/\btop\b/.test(arg) ? { komut: 'seviye', alt: 'siralama' } : { komut: 'seviye', alt: 'bak', secenekler: kimse(ctx) ? { uye: kimse(ctx) } : {} }) },
  { adlar: ['sira', 'zenginler', 'liderlik', 'top', 'lb'], ozet: 'sira', aciklama: 'zenginler', kur: () => ({ komut: 'liderlik' }) },
  { adlar: ['market', 'dukkan', 'shop'], ozet: 'market', aciklama: 'market', kur: () => ({ komut: 'market' }) },
  { adlar: ['besle', 'feed'], ozet: 'besle', aciklama: 'yoldaşı besle', kur: () => ({ komut: 'yoldas', alt: 'besle' }) },
  {
    adlar: ['yoldas', 'pet', 'zoo'], ozet: 'yoldas', aciklama: 'yoldaş', kur: arg => {
      if (/\b(feed|besle)\b/.test(arg)) return { komut: 'yoldas', alt: 'besle' };
      const tur = YOLDAS_TURU.find(([d]) => d.test(arg))?.[1];
      return tur ? { komut: 'yoldas', alt: 'sec', secenekler: { tur } } : { komut: 'yoldas', alt: 'bilgi' };
    }
  },
  {
    adlar: ['klan', 'clan'], ozet: 'klan', aciklama: 'klan', kur: (arg, ctx) => {
      const [alt, ...geri] = ctx.hamArg.split(/\s+/);
      const a = niyetMetniNormalle(alt);
      const isim = geri.join(' ').trim().slice(0, 32);
      if (['bagis', 'bagisla', 'donate'].includes(a)) return sayiBul(arg) ? { komut: 'klan', alt: 'bagis', secenekler: { miktar: sayiBul(arg) } } : { eksik: 'klan bagis 500' };
      if (['kur', 'create'].includes(a)) return isim ? { komut: 'klan', alt: 'kur', secenekler: { isim } } : { eksik: 'klan kur İsim' };
      if (['katil', 'join'].includes(a)) return isim ? { komut: 'klan', alt: 'katil', secenekler: { isim } } : { eksik: 'klan katil İsim' };
      if (['ayril', 'leave'].includes(a)) return { komut: 'klan', alt: 'ayril' };
      if (['top', 'liderlik'].includes(a)) return { komut: 'klan', alt: 'liderlik' };
      if (['savas', 'war'].includes(a)) return { komut: 'klan', alt: 'savas' };
      return { komut: 'klan', alt: 'bilgi', secenekler: isim || (a && !['bilgi', 'info'].includes(a)) ? { isim: (alt + ' ' + isim).trim() } : {} };
    }
  },
  {
    adlar: ['zanaat', 'zn', 'craft'], ozet: 'zanaat', aciklama: 'zanaat çantası', kur: arg => (
      /\b(tarif|recipe)/.test(arg) ? { komut: 'zanaat', alt: 'tarifler' } : { komut: 'zanaat', alt: 'canta' })
  },
  {
    adlar: ['kb', 'karaborsa', 'borsa'], ozet: 'kb', aciklama: 'kara borsa', kur: arg => {
      const islem = /\b(al|buy)\b/.test(arg) ? 'al' : /\b(sat|sell)\b/.test(arg) ? 'sat' : null;
      if (!islem) return { komut: 'karaborsa', alt: 'bak' };
      const malzeme = MALZEME_ADLARI.find(([d]) => d.test(arg))?.[1];
      if (!malzeme) return { eksik: `kb ${islem} demir 5` };
      return { komut: 'karaborsa', alt: islem, secenekler: { malzeme, adet: Math.min(50, sayiBul(arg) || 1) } };
    }
  },
  {
    adlar: ['piyango', 'bilet', 'lottery'], ozet: 'piyango 5', aciklama: 'piyango bileti', kur: arg => {
      const adet = sayiBul(arg);
      return adet ? { komut: 'piyango', alt: 'bilet', secenekler: { adet: Math.min(50, adet) } } : { komut: 'piyango', alt: 'durum' };
    }
  },
  { adlar: ['rozet', 'basarim', 'ach'], ozet: 'rozet', aciklama: 'başarımlar', kur: (arg, ctx) => ({ komut: 'basarim', secenekler: kimse(ctx) ? { uye: kimse(ctx) } : {} }) },
  { adlar: ['baskin', 'raid'], ozet: 'baskin', aciklama: 'gölge baskını', kur: () => ({ komut: 'baskin', alt: 'bilgi' }) },
  {
    adlar: ['manga', 'm'], ozet: 'm naruto', aciklama: 'manga ara', kur: (arg, ctx) => (ctx.hamArg ? { komut: 'manga', secenekler: { isim: ctx.hamArg.slice(0, 100) } } : { komut: 'rastgele-manga' })
  },
  { adlar: ['rm', 'rmanga'], ozet: 'rm', aciklama: 'rastgele manga', kur: () => ({ komut: 'rastgele-manga' }) },
  { adlar: ['dg', 'dogumgunu', 'bday'], ozet: 'dg', aciklama: 'yaklaşan doğum günleri', kur: () => ({ komut: 'dogum-gunu', alt: 'yaklasan' }) },
  { adlar: ['yardim', 'komutlar', 'kmt', 'help'], ozet: 'yardim', aciklama: 'bu liste', kur: () => ({ kilavuz: true }) }
];

const KISA_HARITA = new Map(KISA_KOMUTLAR.flatMap(k => k.adlar.map(ad => [ad, k])));

/** Yapay zekanın ve chatbotun kullanıcıya önerebileceği tek satırlık özet. */
export const KISA_KOMUT_OZETI = 'Kısa komutlar ("k" ya da "kage" ile): ' +
  KISA_KOMUTLAR.map(k => `k ${k.ozet} (${k.aciklama})`).join(', ') +
  '. Uzun hali slash komutlarıdır; "kage yoldaşımı besle" gibi düz cümle de onay butonuyla çalışır.';

export function kisaKomutKilavuzu() {
  const satirlar = KISA_KOMUTLAR.map(k => {
    const diger = k.adlar.filter(ad => !k.ozet.startsWith(ad + ' ') && ad !== k.ozet);
    return `\`k ${k.ozet}\` ${k.aciklama}${diger.length ? ` • ${diger.join(', ')}` : ''}`;
  });
  return `⚡ **Kısa komutlar**: başına \`k\` ya da \`kage\` yaz\n${satirlar.join('\n')}\n` +
    '-# düz cümle de olur: "kage yoldaşımı besle", "kage 200 ryo slot". slash komutları da aynen duruyor.';
}

function mesafe(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Yan yana harf kayması ("cf" yerine "fc") tek hata sayılır.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Yanlış yazılmış kısa komuta en yakın adı bulur ("cg" -> "cf"). */
export function kisaKomutTahmini(kelime) {
  const k = niyetMetniNormalle(kelime);
  if (k.length < 2) return null;
  const sinir = k.length >= 5 ? 2 : 1;
  let enIyi = null;
  for (const ad of KISA_HARITA.keys()) {
    if (ad.length < 2) continue;
    const m = mesafe(k, ad);
    if (m <= sinir && (!enIyi || m < enIyi.m)) enIyi = { ad, m };
  }
  return enIyi?.ad || null;
}

/**
 * Metin bir kısa komutla başlıyorsa niyet döner, başlamıyorsa null.
 * @param {string} hamMetin önekten sonraki metin, örn. "cf 100 t"
 */
export function kisaKomutBul(hamMetin, ctx = {}) {
  const ham = String(hamMetin || '').trim();
  const [ilk, ...geri] = ham.split(/\s+/);
  const tanim = KISA_HARITA.get(niyetMetniNormalle(ilk));
  if (!tanim) return null;
  const hamArg = geri.join(' ').replace(/<[@#][!&]?\d+>/g, ' ').replace(/\s+/g, ' ').trim();
  return tanim.kur(niyetMetniNormalle(geri.join(' ')), { etiketlenenler: [], ...ctx, hamArg });
}

const komutAdi = n => `/${n.komut}${n.alt ? ` ${n.alt}` : ''}`;

function niyetEtiketi(n) {
  const s = n.secenekler || {};
  const parca = Object.entries(s).map(([k, v]) => `${k}: ${v?.username ?? v}`).join(', ');
  return `${komutAdi(n)}${parca ? ` (${parca})` : ''}`;
}

/**
 * Metinde bilinen bir komut niyeti varsa {komut, alt, secenekler, etiket} döner.
 * @param {string} hamMetin "kage" önekinden sonraki metin
 * @param {{ etiketlenenler?: import('discord.js').User[] }} ctx
 */
export function komutNiyetiBul(hamMetin, ctx = {}) {
  const t = niyetMetniNormalle(hamMetin);
  if (!t || t.split(' ').length > EN_FAZLA_KELIME || SORU.test(t)) return null;
  const tamCtx = { etiketlenenler: [], ...ctx, hamMetin: String(hamMetin || '') };
  for (const niyet of NIYETLER) {
    if (!niyet.desen.test(t)) continue;
    const sonuc = niyet.kur(t, tamCtx);
    if (sonuc) return sonuc;
  }
  return null;
}

function cokHizliMi(userId) {
  const simdi = Date.now();
  if (simdi - (sonIstek.get(userId) || 0) < ISTEK_ARALIK_MS) return true;
  sonIstek.set(userId, simdi);
  return false;
}

const etiketlenenleriAl = message => {
  const botId = message.client.user.id;
  return [...message.mentions.users.values()].filter(u => u.id !== botId && !u.bot);
};

async function onayIste(message, niyet, metin) {
  const id = (++sayac).toString(36);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${ONEK}ok:${id}`).setLabel('Onayla').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${ONEK}no:${id}`).setLabel('Vazgeç').setStyle(ButtonStyle.Secondary)
  );
  const onayMesaji = await message.reply({
    content: `${metin}\n-# ${niyetEtiketi(niyet)} • 60 sn geçerli`,
    components: [row],
    allowedMentions: { parse: [], repliedUser: false }
  }).catch(() => null);
  if (!onayMesaji) return;

  bekleyenler.set(id, { ...niyet, etiket: metin, sahipId: message.author.id });
  setTimeout(() => {
    if (!bekleyenler.delete(id)) return;
    onayMesaji.edit({ content: `~~${metin}~~\n-# süre doldu`, components: [] }).catch(() => null);
  }, BEKLEME_MS).unref?.();
}

async function kilavuzGonder(message) {
  return message.reply({ content: kisaKomutKilavuzu(), allowedMentions: { parse: [], repliedUser: false } }).catch(() => null);
}

/**
 * Kısa komutu yakalar ve onaysız çalıştırır.
 * Kısa komut değilse ve tahminGoster açıksa yakın bir komut için "bunu mu demek istedin" sorar.
 * @returns {Promise<boolean>} mesaj işlendiyse true
 */
export async function kisaKomutuIsle(message, metin, { tahminGoster = true } = {}) {
  const niyet = kisaKomutBul(metin, { etiketlenenler: etiketlenenleriAl(message) });

  if (!niyet) {
    if (!tahminGoster) return false;
    const ilk = String(metin || '').trim().split(/\s+/)[0];
    const tahmin = kisaKomutTahmini(ilk);
    if (!tahmin) return false;
    if (cokHizliMi(message.author.id)) return true;
    const duzeltilmis = [tahmin, ...String(metin).trim().split(/\s+/).slice(1)].join(' ');
    const tahminNiyet = kisaKomutBul(duzeltilmis, { etiketlenenler: etiketlenenleriAl(message) });
    if (!tahminNiyet || tahminNiyet.eksik || tahminNiyet.kilavuz) {
      await message.reply({ content: `\`${ilk}\` diye bir komutum yok. **\`k ${tahmin}\`** mı demek istedin?\n-# tüm liste: \`k yardim\``, allowedMentions: { parse: [], repliedUser: false } }).catch(() => null);
      return true;
    }
    await onayIste(message, tahminNiyet, `🤔 \`${ilk}\` yok. **\`k ${duzeltilmis}\`** mı demek istedin?`);
    return true;
  }

  if (cokHizliMi(message.author.id)) return true;
  if (niyet.kilavuz) {
    await kilavuzGonder(message);
    return true;
  }
  if (niyet.eksik) {
    await message.reply({ content: `eksik yazdın, şöyle dene: \`k ${niyet.eksik}\``, allowedMentions: { parse: [], repliedUser: false } }).catch(() => null);
    return true;
  }
  await mesajdanCalistir(message, niyet);
  return true;
}

/**
 * Düz cümlede komut niyeti varsa onay butonu gönderir ve true döner.
 * @param {import('discord.js').Message} message
 * @param {string} metin "kage" önekinden sonraki metin
 */
export async function komutNiyetiniIsle(message, metin) {
  const niyet = komutNiyetiBul(metin, { etiketlenenler: etiketlenenleriAl(message) });
  if (!niyet) return false;
  if (cokHizliMi(message.author.id)) return true;
  if (niyet.kilavuz) {
    await kilavuzGonder(message);
    return true;
  }
  if (!message.client.commands?.has(niyet.komut)) return false;
  await onayIste(message, niyet, niyet.etiket);
  return true;
}

export const komutNiyetButonuMu = customId => customId?.startsWith(ONEK);

function secenekNesnesi(niyet, guild) {
  const sec = niyet.secenekler || {};
  const deger = ad => (sec[ad] === undefined ? null : sec[ad]);
  return {
    data: [],
    getSubcommand: (zorunlu = true) => {
      if (niyet.alt) return niyet.alt;
      if (zorunlu) throw new Error('Alt komut yok');
      return null;
    },
    getSubcommandGroup: () => null,
    getString: deger,
    getInteger: deger,
    getNumber: deger,
    getBoolean: deger,
    getUser: deger,
    getMember: ad => (sec[ad] ? guild?.members.cache.get(sec[ad].id) ?? null : null),
    getChannel: deger,
    getRole: deger,
    getAttachment: () => null,
    getMentionable: deger,
    getFocused: () => '',
    get: ad => (sec[ad] === undefined ? null : { name: ad, value: sec[ad]?.id ?? sec[ad] })
  };
}

/**
 * Buton etkileşimini, slash komutunun beklediği arayüze benzetir.
 * reply, deferReply, editReply, user, member, guild gibi alanlar gerçek etkileşimden gelir.
 */
function butondanKomutEtkilesimi(buton, niyet) {
  const options = secenekNesnesi(niyet, buton.guild);
  return new Proxy(buton, {
    get(hedef, ozellik) {
      if (ozellik === 'options') return options;
      if (ozellik === 'commandName') return niyet.komut;
      if (ozellik === 'isChatInputCommand' || ozellik === 'isCommand') return () => true;
      if (ozellik === 'isButton' || ozellik === 'isMessageComponent') return () => false;
      // Buton etkileşiminin reply() sonucu InteractionResponse olur; komutların collector'ı
      // mesaja bağlanabilsin diye her zaman gerçek mesajı döndür.
      if (ozellik === 'reply') {
        return async girdi => {
          const veri = typeof girdi === 'string' ? { content: girdi } : { ...(girdi || {}) };
          const istedi = veri.withResponse;
          delete veri.fetchReply;
          veri.withResponse = true;
          const yanit = await hedef.reply(veri);
          return istedi ? yanit : (yanit.resource?.message ?? yanit);
        };
      }
      const v = Reflect.get(hedef, ozellik, hedef);
      return typeof v === 'function' ? v.bind(hedef) : v;
    }
  });
}

const GIZLI_SILME_MS = 20_000;

/**
 * Düz mesajı slash komut etkileşimi gibi gösterir; cevaplar mesaja yanıt olarak gider.
 * Gizli (ephemeral) cevaplar kanalda görünür ama 20 sn sonra silinir.
 */
function mesajdanKomutEtkilesimi(message, niyet) {
  let yanitMesaji = null;
  let replied = false;
  let deferred = false;
  let ertelenenGizli = false;

  const hazirla = (girdi, varsayilanGizli = false) => {
    const veri = typeof girdi === 'string' ? { content: girdi } : { ...(girdi || {}) };
    const f = veri.flags;
    const gizli = varsayilanGizli || veri.ephemeral === true ||
      (f != null && (Array.isArray(f) ? f.includes(MessageFlags.Ephemeral) : (Number(f) & MessageFlags.Ephemeral) !== 0));
    delete veri.flags;
    delete veri.ephemeral;
    delete veri.fetchReply;
    const withResponse = veri.withResponse;
    delete veri.withResponse;
    veri.allowedMentions ??= { parse: ['users'], repliedUser: false };
    return { veri, gizli, withResponse };
  };
  const gizliyseSil = (m, gizli) => {
    if (gizli && m) setTimeout(() => m.delete().catch(() => null), GIZLI_SILME_MS).unref?.();
    return m;
  };
  const sonuc = (m, withResponse) => (withResponse ? { resource: { message: m } } : m);

  return {
    id: message.id,
    type: 2,
    applicationId: message.client.user.id,
    commandName: niyet.komut,
    options: secenekNesnesi(niyet, message.guild),
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guildId,
    channel: message.channel,
    channelId: message.channelId,
    client: message.client,
    memberPermissions: message.member?.permissions ?? null,
    createdTimestamp: message.createdTimestamp,
    createdAt: message.createdAt,
    locale: 'tr',
    guildLocale: message.guild?.preferredLocale,
    get replied() { return replied; },
    get deferred() { return deferred; },
    isChatInputCommand: () => true,
    isCommand: () => true,
    isRepliable: () => true,
    isButton: () => false,
    isMessageComponent: () => false,
    isModalSubmit: () => false,
    isAutocomplete: () => false,
    inGuild: () => true,
    async reply(girdi) {
      const { veri, gizli, withResponse } = hazirla(girdi);
      yanitMesaji = await message.reply(veri);
      replied = true;
      return sonuc(gizliyseSil(yanitMesaji, gizli), withResponse);
    },
    async deferReply(girdi) {
      deferred = true;
      ertelenenGizli = hazirla(girdi).gizli;
      await message.channel.sendTyping().catch(() => null);
    },
    async editReply(girdi) {
      const { veri, withResponse } = hazirla(girdi);
      if (yanitMesaji) return sonuc(await yanitMesaji.edit(veri), withResponse);
      yanitMesaji = await message.reply(veri);
      replied = true;
      return sonuc(gizliyseSil(yanitMesaji, ertelenenGizli), withResponse);
    },
    async fetchReply() { return yanitMesaji; },
    async deleteReply() { await yanitMesaji?.delete().catch(() => null); },
    async followUp(girdi) {
      const { veri, gizli } = hazirla(girdi);
      return gizliyseSil(await message.channel.send(veri), gizli);
    },
    async showModal() {
      throw new Error('Bu komut form açıyor; slash komutuyla kullan.');
    }
  };
}

async function mesajdanCalistir(message, niyet) {
  const komut = message.client.commands?.get(niyet.komut);
  if (!komut) return;
  try {
    await komut.execute(mesajdanKomutEtkilesimi(message, niyet));
  } catch (err) {
    console.error(`[KisaKomut] ${komutAdi(niyet)} hatası:`, err.message);
    await message.reply({ content: `❌ olmadı, \`${komutAdi(niyet)}\` ile dene.`, allowedMentions: { repliedUser: false } }).catch(() => null);
  }
}

/** @param {import('discord.js').ButtonInteraction} interaction */
export async function komutNiyetButonunuIsle(interaction) {
  const [, eylem, id] = interaction.customId.split(':');
  const niyet = bekleyenler.get(id);

  if (!niyet) {
    return interaction.reply({ content: 'bu onayın süresi doldu, tekrar yaz.', flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  if (interaction.user.id !== niyet.sahipId) {
    return interaction.reply({ content: 'bu onay sana ait değil, samuray.', flags: MessageFlags.Ephemeral }).catch(() => null);
  }
  bekleyenler.delete(id);

  if (eylem !== 'ok') {
    return interaction.update({ content: `~~${niyet.etiket}~~\n-# vazgeçildi`, components: [] }).catch(() => null);
  }

  const komut = interaction.client.commands.get(niyet.komut);
  if (!komut) {
    return interaction.reply({ content: 'bu komut artık yok.', flags: MessageFlags.Ephemeral }).catch(() => null);
  }

  try {
    await komut.execute(butondanKomutEtkilesimi(interaction, niyet));
    // Komut kendi cevabını yeni mesaj olarak gönderdi; onay mesajı artık gereksiz.
    await interaction.message.delete().catch(() => null);
  } catch (err) {
    console.error(`[KomutNiyet] ${komutAdi(niyet)} hatası:`, err.message);
    const yanit = { content: '❌ Bu işlem şu an yapılamadı.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) return interaction.followUp(yanit).catch(() => null);
    return interaction.reply(yanit).catch(() => null);
  }
}

