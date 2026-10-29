import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { oturumSinirlayici } from '../src/oturumSiniri.js';
import { atomikYaz } from '../src/services/atomikDosya.js';
import { eksikDosyalariGeriYukle } from '../src/services/yedekDosyalari.js';

function klasor(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kage-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('Yeni IDENTIFY restart sonrasında da bekler; iptal edilen bağlantı kota ayırmaz', async t => {
  const dosya = path.join(klasor(t), 'oturum.json');
  let zaman = 1_000_000;
  const beklemeler = [];
  const opts = { dosya, simdi: () => zaman, bildir: () => {}, uyku: async ms => {
    beklemeler.push(ms); zaman += ms;
  } };
  await oturumSinirlayici(opts).waitForIdentify(0, new AbortController().signal);
  assert.deepEqual(beklemeler, []);
  await oturumSinirlayici(opts).waitForIdentify(0, new AbortController().signal);
  assert.deepEqual(beklemeler, [120_000]);
  const once = fs.readFileSync(dosya, 'utf8');
  await assert.rejects(oturumSinirlayici(opts).waitForIdentify(0, AbortSignal.abort()));
  assert.equal(fs.readFileSync(dosya, 'utf8'), once);
});

test('Bozuk oturum kaydı korumayı atlayıp giriş yaptırmaz', async t => {
  const dosya = path.join(klasor(t), 'oturum.json');
  fs.writeFileSync(dosya, '{');
  const kontrol = new AbortController();
  const limiter = oturumSinirlayici({ dosya, bildir: () => {}, uyku: async ms => {
    assert.equal(ms, 60_000);
    kontrol.abort();
    kontrol.signal.throwIfAborted();
  } });
  await assert.rejects(limiter.waitForIdentify(0, kontrol.signal));
  assert.equal(fs.readFileSync(dosya, 'utf8'), '{');
});

test('Yedek geri yükleme güncel yerel veriyi korur, eksik dosyayı tamamlar', t => {
  const dir = klasor(t);
  fs.writeFileSync(path.join(dir, 'ekonomi.json'), '{"ryo":200}');
  const sayi = eksikDosyalariGeriYukle(dir, { dosyalar: {
    'ekonomi.json': '{"ryo":100}', 'hafiza.json': '{"notlar":[]}', '../disari.json': '{}'
  } });
  assert.equal(sayi, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'ekonomi.json'))).ryo, 200);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'hafiza.json'))), { notlar: [] });
  assert.deepEqual(fs.readdirSync(dir).sort(), ['ekonomi.json', 'hafiza.json']);
});

test('Bozuk yedek hiçbir dosyayı kısmen geri yüklemez', t => {
  const dir = klasor(t);
  assert.throws(() => eksikDosyalariGeriYukle(dir, { dosyalar: { 'iyi.json': '{}', 'bozuk.json': '{' } }));
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('Atomik yazım dosyayı yeniler ve geçici dosya bırakmaz', t => {
  const dir = klasor(t);
  const dosya = path.join(dir, 'veri.json');
  atomikYaz(dosya, '{"ryo":1}');
  atomikYaz(dosya, '{"ryo":2}');
  assert.equal(JSON.parse(fs.readFileSync(dosya)).ryo, 2);
  assert.deepEqual(fs.readdirSync(dir), ['veri.json']);
});
