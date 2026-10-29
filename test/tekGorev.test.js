import test from 'node:test';
import assert from 'node:assert/strict';
import { tekGorev } from '../src/services/tekGorev.js';

test('Yavaş görev üst üste başlamaz ve tamamlandıktan sonra yeniden çalışır', async () => {
  let bitir;
  let sayi = 0;
  const tur = tekGorev(async () => {
    sayi++;
    await new Promise(r => { bitir = r; });
  });
  const ilk = tur();
  await tur();
  assert.equal(sayi, 1);
  bitir(); await ilk;
  const ikinci = tur();
  assert.equal(sayi, 2);
  bitir(); await ikinci;
});

test('Hata görevi kilitli bırakmaz', async () => {
  let hatalar = 0;
  const tur = tekGorev(() => { throw new Error('test'); }, () => hatalar++);
  await tur(); await tur();
  assert.equal(hatalar, 2);
});
