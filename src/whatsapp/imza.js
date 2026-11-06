import crypto from 'node:crypto';

/** Meta X-Hub-Signature-256 başlığı. raw gövde, alınan baytların aynısı olmalı. */
export function imzaBasligi(raw, secret) {
  const hex = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return `sha256=${hex}`;
}

export function imzaGecerli(raw, header, secret) {
  if (!secret || !header || typeof header !== 'string') return false;
  const verilen = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;
  if (!/^[a-f0-9]{64}$/i.test(verilen)) return false;
  const beklenen = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(verilen, 'hex');
  const b = Buffer.from(beklenen, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
