/** Telefonu log ve köprü metninden kısa maskeyle ayırır. */
export function maskeliKimlik(id) {
  const s = String(id || '');
  if (s.length < 6) return '···';
  return `${s.slice(0, 2)}…${s.slice(-2)}`;
}

/** Kalıcı anahtar. Discord kar tanesi ile çakışmasın diye önek zorunlu. */
export function bellekAnahtari(waId) {
  const id = String(waId || '').trim();
  if (!/^[A-Za-z0-9._-]{4,128}$/.test(id)) {
    throw new Error('gecersiz_kimlik');
  }
  return `whatsapp:${id}`;
}

const YONETIM = /\b(banla|yasakla|kickle|sustur|mutele|rol ver|rol al|rol aç|rol ac|kanal sil|kanal aç|kanal ac|kanal kapat|sunucuyu sıfırla|sunucuyu sifirla|sunucu sıfırla|sunucu sifirla|mesajları sil|mesajlari sil|duyuru yap|ryo ver|ryo ekle|ryo gönder|ryo gonder)\b/iu;

/** Discord yetkili eylemi bu arayüzden çalışmaz. */
export function yonetimIstegiMi(metin) {
  return YONETIM.test(String(metin || ''));
}

export const YONETIM_YANITI = 'Discord yönetimi bu hatta yok. Ban, rol, kanal ve Ryo işlemleri yalnızca Discord sunucusunda yapılır. Manga veya kage95.com desteği için yazabilirsin.';

const GENEL_ASISTAN = /(chatgpt|chat\s*gpt|gpt-?4|genel amaçlı (yapay zeka|asistan)|genel amacli (yapay zeka|asistan))/iu;

/** Ürün genel amaçlı asistan gibi konumlanmasın. */
export function genelAsistanTalebiMi(metin) {
  return GENEL_ASISTAN.test(String(metin || ''));
}

export const GENEL_ASISTAN_YANITI = 'Ben genel amaçlı bir sohbet ürünü değilim. Kage95 manga keşfi ve site desteği için buradayım. Hangi seriyi arıyorsun?';

export const KAYIT_ISTEGI = 'Bu hat Kage95 manga keşfi ve site desteği. Devam etmek için Discord kullanıcı adını veya kullanıcı ID\'ni yaz (örnek: jagwey veya 123456789012345678).';

/**
 * Kayıt mesajından Discord kimliği ayıklar. Cümleleri kullanıcı adı saymaz.
 * @returns {{ tur: 'id'|'ad', deger: string }|null}
 */
export function discordKimligiAyikla(metin) {
  const yalin = String(metin || '').trim().replace(/^discord\s+/i, '').trim();
  const id = yalin.match(/^(?:(?:kullan[ıi]c[ıi]\s*)?id\s*[:：]?\s*)?(\d{17,20})$/i);
  if (id) return { tur: 'id', deger: id[1] };
  const ad = yalin.match(/^(?:(?:kullan[ıi]c[ıi]\s*ad[ıi]|ad[ıi])\s*[:：]?\s*)?@?([a-zA-Z0-9._]{2,32})$/i);
  if (ad && !/^\d+$/.test(ad[1])) return { tur: 'ad', deger: ad[1] };
  return null;
}

export function kayitHataMetni(hata) {
  switch (hata) {
    case 'sunucuda_yok':
      return 'Bu Discord hesabı sunucuda görünmüyor. Sunucuya katıl, sonra kullanıcı ID\'ni tekrar yaz.';
    case 'birden_fazla':
      return 'Bu ada birden fazla üye uyuyor. Discord kullanıcı ID\'ni (rakam) gönder.';
    case 'id_gerekli':
      return 'Kullanıcı adını doğrulamak için sunucu ayarı yok. 17-20 haneli Discord kullanıcı ID\'ni yaz.';
    case 'baska_hat':
      return 'Bu Discord hesabı başka bir WhatsApp hattına bağlı. Aynı hesabı ikinci hatta bağlamam.';
    case 'yetki':
      return 'Discord kimliğini şu an doğrulayamadım. Biraz sonra yalnızca kullanıcı ID\'ni tekrar yaz.';
    case 'yapilandirma':
      return 'Discord bağlantısı ayarlı değil. Hat yöneticisi DISCORD_TOKEN değerini eklemeli.';
    default:
      return 'Bu Discord hesabını bulamadım. Kullanıcı adını veya kullanıcı ID\'ni tekrar yaz.';
  }
}

export function kopruMetni({ yon, discordAd, maske, metin }) {
  const baslik = yon === 'gelen' ? 'WhatsApp → Kage' : 'Kage → WhatsApp';
  const ad = String(discordAd || 'bağlı değil').replace(/[`<>@#]/g, '').slice(0, 64) || 'bağlı değil';
  const govde = String(metin || '').slice(0, 1700);
  return `**${baslik}** · ${ad} · \`${maske || '···'}\`\n${govde}`.slice(0, 2000);
}
