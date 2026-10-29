import fs from 'node:fs';
import path from 'node:path';
import { atomikYaz } from './atomikDosya.js';

export function eksikDosyalariGeriYukle(klasor, paket) {
  if (!paket?.dosyalar || typeof paket.dosyalar !== 'object' || Array.isArray(paket.dosyalar)) {
    throw new Error('Geçersiz yedek paketi');
  }
  // Önce tamamını doğrula; yarı geçerli paketle geri yüklemeye başlama.
  const dosyalar = Object.entries(paket.dosyalar).filter(([ad]) => /^[\w.-]+\.json$/.test(ad));
  for (const [, icerik] of dosyalar) {
    if (typeof icerik !== 'string') throw new Error('Geçersiz yedek içeriği');
    JSON.parse(icerik);
  }
  let sayi = 0;
  for (const [ad, icerik] of dosyalar) {
    const hedef = path.join(klasor, ad);
    // Oracle kalıcı diski asıldır. Var olan dosya otomatik olarak değiştirilmez.
    if (fs.existsSync(hedef)) continue;
    atomikYaz(hedef, icerik);
    sayi++;
  }
  return sayi;
}
