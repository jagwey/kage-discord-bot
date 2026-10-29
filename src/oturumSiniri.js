import fs from 'node:fs';
import { setTimeout as bekle } from 'node:timers/promises';
import { atomikYaz } from './services/atomikDosya.js';

// Yalnızca IDENTIFY'da çağrılır; RESUME bu beklemeye girmez.
// Kalıcı dosya PM2 restartlarının süreyi sıfırlamasını önler.
export function oturumSinirlayici({ dosya, simdi = Date.now, uyku = bekle, bildir = console.warn }) {
  return {
    async waitForIdentify(shardId, signal) {
      while (!signal.aborted) {
        try {
          let son = 0;
          try {
            son = JSON.parse(fs.readFileSync(dosya, 'utf8')).son;
            if (!Number.isFinite(son) || son < 0) throw new Error('Oturum kaydı bozuk');
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
          }
          const kalan = son ? Math.max(0, son + 120_000 - simdi()) : 0;
          if (kalan) {
            bildir(`[Discord] Yeni oturum için ${Math.ceil(kalan / 1000)} sn beklenecek; mevcut oturum devamı etkilenmez.`);
            await uyku(Math.min(kalan, 120_000), undefined, { signal });
            continue;
          }
          signal.throwIfAborted();
          atomikYaz(dosya, JSON.stringify({ son: simdi() }));
          return;
        } catch (err) {
          if (signal.aborted) throw err;
          // Kaydı okuyamaz/yazamazsak korumayı atlayarak giriş yapma.
          bildir('[Discord] Oturum koruma dosyasına erişilemiyor; giriş 60 sn ertelendi.');
          await uyku(60_000, undefined, { signal });
        }
      }
      signal.throwIfAborted();
    }
  };
}
