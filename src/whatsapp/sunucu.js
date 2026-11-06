import http from 'node:http';
import { baglar as varsayilanBag } from './bag.js';
import { depoOlustur } from './depo.js';
import { discordKopruYaz, discordKullaniciCoz } from './discordRest.js';
import { whatsappGonder } from './graph.js';
import { imzaGecerli } from './imza.js';
import {
  discordKimligiAyikla,
  genelAsistanTalebiMi,
  GENEL_ASISTAN_YANITI,
  kayitHataMetni,
  KAYIT_ISTEGI,
  kopruMetni,
  maskeliKimlik,
  yonetimIstegiMi,
  YONETIM_YANITI
} from './politika.js';
import { whatsappSohbetYanitla } from './sohbet.js';

function bayrak(deger) {
  return ['1', 'true', 'evet', 'on'].includes(String(deger || '').trim().toLowerCase());
}

function govdeOku(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const parcalar = [];
    let boyut = 0;
    let bitti = false;
    const bitir = (hata, veri) => {
      if (bitti) return;
      bitti = true;
      if (hata) reject(hata);
      else resolve(veri);
    };
    req.on('data', parca => {
      boyut += parca.length;
      if (boyut > limit) {
        bitir(Object.assign(new Error('buyuk'), { kod: 413 }));
        req.destroy();
        return;
      }
      parcalar.push(parca);
    });
    req.on('error', err => bitir(err));
    req.on('end', () => bitir(null, Buffer.concat(parcalar)));
  });
}

export function mesajlariAyikla(govde) {
  if (govde?.object !== 'whatsapp_business_account') return [];
  const cikan = [];
  for (const entry of govde.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field && change.field !== 'messages') continue;
      const value = change.value || {};
      for (const mesaj of value.messages || []) {
        cikan.push({ entryId: entry.id, metadata: value.metadata || {}, mesaj });
      }
    }
  }
  return cikan;
}

function metinGovdesi(mesaj) {
  if (mesaj?.type === 'text') return String(mesaj.text?.body || '').trim();
  return '';
}

/**
 * Tek gelen mesaj: köprüye düşür, kayıt yoksa AI çalıştırma, varsa aynı Kage ağına sor, yanıtı yansıt.
 */
export async function gelenMesajiIsle(mesaj, ctx) {
  const waId = String(mesaj.from || mesaj.from_user_id || mesaj.bsuid || '').trim();
  if (!waId) return;
  if (!ctx.depo.ilkKezMi(mesaj.id, ctx.simdi())) return;
  if (ctx.izin.size && !ctx.izin.has(waId)) return;
  if (ctx.depo.hizAsildiMi(waId, ctx.simdi(), ctx.hizBeklemeMs)) return;
  const grupId = mesaj.group_id || null;
  if (grupId && !ctx.grupAcik) return;

  ctx.bag.sonGelen(waId, ctx.simdi());
  const bagli = ctx.bag.getir(waId);
  const maske = maskeliKimlik(waId);
  const gelen = metinGovdesi(mesaj);
  console.info(`[WhatsApp] gelen kimlik=${maske} wamid=…${String(mesaj.id || '').slice(-6)}`);

  const kopruGelen = await ctx.kopruYaz({
    icerik: kopruMetni({
      yon: 'gelen',
      discordAd: bagli?.discordAd,
      maske,
      metin: gelen || '[yazı dışı mesaj]'
    })
  });
  if (kopruGelen?.id) ctx.bag.kopruMesajKaydet(kopruGelen.id, waId, ctx.simdi());

  const yanitVeAyna = async (metin, discordAd = bagli?.discordAd) => {
    const alici = { kimlik: waId, grupId: grupId && ctx.grupAcik ? grupId : null };
    await ctx.gonder({ alici, metin, env: ctx.env, istek: ctx.istek, simdi: ctx.simdi() });
    const ayna = await ctx.kopruYaz({
      icerik: kopruMetni({ yon: 'giden', discordAd, maske, metin }),
      replyTo: kopruGelen?.id
    });
    if (ayna?.id) ctx.bag.kopruMesajKaydet(ayna.id, waId, ctx.simdi());
  };

  if (mesaj.type !== 'text' || !gelen) {
    await yanitVeAyna('Şimdilik yalnızca yazılı mesaj okuyabiliyorum.');
    return;
  }

  if (!bagli) {
    const kim = discordKimligiAyikla(gelen);
    if (!kim) {
      await yanitVeAyna(KAYIT_ISTEGI);
      return;
    }
    const cozum = await ctx.discordCoz({
      token: ctx.env.DISCORD_TOKEN,
      guildId: ctx.env.GUILD_ID,
      girdi: kim,
      istek: ctx.discordIstek
    });
    if (!cozum?.discordUserId) {
      await yanitVeAyna(kayitHataMetni(cozum?.hata));
      return;
    }
    const kayit = ctx.bag.kaydet({
      waId,
      discordUserId: cozum.discordUserId,
      discordAd: cozum.discordAd,
      simdi: ctx.simdi()
    });
    if (kayit.hata) {
      await yanitVeAyna(kayitHataMetni(kayit.hata));
      return;
    }
    await yanitVeAyna(
      `Tamam, Discord hesabın bağlandı (${cozum.discordAd}). Manga veya kage95.com desteği için yazabilirsin.`,
      cozum.discordAd
    );
    return;
  }

  if (yonetimIstegiMi(gelen)) {
    await yanitVeAyna(YONETIM_YANITI);
    return;
  }
  if (genelAsistanTalebiMi(gelen)) {
    await yanitVeAyna(GENEL_ASISTAN_YANITI);
    return;
  }

  try {
    const sonuc = await ctx.aiYanitla({
      waId,
      metin: gelen,
      ad: bagli.discordAd || 'Okur',
      discordUserId: bagli.discordUserId
    });
    await yanitVeAyna(sonuc?.metin || '…', bagli.discordAd);
  } catch (err) {
    console.error('[WhatsApp] Yapay zeka hatası:', err.message);
    await yanitVeAyna('Şu an yanıt üretemedim. Biraz sonra manga veya siteyle ilgili tekrar yaz.', bagli.discordAd);
  }
}

export function sunucuOlustur(secenek = {}) {
  const env = secenek.env || process.env;
  const depo = secenek.depo || depoOlustur();
  const bag = secenek.bag || varsayilanBag;
  const istek = secenek.istek || fetch;
  const discordIstek = secenek.discordIstek || fetch;
  const aiYanitla = secenek.aiYanitla || whatsappSohbetYanitla;
  const simdi = secenek.simdi || (() => Date.now());
  const hizBeklemeMs = secenek.hizBeklemeMs ?? 8000;
  const grupAcik = bayrak(env.WHATSAPP_GROUPS);
  const izin = new Set(String(env.WHATSAPP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean));
  const gonder = secenek.gonder || (opts => whatsappGonder({ ...opts, bag, istek }));
  const kopruYaz = secenek.kopruYaz || (opts => discordKopruYaz({
    token: env.DISCORD_TOKEN,
    kanalId: env.WHATSAPP_BRIDGE_CHANNEL_ID,
    istek: discordIstek,
    ...opts
  }));
  const discordCoz = secenek.discordCoz || discordKullaniciCoz;

  const ctx = {
    env, depo, bag, istek, discordIstek, aiYanitla, simdi, hizBeklemeMs, grupAcik, izin, gonder, kopruYaz, discordCoz
  };

  return http.createServer(async (req, res) => {
    const bitir = (kod, govde, tip = 'text/plain; charset=utf-8') => {
      if (res.headersSent) return;
      res.writeHead(kod, { 'Content-Type': tip });
      res.end(govde);
    };
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') {
        bitir(200, JSON.stringify({ status: 'online', bot: 'Kage WhatsApp' }), 'application/json; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/webhook') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        if (mode !== 'subscribe' || !env.WHATSAPP_VERIFY_TOKEN || token !== env.WHATSAPP_VERIFY_TOKEN) {
          bitir(403, 'Forbidden');
          return;
        }
        if (!challenge) {
          bitir(400, 'Missing challenge');
          return;
        }
        bitir(200, challenge);
        return;
      }
      if (req.method !== 'POST' || url.pathname !== '/webhook') {
        bitir(404, 'Not found');
        return;
      }
      const raw = await govdeOku(req);
      const imza = req.headers['x-hub-signature-256'];
      if (!imzaGecerli(raw, Array.isArray(imza) ? imza[0] : imza, env.WHATSAPP_APP_SECRET)) {
        bitir(403, 'Invalid signature');
        return;
      }
      let govde;
      try {
        govde = JSON.parse(raw.toString('utf8') || '{}');
      } catch {
        bitir(400, 'Invalid JSON');
        return;
      }
      const waba = env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      for (const olay of mesajlariAyikla(govde)) {
        if (waba && olay.entryId && String(olay.entryId) !== String(waba)) continue;
        const phoneId = olay.metadata.phone_number_id;
        if (env.WHATSAPP_PHONE_NUMBER_ID && phoneId && String(phoneId) !== String(env.WHATSAPP_PHONE_NUMBER_ID)) {
          continue;
        }
        try {
          await gelenMesajiIsle(olay.mesaj, ctx);
        } catch (err) {
          console.error('[WhatsApp] Mesaj işlenemedi:', err.message);
        }
      }
      bitir(200, 'EVENT_RECEIVED');
    } catch (err) {
      const kod = err.kod || 500;
      console.error('[WhatsApp] İstek hatası:', err.message);
      bitir(kod, kod === 413 ? 'Payload too large' : 'error');
    }
  });
}
