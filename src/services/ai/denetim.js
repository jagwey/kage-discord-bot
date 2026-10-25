import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSYA = path.resolve(__dirname, '../../../data/denetim.log');

/** AI'ın yaptığı her yönetim eylemini satır satır JSON olarak kaydeder. */
export function denetimKaydet({ guildId, userId, userTag, eylem, parametreler, sonuc, onayli = false }) {
  try {
    fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
    const satir = JSON.stringify({
      zaman: new Date().toISOString(),
      guildId, userId, userTag, eylem, parametreler, onayli,
      basarili: !!sonuc?.basarili,
      sonuc: sonuc?.detay || sonuc?.hata || null
    });
    fs.appendFileSync(DOSYA, satir + '\n', 'utf8');
  } catch (err) {
    console.warn('[Denetim] Yazılamadı:', err.message);
  }
}
