import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Aynı diskte rename: kesilen yazım eski JSON'u yarım bırakmaz.
export function atomikYaz(dosya, icerik) {
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  const gecici = `${dosya}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(gecici, icerik, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    fs.renameSync(gecici, dosya);
  } finally {
    fs.rmSync(gecici, { force: true });
  }
}
