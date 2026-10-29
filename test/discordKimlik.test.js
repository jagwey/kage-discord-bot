import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  FATAL_AUTH_CIKIS,
  authDurumuYaz,
  discordKimlikHatasiMi,
  saglikHttpKodu
} from '../src/discordKimlik.js';
import { IDENTIFY_TAVAN_CIKIS } from '../src/oturumSiniri.js';

const require = createRequire(import.meta.url);

test('401, 4004 ve invalid token kimlik hatasıdır; ağ ve 429 değildir', () => {
  assert.equal(discordKimlikHatasiMi({ status: 401, code: 0, message: '401: Unauthorized' }), true);
  assert.equal(discordKimlikHatasiMi({ response: { status: 401 }, message: 'Request failed with status code 401' }), true);
  assert.equal(discordKimlikHatasiMi({ code: 4004, message: 'Authentication failed' }), true);
  assert.equal(discordKimlikHatasiMi({ code: 'TokenInvalid', message: 'An invalid token was provided.' }), true);
  assert.equal(discordKimlikHatasiMi(401), true);
  assert.equal(discordKimlikHatasiMi(4004), true);
  assert.equal(discordKimlikHatasiMi('TOKEN_INVALID'), false);
  assert.equal(discordKimlikHatasiMi('An invalid token was provided.'), true);
  assert.equal(discordKimlikHatasiMi('Unexpected server response: 401'), true);
  assert.equal(discordKimlikHatasiMi(new Error('getaddrinfo EAI_AGAIN discord.com')), false);
  assert.equal(discordKimlikHatasiMi({ status: 429, message: 'You are being rate limited.' }), false);
  assert.equal(discordKimlikHatasiMi({ status: 500, message: 'Internal Server Error' }), false);
  assert.equal(discordKimlikHatasiMi({ isAxiosError: true, response: { status: 401 }, message: 'Request failed with status code 401' }), false);
  assert.equal(discordKimlikHatasiMi(new Error('Discord login 45 saniyede tamamlanmadı.')), false);
});

test('auth_failed sağlık kodu 503; starting ve online 200', () => {
  assert.equal(saglikHttpKodu('auth_failed', false), 503);
  assert.equal(saglikHttpKodu('auth_failed', true), 503);
  assert.equal(saglikHttpKodu('starting', false), 200);
  assert.equal(saglikHttpKodu('online', false), 200);
  assert.equal(saglikHttpKodu('offline', false), 503);
  assert.equal(saglikHttpKodu('error', true), 200);
  assert.equal(saglikHttpKodu('error', false), 503);
});

test('auth durumu health alanına auth_failed yazar', () => {
  authDurumuYaz('DISCORD_TOKEN geçersiz veya yetkisiz.');
  assert.equal(globalThis.__kageDurum.durum, 'auth_failed');
  assert.match(globalThis.__kageDurum.detay, /geçersiz veya yetkisiz/);
  assert.equal(FATAL_AUTH_CIKIS, 78);
});

test('pm2 ecosystem kimlik çıkışını durdurur ve restart sınırlar', () => {
  const eco = require('../ecosystem.config.cjs');
  const app = eco.apps[0];
  assert.equal(app.name, 'kage-discord-bot');
  assert.equal(app.script, 'src/index.js');
  assert.ok(app.stop_exit_codes.includes(FATAL_AUTH_CIKIS));
  assert.ok(app.stop_exit_codes.includes(IDENTIFY_TAVAN_CIKIS));
  assert.equal(IDENTIFY_TAVAN_CIKIS, 79);
  assert.equal(app.max_restarts, 3);
  assert.equal(typeof app.min_uptime, 'number');
  assert.ok(app.min_uptime >= 180000);
  assert.equal(typeof app.exp_backoff_restart_delay, 'number');
  assert.ok(app.exp_backoff_restart_delay >= 1000);
  assert.equal(app.autorestart, true);
  assert.ok(app.kill_timeout >= 25000, 'Kapanış yedeği için PM2 yeterli süre tanımalı');
});

test('auth fatal çıkışı 78 döner', async () => {
  const child = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    "import { authFatalCikis } from './src/discordKimlik.js'; authFatalCikis('DISCORD_TOKEN geçersiz veya yetkisiz.');"
  ], { cwd: process.cwd() });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
  });
  assert.equal(code, 78);
  assert.match(stderr, /Çıkış kodu 78/);
  assert.match(stderr, /geçersiz veya yetkisiz/);
});
