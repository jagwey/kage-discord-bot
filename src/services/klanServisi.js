import { jsonDepo } from './jsonDepo.js';

const depo = jsonDepo('klanlar.json', () => ({}));

function tumKlanlariGetir() {
  return depo.oku();
}

export function klanBul(adVeyaId) {
  const klanlar = tumKlanlariGetir();
  const aranan = String(adVeyaId).toLowerCase().trim();
  for (const [id, klan] of Object.entries(klanlar)) {
    if (id.toLowerCase() === aranan || klan.ad.toLowerCase() === aranan) {
      return { id, ...klan };
    }
  }
  return null;
}

export function kullaniciKlaniniBul(userId) {
  const klanlar = tumKlanlariGetir();
  for (const [id, klan] of Object.entries(klanlar)) {
    if (klan.liderId === userId || klan.uyeler.some(u => u.id === userId)) {
      return { id, ...klan };
    }
  }
  return null;
}

export function klanKur(liderId, liderAdi, klanAdi, aciklama = 'Gölge savaşçıları meclisi.') {
  const klanlar = tumKlanlariGetir();
  if (kullaniciKlaniniBul(liderId)) {
    throw new Error('Zaten bir klana üyesin! Yeni klan kurmak için önce mevcut klanından ayrılmalısın.');
  }

  const klanId = klanAdi.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (klanBul(klanId)) {
    throw new Error('Bu isimde veya benzer bir klan zaten mevcut!');
  }

  klanlar[klanId] = {
    ad: klanAdi.trim(),
    liderId,
    liderAdi,
    aciklama: aciklama.trim(),
    seviye: 1,
    xp: 0,
    kasa: 0,
    maksUye: 10,
    uyeler: [{ id: liderId, ad: liderAdi, rol: 'Lider' }],
    kurulusTarihi: new Date().toISOString()
  };

  depo.yaz(klanlar);
  return klanlar[klanId];
}

export function klanaKatil(userId, userAdi, klanAdi) {
  const klanlar = tumKlanlariGetir();
  if (kullaniciKlaniniBul(userId)) {
    throw new Error('Zaten bir klanın üyesisin!');
  }

  const klan = klanBul(klanAdi);
  if (!klan) throw new Error('Böyle bir klan bulunamadı.');

  if (klan.uyeler.length >= klan.maksUye) {
    throw new Error(`Bu klan maksimum üye kapasitesine (${klan.maksUye}) ulaşmış!`);
  }

  klanlar[klan.id].uyeler.push({ id: userId, ad: userAdi, rol: 'Savaşçı' });
  depo.yaz(klanlar);
  return klanlar[klan.id];
}

export function klandanAyril(userId) {
  const klanlar = tumKlanlariGetir();
  const klan = kullaniciKlaniniBul(userId);
  if (!klan) throw new Error('Herhangi bir klanın üyesi değilsin.');

  if (klan.liderId === userId) {
    if (klan.uyeler.length === 1) {
      delete klanlar[klan.id];
      depo.yaz(klanlar);
      return { klanFeshedildi: true, klanAdi: klan.ad };
    }
    // Liderliği ikinci üyeye devret
    const yeniLider = klan.uyeler.find(u => u.id !== userId);
    klanlar[klan.id].liderId = yeniLider.id;
    klanlar[klan.id].liderAdi = yeniLider.ad;
    yeniLider.rol = 'Lider';
  }

  klanlar[klan.id].uyeler = klanlar[klan.id].uyeler.filter(u => u.id !== userId);
  depo.yaz(klanlar);
  return { klanFeshedildi: false, klanAdi: klan.ad };
}

export function klanaBagisYap(userId, miktar) {
  const klanlar = tumKlanlariGetir();
  const klan = kullaniciKlaniniBul(userId);
  if (!klan) throw new Error('Bir klanın üyesi değilsin!');

  klanlar[klan.id].kasa += miktar;
  klanlar[klan.id].xp += Math.floor(miktar / 2);

  let seviyeAtladi = false;
  const gerekenXp = klanlar[klan.id].seviye * 1000;

  if (klanlar[klan.id].xp >= gerekenXp) {
    klanlar[klan.id].seviye += 1;
    klanlar[klan.id].maksUye += 5;
    seviyeAtladi = true;
  }

  depo.yaz(klanlar);
  return { klan: klanlar[klan.id], seviyeAtladi };
}

export function klanLiderlikSiralamasi() {
  const klanlar = tumKlanlariGetir();
  return Object.values(klanlar).sort((a, b) => b.seviye !== a.seviye ? b.seviye - a.seviye : b.kasa - a.kasa);
}

/** Haftalık klan savaşı kazananını işler: kasaya pay ekler ve şampiyonluk kaydını tutar. */
export function klanSampiyonIsle(klanId, kasaPayi, hafta) {
  const klanlar = tumKlanlariGetir();
  const klan = klanlar[klanId];
  if (!klan) return null;
  klan.kasa = (klan.kasa || 0) + kasaPayi;
  klan.sampiyonluk = (klan.sampiyonluk || 0) + 1;
  klan.sonSampiyonHafta = hafta;
  depo.yaz(klanlar);
  return klan;
}
