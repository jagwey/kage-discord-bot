import { jsonDepo } from '../services/jsonDepo.js';
import { bellekAnahtari } from './politika.js';

const dosyaDeposu = jsonDepo('whatsapp_hafiza.json', () => ({ notlar: {} }));

/** WhatsApp notları Discord kage_hafiza.json dosyasına yazılmaz. */
export function hafizaDeposuOlustur(depo = dosyaDeposu) {
  return {
    oku(anahtar) {
      const kayit = depo.oku()?.notlar?.[anahtar];
      return Array.isArray(kayit?.notlar) ? kayit.notlar.slice() : [];
    },
    ekle(anahtar, ad, notMetni) {
      const not = String(notMetni || '').trim().slice(0, 300);
      if (!String(anahtar || '').startsWith('whatsapp:') || not.length < 3) return false;
      const veri = depo.oku() || { notlar: {} };
      veri.notlar ||= {};
      const kayit = veri.notlar[anahtar] || { ad: ad || 'Okur', notlar: [] };
      kayit.ad = ad || kayit.ad || 'Okur';
      if (!kayit.notlar.includes(not)) kayit.notlar.push(not);
      if (kayit.notlar.length > 30) kayit.notlar.splice(0, kayit.notlar.length - 30);
      veri.notlar[anahtar] = kayit;
      depo.yaz(veri);
      return true;
    }
  };
}

export const whatsappHafiza = hafizaDeposuOlustur();

export function hafizaAnahtari(waId) {
  return bellekAnahtari(waId);
}
