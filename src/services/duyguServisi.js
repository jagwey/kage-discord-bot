// Mesajlardan duygu cikarimi: hafif, kural tabanli, her mesajda calisabilecek kadar hizli.
// Sonuc hem Gemini'ye ipucu olarak verilir hem de kural tabanli chatbotun sticker secimini yonlendirir.

const STICKER_HARITASI = {
  sevinc: 'zafer',
  heyecan: 'zafer',
  gurur: 'zafer',
  sevgi: 'sevgi',
  minnet: 'sevgi',
  uzuntu: 'dusunce',
  yalnizlik: 'dusunce',
  endise: 'dusunce',
  korku: 'dusunce',
  merak: 'dusunce',
  saskinlik: 'dusunce',
  ofke: 'ofke',
  sikinti: 'ofke',
  sinir: 'ofke',
  rekabet: 'savas',
  eglence: 'cay',
  sakin: 'cay',
  para: 'para'
};

const TON_ONERISI = {
  sevinc: 'Kullanici mutlu; sen de neseli ve sicak ol, sevincini paylas.',
  heyecan: 'Kullanici heyecanli; enerjik ve canli cevap ver.',
  gurur: 'Kullanici basari yasadi; samimiyetle tebrik et.',
  sevgi: 'Kullanici sicak ve sevgi dolu; yumusak ve icten karsilik ver.',
  minnet: 'Kullanici tesekkur ediyor; mutlulukla karsilik ver.',
  uzuntu: 'Kullanici uzgun; sakin, yumusak ve teselli edici ol, sakin sakin dinle, saka yapma, cozum dayatma.',
  yalnizlik: 'Kullanici yalniz hissediyor; yaninda oldugunu hissettir, sicak ve ilgili ol.',
  endise: 'Kullanici endiseli; sakinlestirici, net ve guven veren bir dille cevap ver.',
  korku: 'Kullanici korkmus; sakin ve guven verici ol.',
  merak: 'Kullanici merakli; acik ve ogretici cevap ver.',
  saskinlik: 'Kullanici saskin; durumu sadelestirerek anlat.',
  ofke: 'Kullanici ofkeli; tartismaya girme, sakin ve anlayisli kal, ofkesini kucumseme.',
  sinir: 'Kullanici sinirli; sakin kal, sinirini onaylayip yatistir, yagi ateste artirma.',
  sikinti: 'Kullanici sikilmis; canli, eglenceli ve ilgi cekici bir cevap ver.',
  rekabet: 'Kullanici rekabetci; meydan okumaya oyuncu bir tonla karsilik ver.',
  eglence: 'Kullanici saka yapiyor; esprili ve rahat karsilik ver.',
  sakin: 'Kullanici sakin; dogal ve rahat konus.',
  para: 'Kullanici para/ekonomi konusuyor; konuya odakli ol.'
};

// Her kayit: [duygu, ipucu regex'i, agirlik]. Metin once sadeleştirilir (kucuk harf, Turkce karakterler ascii).
const KURALLAR = [
  ['uzuntu', /\b(uzgun|uzuldum|uzuluyorum|aglad|agliyorum|aglamak|kirildim|kalbim kirik|moralim bozuk|moralsiz|cok kotu|depresif|bunaldim|icim aciyor|hayal kirikligi|mahvoldum|yikildim|cokmus|dibe vurdum)/, 2],
  ['yalnizlik', /\b(yalnizim|yalniz hissed|kimsem yok|kimse beni|dislandim|tek basima|arkadasim yok)/, 2],
  ['endise', /\b(endise|kaygi|stres|gerginim|panik|sinav|korkuyorum|ya olmazsa|ne yapacagim bilmiyorum|bilemiyorum|kararsizim)/, 1],
  ['korku', /\b(korktum|korkunc|ürper|urper|tedirgin|ürkütücü|urkutucu|kabus)/, 1],
  ['ofke', /\b(sinir|ofke|kiziyorum|kizdim|delirdim|deliriyorum|nefret|bikti|bezdim|rezalet|berbat|igrenc|yeter artik|sacmalik|saçmalik)/, 2],
  ['sikinti', /\b(sikildim|sikici|canim sikkin|sıkıldım|bosluk|yapacak bir sey yok|bos bos)/, 1],
  ['sevgi', /\b(seni seviyorum|seviyorum|askim|canim benim|biriciğim|biricigim|sevgilim|kalbim|sarilmak|ozledim|özledim|iyi ki varsin|iyiki varsin|canim)/, 2],
  ['minnet', /\b(tesekkur|sagol|sag ol|eyvallah|saol|minnettar|yardimin icin|cok yardimci)/, 1],
  ['gurur', /\b(basardim|kazandim|bitirdim|gectim|yendim|zirve|rekor|seviye atladim|terfi|sinifi gectim)/, 2],
  ['heyecan', /\b(heyecan|inanilmaz|muthis|harika|efsane|bayildim|cok guzel|super|mukemmel|vay be|yasasin|yaasasin|helal)/, 2],
  ['sevinc', /\b(mutluyum|sevindim|cok sevindim|iyiyim|keyifli|keyfim yerinde|gulme|haha|ahaha|ehehe|:d|xd|lol|😂|🤣|😄|😁)/, 1],
  ['merak', /\b(nasil|neden|niye|nedir|ne demek|kim|hangi|kac|ne zaman|nerede|\?)/, 0],
  ['saskinlik', /\b(sasirdim|inanamiyorum|gercekten mi|yok artik|ciddi misin|ne\?!|nasil yani|vay)/, 1],
  ['rekabet', /\b(duello|dovus|kapisalim|meydan oku|yenerim|savas|kavga|zindan|boss|rakip)/, 1],
  ['eglence', /\b(saka|komik|gulduruyor|gulmekten|kahkaha|espri|eglenc|bomba)/, 1],
  ['para', /\b(ryo|para|zengin|fakir|bahis|kumar|market|bakiye|maas|fiyat)/, 1]
];

const OLUMSUZLAR = ['ofke', 'uzuntu', 'yalnizlik', 'endise', 'korku', 'sikinti'];

function sadelestir(s) {
  return String(s ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
    .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/(.)\1{2,}/g, '$1$1');
}

/**
 * Metindeki baskin duyguyu bulur.
 * @returns {{ duygu: string, yogunluk: number, sticker: string|null, ipucu: string }}
 */
export function duyguTespit(metin) {
  const ham = String(metin ?? '');
  const t = sadelestir(ham);
  if (t.trim().length < 2) return { duygu: 'sakin', yogunluk: 0, sticker: null, ipucu: '' };

  const puan = new Map();
  for (const [duygu, re, agirlik] of KURALLAR) {
    if (re.test(t)) puan.set(duygu, (puan.get(duygu) || 0) + 1 + agirlik);
  }

  // Yazim bicimi: bagirma (BUYUK HARF) ve noktalama yogunlugu duyguyu guclendirir.
  const harfler = ham.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
  const bagiriyor = harfler.length >= 6 && harfler === harfler.toLocaleUpperCase('tr-TR');
  const unlem = (ham.match(/!/g) || []).length;
  const soru = (ham.match(/\?/g) || []).length;

  if (bagiriyor) puan.set('ofke', (puan.get('ofke') || 0) + 2);
  if (unlem >= 2) {
    const kazanan = [...puan.entries()].sort((a, b) => b[1] - a[1])[0];
    if (kazanan) puan.set(kazanan[0], kazanan[1] + 1);
    else puan.set('heyecan', 1);
  }
  if (soru >= 2 && !puan.has('merak')) puan.set('merak', 1);

  // Sevinc/mutluluk yanilticisi: "cok kotu degil" gibi olumsuzlama olumsuz duyguyu bastirir.
  if (/\b(degil|olmadi|yok)\b/.test(t) && puan.size) {
    for (const o of OLUMSUZLAR) if (puan.has(o) && /\bdegil\b/.test(t)) puan.delete(o);
  }

  if (!puan.size) return { duygu: 'sakin', yogunluk: 0, sticker: null, ipucu: '' };

  // Olumsuz duygu esitlikte oncelik alir: uzgun birine yanlislikla neseli davranmaktan kacin.
  const sirali = [...puan.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return Number(OLUMSUZLAR.includes(b[0])) - Number(OLUMSUZLAR.includes(a[0]));
  });
  const [duygu, skor] = sirali[0];
  const yogunluk = skor >= 5 ? 3 : skor >= 3 ? 2 : 1;
  // Sadece "merak" gibi zayif tespitler sticker degistirmez.
  const stickerGuvenli = duygu !== 'merak' && duygu !== 'sakin';
  return {
    duygu,
    yogunluk,
    sticker: stickerGuvenli ? (STICKER_HARITASI[duygu] || null) : null,
    ipucu: TON_ONERISI[duygu] || ''
  };
}

/** Gemini istemine eklenecek tek satirlik duygu notu; belirgin duygu yoksa bos doner. */
export function duyguIpucuMetni(metin) {
  const d = duyguTespit(metin);
  if (!d.ipucu || d.yogunluk < 1 || d.duygu === 'sakin') return '';
  const guc = ['', 'hafif', 'belirgin', 'cok guclu'][d.yogunluk];
  return `Duygu analizi (${guc} ${d.duygu}): ${d.ipucu} Bu analizi cevapta acikca belirtme, sadece tonunu ona gore ayarla.`;
}

/** Mesaja eklenecek emoji tepkisi; sadece belirgin duygularda dolu doner. */
export function duyguEmojisi(metin) {
  const d = duyguTespit(metin);
  if (d.yogunluk < 2) return null;
  return {
    sevinc: '😄', heyecan: '🔥', gurur: '🏆', sevgi: '❤️', minnet: '🙏',
    uzuntu: '🫂', yalnizlik: '🫂', endise: '🍵', ofke: '😤', rekabet: '⚔️', eglence: '😂'
  }[d.duygu] || null;
}
