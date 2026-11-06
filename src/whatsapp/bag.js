import { jsonDepo } from '../services/jsonDepo.js';
import { bellekAnahtari } from './politika.js';

const PENCERE_MS = 24 * 60 * 60 * 1000;
const KOPRU_TAVAN = 400;

function bos() {
  return { baglar: {}, bekleyen: {}, discord: {}, kopruMesajlari: [] };
}

/**
 * whatsapp:<wa_id> ↔ Discord kullanıcı eşlemesi.
 * Üretim dosyası data/whatsapp_bag.json (jsonDepo + atomik yazım). Git’e girmez.
 */
export function bagDeposuOlustur(depo = jsonDepo('whatsapp_bag.json', bos)) {
  function oku() {
    const veri = depo.oku() || bos();
    veri.baglar ||= {};
    veri.bekleyen ||= {};
    veri.discord ||= {};
    veri.kopruMesajlari ||= [];
    return veri;
  }

  return {
    getir(waId) {
      try {
        return oku().baglar[bellekAnahtari(waId)] || null;
      } catch {
        return null;
      }
    },
    /**
     * @returns {{ kayit: object }|{ hata: string }}
     */
    kaydet({ waId, discordUserId, discordAd, simdi = Date.now() }) {
      const veri = oku();
      const anahtar = bellekAnahtari(waId);
      const discordId = String(discordUserId || '').trim();
      if (!/^\d{17,20}$/.test(discordId)) return { hata: 'bulunamadi' };
      const sahip = veri.discord[discordId];
      if (sahip && sahip !== anahtar) return { hata: 'baska_hat' };
      const onceki = veri.bekleyen[anahtar];
      veri.baglar[anahtar] = {
        waId: String(waId),
        discordUserId: discordId,
        discordAd: String(discordAd || '').slice(0, 80),
        baglanma: new Date(simdi).toISOString(),
        sonGelen: onceki?.sonGelen || simdi
      };
      veri.discord[discordId] = anahtar;
      delete veri.bekleyen[anahtar];
      depo.yaz(veri);
      return { kayit: veri.baglar[anahtar] };
    },
    sonGelen(waId, simdi = Date.now()) {
      const veri = oku();
      const anahtar = bellekAnahtari(waId);
      if (veri.baglar[anahtar]) veri.baglar[anahtar].sonGelen = simdi;
      else veri.bekleyen[anahtar] = { waId: String(waId), sonGelen: simdi };
      depo.yaz(veri);
    },
    pencereAcikMi(waId, simdi = Date.now()) {
      const veri = oku();
      let anahtar;
      try { anahtar = bellekAnahtari(waId); } catch { return false; }
      const kayit = veri.baglar[anahtar] || veri.bekleyen[anahtar];
      if (!kayit?.sonGelen) return false;
      return simdi - kayit.sonGelen < PENCERE_MS;
    },
    kopruMesajKaydet(messageId, waId, simdi = Date.now()) {
      if (!messageId || !waId) return;
      const veri = oku();
      veri.kopruMesajlari.push({ id: String(messageId), waId: String(waId), zaman: simdi });
      if (veri.kopruMesajlari.length > KOPRU_TAVAN) {
        veri.kopruMesajlari.splice(0, veri.kopruMesajlari.length - KOPRU_TAVAN);
      }
      depo.yaz(veri);
    },
    kopruMesajindanWa(messageId) {
      const liste = oku().kopruMesajlari;
      for (let i = liste.length - 1; i >= 0; i -= 1) {
        if (liste[i].id === String(messageId)) return liste[i].waId;
      }
      return null;
    },
    discordIdenWa(discordUserId) {
      const anahtar = oku().discord[String(discordUserId || '')];
      if (!anahtar) return null;
      return oku().baglar[anahtar]?.waId || null;
    }
  };
}

export const baglar = bagDeposuOlustur();
