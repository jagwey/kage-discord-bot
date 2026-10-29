import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  IDENTIFY_ARALIK_MS,
  IDENTIFY_PENCERE_MS,
  IDENTIFY_SAATLIK_TAVAN,
  IDENTIFY_TAVAN_CIKIS,
  oturumSinirlayici
} from '../src/oturumSiniri.js';
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

test('Saatte 5 IDENTIFY; altıncı 79 ile durur ve kayıt eklemez', async t => {
  const dosya = path.join(klasor(t), 'oturum.json');
  let zaman = 1_000_000;
  const beklemeler = [];
  const cikislar = [];
  const opts = {
    dosya,
    simdi: () => zaman,
    bildir: () => {},
    uyku: async ms => { beklemeler.push(ms); zaman += ms; },
    cikis: kod => { cikislar.push(kod); throw Object.assign(new Error('dur'), { code: 'IDENTIFY_TAVAN' }); }
  };
  const sinyal = () => new AbortController().signal;
  for (let i = 0; i < IDENTIFY_SAATLIK_TAVAN; i++) {
    await oturumSinirlayici(opts).waitForIdentify(0, sinyal());
  }
  assert.equal(cikislar.length, 0);
  assert.equal(JSON.parse(fs.readFileSync(dosya, 'utf8')).girisler.length, IDENTIFY_SAATLIK_TAVAN);
  assert.equal(beklemeler.length, IDENTIFY_SAATLIK_TAVAN - 1);
  await assert.rejects(
    oturumSinirlayici(opts).waitForIdentify(0, sinyal()),
    err => err.code === 'IDENTIFY_TAVAN'
  );
  assert.deepEqual(cikislar, [IDENTIFY_TAVAN_CIKIS]);
  assert.equal(JSON.parse(fs.readFileSync(dosya, 'utf8')).girisler.length, IDENTIFY_SAATLIK_TAVAN);
  assert.equal(beklemeler.length, IDENTIFY_SAATLIK_TAVAN - 1);
});

test('Saat penceresi düşünce yeni IDENTIFY serbest kalır', async t => {
  const dosya = path.join(klasor(t), 'oturum.json');
  let zaman = 1_000_000;
  const opts = {
    dosya,
    simdi: () => zaman,
    bildir: () => {},
    uyku: async ms => { zaman += ms; },
    cikis: () => { throw new Error('tavan'); }
  };
  for (let i = 0; i < IDENTIFY_SAATLIK_TAVAN; i++) {
    await oturumSinirlayici(opts).waitForIdentify(0, new AbortController().signal);
  }
  zaman += IDENTIFY_PENCERE_MS;
  await oturumSinirlayici(opts).waitForIdentify(0, new AbortController().signal);
  const kayit = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  assert.deepEqual(kayit.girisler, [zaman]);
});

test('Eski son damgası 120 sn aralığını korur', async t => {
  const dosya = path.join(klasor(t), 'oturum.json');
  let zaman = 5_000_000;
  fs.writeFileSync(dosya, JSON.stringify({ son: zaman - 10_000 }));
  const beklemeler = [];
  await oturumSinirlayici({
    dosya,
    simdi: () => zaman,
    bildir: () => {},
    uyku: async ms => { beklemeler.push(ms); zaman += ms; }
  }).waitForIdentify(0, new AbortController().signal);
  assert.deepEqual(beklemeler, [IDENTIFY_ARALIK_MS - 10_000]);
  const kayit = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  assert.equal(kayit.girisler.length, 2);
});

test('Eksik oturum dosyası ilk IDENTIFY ile sayacı oluşturur', async t => {
  const dosya = path.join(klasor(t), 'oturum.json');
  await oturumSinirlayici({ dosya, bildir: () => {}, uyku: async () => { throw new Error('beklenmedi'); } })
    .waitForIdentify(0, new AbortController().signal);
  const kayit = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  assert.equal(kayit.girisler.length, 1);
  assert.equal(IDENTIFY_SAATLIK_TAVAN, 5);
  assert.equal(IDENTIFY_ARALIK_MS, 120_000);
  assert.equal(IDENTIFY_PENCERE_MS, 3_600_000);
});

test('Bot kaynağında 30 sn temiz login döngüsü ve ikinci login yok', () => {
  const bot = fs.readFileSync(new URL('../src/bot.js', import.meta.url), 'utf8');
  assert.equal(bot.includes('toparlanmadı'), false);
  assert.equal(bot.includes('temiz login'), false);
  assert.equal((bot.match(/\.login\(/g) || []).length, 1);
  assert.match(bot, /girisYapildi/);
  assert.match(bot, /Events\.Invalidated,\s*\(\)\s*=>\s*\{\s*authFatalCikis/);
  assert.match(bot, /ShardError[\s\S]*authFatalCikis/);
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
