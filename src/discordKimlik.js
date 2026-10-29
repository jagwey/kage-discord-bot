/** pm2 ecosystem `stop_exit_codes` ile aynı olmalı. Geçersiz token sonsuz restart etmez. */
export const FATAL_AUTH_CIKIS = 78;

const KIMLIK_METIN = /invalid token|incorrect login details|authentication failed|tokeninvalid|unauthorized|\b401\b/i;

export function discordKimlikHatasiMi(err) {
  if (err == null) return false;
  // Site / Gemini axios 401'i Discord token hatası değildir.
  if (typeof err === 'object' && err.isAxiosError) return false;
  if (typeof err === 'number') return err === 401 || err === 4004;
  if (typeof err === 'string') return KIMLIK_METIN.test(err);
  const status = err.status ?? err.statusCode ?? err.response?.status;
  if (status === 401) return true;
  const code = err.code;
  if (code === 4004 || code === 'TokenInvalid' || code === 'TOKEN_INVALID') return true;
  const metin = `${err.message || ''} ${err.rawError?.message || ''}`;
  return KIMLIK_METIN.test(metin);
}

/**
 * auth_failed her zaman 503 (çevrimiçi sanılmaz).
 * Hazır istemci ya da starting/online 200; diğer durumlar 503.
 */
export function saglikHttpKodu(durum, istemciHazir) {
  if (durum === 'auth_failed') return 503;
  if (istemciHazir || durum === 'starting' || durum === 'online') return 200;
  return 503;
}

export function authDurumuYaz(detay) {
  globalThis.__kageDurum = {
    ...(globalThis.__kageDurum || {}),
    durum: 'auth_failed',
    detay,
    sonDegisim: new Date().toISOString()
  };
}

export function authFatalCikis(detay) {
  const mesaj = detay || 'DISCORD_TOKEN geçersiz veya yetkisiz.';
  authDurumuYaz(mesaj);
  console.error(`[Kritik] ${mesaj}`);
  console.error('[Kritik] Kalıcı Discord kimlik hatası. Çıkış kodu 78; pm2 stop_exit_codes bu kodda süreci durdurur. Token düzeltilmeden yeniden başlatma Discord API yükünü büyütür.');
  process.exit(FATAL_AUTH_CIKIS);
}
