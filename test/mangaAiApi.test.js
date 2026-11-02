import test from 'node:test';
import assert from 'node:assert/strict';
import { apiOlustur } from '../src/mangaAiApi.js';
const secret = 'test-only-'.repeat(5);
const body = { query: 'Hafızasını kaybeden gizemli bir karakter', candidates: [{ id: 7, text: 'Hafıza kaybı ve gizem.' }] };
async function setup(t, generate, extra = {}) {
  const server = apiOlustur({ secret, generate, ...extra });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return (data = body, auth = secret, path = '/v1/manga/rank') => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
}
test('auth, input validation, catalogue filtering, memory isolation and cache', async t => {
  let calls = 0;
  const send = await setup(t, async options => {
    calls++; assert.equal(options.hafizasiz, true); assert.equal(options.gorevTipi, 'ozel_baglam');
    return { metin: '{"ids":[999,7,7,"7"]}' };
  });
  assert.equal((await send(body, 'wrong')).status, 401);
  assert.equal((await send({ ...body, query: 'x' })).status, 400);
  assert.equal((await send({ ...body, candidates: [null] })).status, 400);
  assert.deepEqual(await (await send()).json(), { ids: [7] });
  assert.deepEqual(await (await send()).json(), { ids: [7] });
  assert.equal(calls, 1);
  await send({ ...body, preferences: 'Farklı favori' }); assert.equal(calls, 2);
  await send({ ...body, candidates: [{ id: 8, text: 'Yeni katalog' }] }); assert.equal(calls, 3);
});
test('failure is sanitized and not cached', async t => {
  let calls = 0;
  const send = await setup(t, async () => { calls++; throw new Error('SECRET'); });
  assert.equal((await send()).status, 503);
  assert.deepEqual(await (await send()).json(), { error: 'ai_unavailable' }); assert.equal(calls, 2);
});
test('rate limit and window reset', async t => {
  let now = 100;
  const send = await setup(t, async () => ({ metin: '{"ids":[]}' }), { limit: 1, now: () => now });
  assert.equal((await send()).status, 200); assert.equal((await send()).status, 429);
  now += 60_000; assert.equal((await send()).status, 200);
});
test('concurrency budget rejects overlapping AI calls', async t => {
  let release, entered;
  const ready = new Promise(r => { entered = r; });
  const send = await setup(t, () => new Promise(r => { release = r; entered(); }));
  const first = send(); await ready;
  assert.equal((await send()).status, 429);
  release({ metin: '{"ids":[]}' }); assert.equal((await first).status, 200);
});
test('bad JSON and oversized inputs never call AI', async t => {
  const send = await setup(t, async () => { throw new Error('should not run'); });
  assert.equal((await send({ ...body, preferences: 'x'.repeat(1001) })).status, 400);
  assert.equal((await send({ ...body, query: 'x'.repeat(41000) })).status, 413);
});
test('chapter vision validates inputs, caches and sanitizes failures', async t => {
  let calls = 0;
  const send = await setup(t, async () => { throw new Error('wrong route'); }, { generateVision: async () => { calls++; return 'Yalnızca bu sayfa.'; } });
  const data = { question: 'Bu sayfada ne oluyor?', imageBase64: 'aGVsbG8=', mimeType: 'image/png' };
  assert.equal((await send(data, 'wrong', '/v1/chapter/ask')).status, 401);
  assert.equal((await send({ ...data, mimeType: 'text/html' }, secret, '/v1/chapter/ask')).status, 400);
  assert.deepEqual(await (await send(data, secret, '/v1/chapter/ask')).json(), { yanit: 'Yalnızca bu sayfa.' });
  await send(data, secret, '/v1/chapter/ask'); assert.equal(calls, 1);
});
