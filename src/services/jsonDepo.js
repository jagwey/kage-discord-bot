import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomikYaz } from './atomikDosya.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * data/ altında tek bir JSON dosyasını okuyup yazan küçük depo.
 * Yalnızca dosya yoksa varsayılan değer kullanılır; bozuk veri hata verir.
 */
export function jsonDepo(dosyaAdi, varsayilan) {
  const dosya = path.resolve(__dirname, '../../data', dosyaAdi);
  return {
    oku() {
      try {
        const veri = JSON.parse(fs.readFileSync(dosya, 'utf8'));
        if (!veri || typeof veri !== 'object') throw new Error('Geçersiz JSON depo yapısı');
        return veri;
      } catch (err) {
        if (err.code !== 'ENOENT') throw new Error(`${dosyaAdi} okunamadı; veri sıfırlanmadı.`, { cause: err });
        return varsayilan();
      }
    },
    yaz(veri) {
      try {
        fs.mkdirSync(path.dirname(dosya), { recursive: true });
        atomikYaz(dosya, JSON.stringify(veri, null, 2));
      } catch (err) {
        console.error(`[jsonDepo] ${dosyaAdi} yazılamadı:`, err.message);
        throw err;
      }
    }
  };
}
