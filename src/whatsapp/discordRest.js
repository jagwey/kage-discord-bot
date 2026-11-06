const API = 'https://discord.com/api/v10';

function gorunenAd(uye) {
  return uye?.nick || uye?.user?.global_name || uye?.user?.username || 'Discord';
}

async function discordJson(istek, token, yol, secenek = {}) {
  if (!token) return { hata: 'yapilandirma' };
  let yanit;
  try {
    yanit = await istek(`${API}${yol}`, {
      method: secenek.method || 'GET',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: secenek.body ? JSON.stringify(secenek.body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    console.error('[WhatsApp Köprü] Discord isteği başarısız:', err.message);
    return { hata: 'ag' };
  }
  if (yanit.status === 404) return { hata: 'bulunamadi' };
  if (yanit.status === 401 || yanit.status === 403) return { hata: 'yetki' };
  if (!yanit.ok) {
    console.error('[WhatsApp Köprü] Discord yanıtı:', yanit.status);
    return { hata: 'discord' };
  }
  const veri = await yanit.json?.().catch(() => null);
  return { veri };
}

/**
 * Kullanıcı ID’sini, GUILD_ID varsa sunucu üyeliğini, yoksa yalnızca kullanıcıyı doğrular.
 * Kullanıcı adı yalnızca GUILD_ID varken aranır. Gateway oturumu açmaz.
 */
export async function discordKullaniciCoz({ token, guildId, girdi, istek = fetch }) {
  if (!girdi?.deger) return { hata: 'bulunamadi' };
  if (girdi.tur === 'id') {
    if (guildId) {
      const sonuc = await discordJson(istek, token, `/guilds/${guildId}/members/${girdi.deger}`);
      if (sonuc.hata === 'bulunamadi') return { hata: 'sunucuda_yok' };
      if (sonuc.hata) return sonuc;
      return { discordUserId: girdi.deger, discordAd: gorunenAd(sonuc.veri) };
    }
    const sonuc = await discordJson(istek, token, `/users/${girdi.deger}`);
    if (sonuc.hata || !sonuc.veri?.id) return sonuc.hata ? sonuc : { hata: 'bulunamadi' };
    return {
      discordUserId: sonuc.veri.id,
      discordAd: sonuc.veri.global_name || sonuc.veri.username || 'Discord'
    };
  }
  if (!guildId) return { hata: 'id_gerekli' };
  const sonuc = await discordJson(
    istek,
    token,
    `/guilds/${guildId}/members/search?query=${encodeURIComponent(girdi.deger)}&limit=5`
  );
  if (sonuc.hata) return sonuc;
  const liste = Array.isArray(sonuc.veri) ? sonuc.veri : [];
  const tam = liste.find(uye => uye.user?.username?.toLowerCase() === girdi.deger.toLowerCase());
  const sec = tam || (liste.length === 1 ? liste[0] : null);
  if (!sec?.user?.id) return { hata: liste.length > 1 ? 'birden_fazla' : 'bulunamadi' };
  return { discordUserId: sec.user.id, discordAd: gorunenAd(sec) };
}

/** Köprü kanalına REST ile yazar. İkinci Discord Gateway oturumu açmaz. */
export async function discordKopruYaz({ token, kanalId, icerik, replyTo, istek = fetch }) {
  if (!token || !kanalId || !icerik) return null;
  const body = {
    content: String(icerik).slice(0, 2000),
    allowed_mentions: { parse: [] }
  };
  if (replyTo) body.message_reference = { message_id: replyTo };
  const sonuc = await discordJson(istek, token, `/channels/${kanalId}/messages`, { method: 'POST', body });
  if (sonuc.hata || !sonuc.veri?.id) return null;
  return { id: sonuc.veri.id };
}
