import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * data/ altında tek bir JSON dosyasını okuyup yazan küçük depo.
 * Dosya yoksa veya bozuksa varsayılan değer kullanılır.
 */
export function jsonDepo(dosyaAdi, varsayilan) {
  const dosya = path.resolve(__dirname, '../../data', dosyaAdi);
  return {
    oku() {
      try {
        const veri = JSON.parse(fs.readFileSync(dosya, 'utf8'));
        return veri && typeof veri === 'object' ? veri : varsayilan();
      } catch {
        return varsayilan();
      }
    },
    yaz(veri) {
      try {
        fs.mkdirSync(path.dirname(dosya), { recursive: true });
        fs.writeFileSync(dosya, JSON.stringify(veri, null, 2), 'utf8');
      } catch (err) {
        console.error(`[jsonDepo] ${dosyaAdi} yazılamadı:`, err.message);
      }
    }
  };
}
