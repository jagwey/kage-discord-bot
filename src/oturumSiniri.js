import fs from 'node:fs';
import { setTimeout as bekle } from 'node:timers/promises';
import { atomikYaz } from './services/atomikDosya.js';

/** pm2 ecosystem `stop_exit_codes` ile aynı olmalı. Bu kodda süreç yeniden başlamaz. */
export const IDENTIFY_TAVAN_CIKIS = 79;
export const IDENTIFY_ARALIK_MS = 120_000;
export const IDENTIFY_PENCERE_MS = 60 * 60 * 1000;
export const IDENTIFY_SAATLIK_TAVAN = 5;

// Yalnızca IDENTIFY'da çağrılır; RESUME bu beklemeye girmez.
// Kalıcı dosya PM2 restartlarının sayacı sıfırlamasını önler. Dosyayı silmek tavanı sıfırlar.
export function oturumSinirlayici({
  dosya,
  simdi = Date.now,
  uyku = bekle,
  bildir = console.warn,
  cikis = process.exit,
  tavan = IDENTIFY_SAATLIK_TAVAN,
  aralikMs = IDENTIFY_ARALIK_MS,
  pencereMs = IDENTIFY_PENCERE_MS
} = {}) {
  let zincir = Promise.resolve();
  const seri = (fn) => {
    const sonuc = zincir.then(fn, fn);
    zincir = sonuc.then(() => {}, () => {});
    return sonuc;
  };

  return {
    waitForIdentify(_shardId, signal) {
      return seri(() => bekleIdentify({ dosya, simdi, uyku, bildir, cikis, tavan, aralikMs, pencereMs, signal }));
    }
  };
}

function kayitOku(dosya) {
  let ham;
  try {
    ham = fs.readFileSync(dosya, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { girisler: [] };
    throw err;
  }
  let json;
  try {
    json = JSON.parse(ham);
  } catch (err) {
    err.oturumBozuk = true;
    throw err;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw Object.assign(new Error('Oturum kaydı bozuk'), { oturumBozuk: true });
  }
  if (json.girisler != null && !Array.isArray(json.girisler)) {
    throw Object.assign(new Error('Oturum kaydı bozuk'), { oturumBozuk: true });
  }
  if (json.son != null && (!Number.isFinite(json.son) || json.son < 0)) {
    throw Object.assign(new Error('Oturum kaydı bozuk'), { oturumBozuk: true });
  }
  if (json.son == null && !Array.isArray(json.girisler)) {
    throw Object.assign(new Error('Oturum kaydı bozuk'), { oturumBozuk: true });
  }
  const girisler = [];
  for (const t of json.girisler || []) {
    if (!Number.isFinite(t) || t < 0) {
      throw Object.assign(new Error('Oturum kaydı bozuk'), { oturumBozuk: true });
    }
    girisler.push(t);
  }
  if (Number.isFinite(json.son) && json.son > 0 && !girisler.includes(json.son)) girisler.push(json.son);
  return { girisler };
}

async function bekleIdentify({ dosya, simdi, uyku, bildir, cikis, tavan, aralikMs, pencereMs, signal }) {
  if (signal.aborted) signal.throwIfAborted();
  while (!signal.aborted) {
    let kayit;
    try {
      kayit = kayitOku(dosya);
    } catch (err) {
      if (signal.aborted) throw err;
      bildir('[Discord] Oturum koruma dosyasına erişilemiyor; giriş 60 sn ertelendi.');
      await uyku(60_000, undefined, { signal });
      continue;
    }
    const simdiMs = simdi();
    const pencere = kayit.girisler.filter(t => t <= simdiMs + 1000 && simdiMs - t < pencereMs);
    if (pencere.length >= tavan) {
      // discord.js, waitForIdentify hata verince return etmeden IDENTIFY gönderebilir.
      // Tavan bu yüzden süreçten çıkar; throw yalnızca çıkış geri dönerse ikinci gönderimi keser.
      bildir(`[Kritik] Son bir saatte ${pencere.length} IDENTIFY var; tavan ${tavan}. Çıkış kodu ${IDENTIFY_TAVAN_CIKIS}. pm2 stop_exit_codes bu kodda süreci durdurur.`);
      cikis(IDENTIFY_TAVAN_CIKIS);
      throw Object.assign(new Error('IDENTIFY saatlik tavanı doldu'), { code: 'IDENTIFY_TAVAN' });
    }
    const son = pencere.reduce((enBuyuk, t) => Math.max(enBuyuk, t), 0);
    const kalan = son ? Math.max(0, son + aralikMs - simdiMs) : 0;
    if (kalan) {
      bildir(`[Discord] Yeni oturum için ${Math.ceil(kalan / 1000)} sn beklenecek; mevcut oturum devamı etkilenmez.`);
      await uyku(Math.min(kalan, aralikMs), undefined, { signal });
      continue;
    }
    signal.throwIfAborted();
    const girisler = [...pencere, simdiMs];
    try {
      atomikYaz(dosya, JSON.stringify({ son: simdiMs, girisler }));
    } catch (err) {
      if (signal.aborted) throw err;
      bildir('[Discord] Oturum koruma dosyasına erişilemiyor; giriş 60 sn ertelendi.');
      await uyku(60_000, undefined, { signal });
      continue;
    }
    return;
  }
  signal.throwIfAborted();
}
