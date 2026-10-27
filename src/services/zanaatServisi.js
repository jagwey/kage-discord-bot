import { jsonDepo } from './jsonDepo.js';
import { ryoDus } from './ekonomiServisi.js';

const depo = jsonDepo('zanaat.json', () => ({ kullanicilar: {} }));

export const MALZEMELER = {
  demir: { ad: 'Demir Cevheri', emoji: '⛓️', kaynak: 'zindan' },
  golge_ozu: { ad: 'Gölge Özü', emoji: '🌑', kaynak: 'zindan' },
  pul: { ad: 'Balık Pulu', emoji: '🐚', kaynak: 'balık' },
  mercan: { ad: 'Kızıl Mercan', emoji: '🪸', kaynak: 'balık' },
  ruh_tasi: { ad: 'Ruh Taşı', emoji: '💠', kaynak: 'derin kat, boss' },
  // Kara borsada alınıp satılmaz; yalnızca boss öldürmeden düşer.
  kadim_cekirdek: { ad: 'Kadim Çekirdek', emoji: '🔮', kaynak: 'sadece boss', borsaDisi: true }
};

/** Eşyaların varsayılan dayanıklılığı; efsanevi tarifler kendi değerini taşır. */
export const VARSAYILAN_DAYANIM = 100;
/** Olay başına kuşanılı eşyalardan düşen dayanıklılık. */
export const ASINMA = { zindan: 6, boss: 2 };
/** Tamirde her bu kadar eksik dayanıklılık için bir yuva malzemesi istenir. */
const TAMIR_MALZEME_ADIMI = 20;
const TAMIR_MALZEMESI = { silah: 'demir', tilsim: 'pul' };

/** Demircinin dövebildiği eşyalar. Bonuslar zindanda uygulanır. */
export const TARIFLER = {
  celik_kunai: {
    ad: 'Çelik Kunai', emoji: '🗡️', yuva: 'silah', ryo: 200,
    malzeme: { demir: 5 }, bonus: { hasar: 8 }
  },
  golge_katana: {
    ad: 'Gölge Katana', emoji: '⚔️', yuva: 'silah', ryo: 800,
    malzeme: { demir: 12, golge_ozu: 4 }, bonus: { hasar: 15, kritik: 5 }
  },
  ruh_kesen: {
    ad: 'Ruh Kesen', emoji: '🌌', yuva: 'silah', ryo: 2500,
    malzeme: { demir: 20, golge_ozu: 8, ruh_tasi: 3 }, bonus: { hasar: 25, kritik: 10 }
  },
  pul_muska: {
    ad: 'Pul Muskası', emoji: '🐚', yuva: 'tilsim', ryo: 150,
    malzeme: { pul: 10 }, bonus: { can: 10 }
  },
  mercan_tilsim: {
    ad: 'Mercan Tılsımı', emoji: '🪸', yuva: 'tilsim', ryo: 600,
    malzeme: { pul: 15, mercan: 4 }, bonus: { can: 20, ryo: 10 }
  },
  ruh_tilsimi: {
    ad: 'Ruh Tılsımı', emoji: '💠', yuva: 'tilsim', ryo: 1500,
    malzeme: { mercan: 6, golge_ozu: 4, ruh_tasi: 2 }, bonus: { can: 30, kacinma: 8 }
  },
  kusanagi: {
    ad: 'Kusanagi', emoji: '⚡', yuva: 'silah', ryo: 6000, efsanevi: true, dayanim: 200,
    malzeme: { demir: 25, golge_ozu: 10, ruh_tasi: 4, kadim_cekirdek: 3 }, bonus: { hasar: 40, kritik: 15 }
  },
  yata_aynasi: {
    ad: 'Yata Aynası', emoji: '🪞', yuva: 'tilsim', ryo: 5000, efsanevi: true, dayanim: 200,
    malzeme: { mercan: 10, ruh_tasi: 4, kadim_cekirdek: 3 }, bonus: { can: 50, kacinma: 12, ryo: 10 }
  }
};

export function azamiDayanim(tarifId) {
  return TARIFLER[tarifId]?.dayanim || VARSAYILAN_DAYANIM;
}

/** Eşyanın kalan dayanıklılığı; eski kayıtlarda alan yoksa tam kabul edilir. */
export function esyaDayanimi(kayit, tarifId) {
  return kayit?.dayanim?.[tarifId] ?? azamiDayanim(tarifId);
}

const BONUS_ADLARI = { hasar: 'hasar', kritik: 'Gölge şansı', can: 'can', ryo: 'Ryo', kacinma: 'kaçınma' };

export function bonusMetni(bonus) {
  return Object.entries(bonus)
    .map(([k, v]) => k === 'can' ? `+${v} ${BONUS_ADLARI[k]}` : `+%${v} ${BONUS_ADLARI[k]}`)
    .join(', ');
}

export function malzemeMetni(malzeme) {
  return Object.entries(malzeme).map(([id, n]) => `${MALZEMELER[id].emoji} ${n}`).join(' ');
}

function kayitAl(db, userId) {
  if (!db.kullanicilar[userId]) db.kullanicilar[userId] = { malzeme: {}, esyalar: [], kusanilan: {}, dovulen: 0 };
  return db.kullanicilar[userId];
}

export function zanaatProfili(userId) {
  const db = depo.oku();
  return kayitAl(db, userId);
}

export function malzemeEkle(userId, ekler) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  for (const [id, n] of Object.entries(ekler)) {
    if (MALZEMELER[id] && n > 0) k.malzeme[id] = (k.malzeme[id] || 0) + n;
  }
  depo.yaz(db);
}

/** Malzeme harcar; yetmezse hiçbir şey harcamaz ve false döner. */
export function malzemeHarca(userId, harcanacak) {
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (Object.entries(harcanacak).some(([id, n]) => (k.malzeme[id] || 0) < n)) return false;
  for (const [id, n] of Object.entries(harcanacak)) k.malzeme[id] -= n;
  depo.yaz(db);
  return true;
}

/** Oyun olayına göre rastgele malzeme düşürür. */
export function malzemeDusur(tur, { kat = 1 } = {}, rng = Math.random) {
  const dusen = {};
  if (tur === 'balik') {
    if (rng() < 0.35) dusen.pul = 1;
    if (rng() < 0.06) dusen.mercan = 1;
  } else if (tur === 'zindan') {
    dusen.demir = 1 + Math.floor(rng() * 3);
    if (rng() < 0.3 + kat * 0.1) dusen.golge_ozu = 1;
    if (rng() < 0.05 + (kat - 1) * 0.15) dusen.ruh_tasi = 1;
  } else if (tur === 'bossOldur') {
    dusen.ruh_tasi = 1;
    dusen.kadim_cekirdek = 1;
  } else if (tur === 'sefer') {
    // kat burada sefer süresi (saat).
    if (rng() < 0.15 * kat) dusen.demir = 1 + Math.floor(kat / 4);
    if (rng() < 0.05 * kat) dusen.golge_ozu = 1;
  }
  return dusen;
}

/** Eşyayı döver. Malzeme ve Ryo yeterliyse eşya eklenir; yuva boşsa kuşanılır. */
export function esyaDov(userId, tarifId) {
  const tarif = TARIFLER[tarifId];
  if (!tarif) return { basarili: false, mesaj: 'Böyle bir tarif yok.' };
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (k.esyalar.includes(tarifId)) return { basarili: false, mesaj: `${tarif.emoji} **${tarif.ad}** zaten sende.` };
  const eksik = Object.entries(tarif.malzeme).filter(([id, n]) => (k.malzeme[id] || 0) < n);
  if (eksik.length) {
    return {
      basarili: false,
      mesaj: `Malzeme eksik: ${eksik.map(([id, n]) => `${MALZEMELER[id].emoji} ${MALZEMELER[id].ad} ${k.malzeme[id] || 0}/${n}`).join(', ')}`
    };
  }
  if (!ryoDus(userId, tarif.ryo, `Zanaat: ${tarif.ad}`)) {
    return { basarili: false, mesaj: `Demircinin ücreti **${tarif.ryo} Ryo**. Cüzdanın yetmiyor.` };
  }
  for (const [id, n] of Object.entries(tarif.malzeme)) k.malzeme[id] -= n;
  k.esyalar.push(tarifId);
  k.dovulen = (k.dovulen || 0) + 1;
  const kusanildi = !k.kusanilan[tarif.yuva];
  if (kusanildi) k.kusanilan[tarif.yuva] = tarifId;
  depo.yaz(db);
  return { basarili: true, tarif, kusanildi };
}

export function esyaKusan(userId, tarifId) {
  const tarif = TARIFLER[tarifId];
  if (!tarif) return { basarili: false, mesaj: 'Böyle bir eşya yok.' };
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (!k.esyalar.includes(tarifId)) return { basarili: false, mesaj: `Önce ${tarif.emoji} **${tarif.ad}** dövmelisin.` };
  k.kusanilan[tarif.yuva] = tarifId;
  depo.yaz(db);
  return { basarili: true, tarif };
}

/** Kuşanılan eşyaların toplam bonusu: hasar/kritik/ryo/kacinma yüzde, can düz sayı. Kırık eşya bonus vermez. */
export function zanaatBonusu(userId) {
  const k = depo.oku().kullanicilar[userId];
  const toplam = { hasar: 0, kritik: 0, can: 0, ryo: 0, kacinma: 0 };
  if (!k) return toplam;
  for (const id of Object.values(k.kusanilan || {})) {
    if (esyaDayanimi(k, id) <= 0) continue;
    for (const [b, v] of Object.entries(TARIFLER[id]?.bonus || {})) toplam[b] += v;
  }
  return toplam;
}

export function kusanilanAdlar(userId) {
  const k = depo.oku().kullanicilar[userId];
  if (!k) return [];
  return Object.values(k.kusanilan || {})
    .filter(id => TARIFLER[id])
    .map(id => `${TARIFLER[id].emoji} ${TARIFLER[id].ad}${esyaDayanimi(k, id) <= 0 ? ' 💔' : ''}`);
}

/**
 * Kuşanılı eşyaları aşındırır. Dönen notlar kırılan ve kırılmak üzere olan eşyaları bildirir.
 */
export function esyaAsindir(userId, tur) {
  const miktar = ASINMA[tur];
  const db = depo.oku();
  const k = db.kullanicilar[userId];
  if (!miktar || !k) return [];
  const notlar = [];
  let degisti = false;
  for (const id of Object.values(k.kusanilan || {})) {
    const t = TARIFLER[id];
    const once = esyaDayanimi(k, id);
    if (!t || once <= 0) continue;
    const sonra = Math.max(0, once - miktar);
    (k.dayanim ||= {})[id] = sonra;
    degisti = true;
    if (sonra === 0) notlar.push(`💔 ${t.emoji} **${t.ad}** kırıldı, bonusu kapandı. \`/demirci\` → Tamir.`);
    else if (once > 20 && sonra <= 20) notlar.push(`⚠️ ${t.emoji} **${t.ad}** yıpranıyor (${sonra}/${azamiDayanim(id)}).`);
  }
  if (degisti) depo.yaz(db);
  return notlar;
}

/** Tamir bedeli: eksik dayanıklılık oranında Ryo ve yuva malzemesi. */
export function tamirBedeli(kayit, tarifId) {
  const t = TARIFLER[tarifId];
  const azami = azamiDayanim(tarifId);
  const eksik = azami - esyaDayanimi(kayit, tarifId);
  if (!t || eksik <= 0) return null;
  return {
    eksik,
    ryo: Math.max(10, Math.ceil(t.ryo * 0.4 * eksik / azami)),
    malzeme: { [TAMIR_MALZEMESI[t.yuva]]: Math.ceil(eksik / TAMIR_MALZEME_ADIMI) }
  };
}

export function esyaTamir(userId, tarifId) {
  const t = TARIFLER[tarifId];
  if (!t) return { basarili: false, mesaj: 'Böyle bir eşya yok.' };
  const db = depo.oku();
  const k = kayitAl(db, userId);
  if (!k.esyalar.includes(tarifId)) return { basarili: false, mesaj: `${t.emoji} **${t.ad}** sende yok.` };
  const bedel = tamirBedeli(k, tarifId);
  if (!bedel) return { basarili: false, mesaj: `${t.emoji} **${t.ad}** zaten sapasağlam.` };
  const eksik = Object.entries(bedel.malzeme).filter(([id, n]) => (k.malzeme[id] || 0) < n);
  if (eksik.length) {
    return {
      basarili: false,
      mesaj: `Tamir malzemesi eksik: ${eksik.map(([id, n]) => `${MALZEMELER[id].emoji} ${MALZEMELER[id].ad} ${k.malzeme[id] || 0}/${n}`).join(', ')}`
    };
  }
  if (!ryoDus(userId, bedel.ryo, `Tamir: ${t.ad}`)) {
    return { basarili: false, mesaj: `Tamir ücreti **${bedel.ryo} Ryo**. Cüzdanın yetmiyor.` };
  }
  for (const [id, n] of Object.entries(bedel.malzeme)) k.malzeme[id] -= n;
  (k.dayanim ||= {})[tarifId] = azamiDayanim(tarifId);
  depo.yaz(db);
  return { basarili: true, tarif: t, bedel };
}
