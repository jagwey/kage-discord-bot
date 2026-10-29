import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

// Servis importları gerçek data/ dosyalarına dokunmasın.
test('Tüm komutlar/olaylar izole klasörde yüklenir; sticker önce defer eder', async t => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  fs.mkdirSync(path.join(root, 'scratch'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, 'scratch', 'modul-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
  const { jsonDepo } = await import(pathToFileURL(path.join(dir, 'src/services/jsonDepo.js')).href);
  const depo = jsonDepo('test.json', () => ({}));
  assert.deepEqual(depo.oku(), {});
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data/test.json'), '{bozuk');
  assert.throws(() => depo.oku(), /veri sıfırlanmadı/);
  assert.equal(fs.readFileSync(path.join(dir, 'data/test.json'), 'utf8'), '{bozuk');
  const adlar = new Set();
  let sticker;
  for (const ad of fs.readdirSync(path.join(dir, 'src/commands')).filter(ad => ad.endsWith('.js'))) {
    const komut = await import(pathToFileURL(path.join(dir, 'src/commands', ad)).href);
    const json = komut.data.toJSON();
    assert.equal(typeof komut.execute, 'function', ad);
    assert.ok(!adlar.has(json.name), `Tekrarlı komut: ${json.name}`);
    adlar.add(json.name);
    if (json.name === 'sticker') sticker = komut;
  }
  for (const ad of fs.readdirSync(path.join(dir, 'src/events')).filter(ad => ad.endsWith('.js'))) {
    const olay = await import(pathToFileURL(path.join(dir, 'src/events', ad)).href);
    assert.equal(typeof olay.execute, 'function', ad);
  }
  const sira = [];
  await sticker.execute({
    options: { getString: () => null },
    deferReply: async () => sira.push('defer'),
    editReply: async () => sira.push('edit'),
    followUp: async () => sira.push('follow')
  });
  assert.equal(sira[0], 'defer');
  assert.equal(sira[1], 'edit');
  assert.ok(adlar.size > 70);
  t.diagnostic(`${adlar.size} slash komutu doğrulandı.`);
});
