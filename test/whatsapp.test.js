import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { atomikYaz } from '../src/services/atomikDosya.js';
import { bagDeposuOlustur } from '../src/whatsapp/bag.js';
import { depoOlustur } from '../src/whatsapp/depo.js';
import { SABLON_UYARI, whatsappGonder } from '../src/whatsapp/graph.js';
import { imzaBasligi, imzaGecerli } from '../src/whatsapp/imza.js';
import { bellekAnahtari } from '../src/whatsapp/politika.js';
import { kopruMesajiMi, personelKopruYaniti } from '../src/whatsapp/personel.js';
import { whatsappSohbetYanitla } from '../src/whatsapp/sohbet.js';
import { sunucuOlustur } from '../src/whatsapp/sunucu.js';

const SECRET = 'test-secret';
const PHONE = '109955';
const DISCORD_ID = '123456789012345678';
const WA = '905551112233';

function bellekDepo(bos) {
  let veri = bos();
  return {
    oku() { return veri; },
    yaz(v) { veri = v; }
  };
}

function bagOlustur() {
  return bagDeposuOlustur(bellekDepo(() => ({ baglar: {}, bekleyen: {}, discord: {}, kopruMesajlari: [] })));
}

function ortam(ek = {}) {
  return {
    WHATSAPP_APP_SECRET: SECRET,
    WHATSAPP_VERIFY_TOKEN: 'test-verify',
    WHATSAPP_ACCESS_TOKEN: 'test-token',
    WHATSAPP_PHONE_NUMBER_ID: PHONE,
    DISCORD_TOKEN: 'discord-test',
    ...ek
  };
}

function paket({ from = WA, id, text, phoneId = PHONE, groupId }) {
  const mesaj = { from, id, timestamp: '1', type: 'text', text: { body: text } };
  if (groupId) mesaj.group_id = groupId;
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: phoneId },
          messages: [mesaj]
        }
      }]
    }]
  });
}

function istekAt(port, method, yol, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: yol,
      method,
      headers: body
        ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers }
        : headers
    }, res => {
      const parca = [];
      res.on('data', c => parca.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(parca).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function ac(t, secenek) {
  const sunucu = sunucuOlustur(secenek);
  await new Promise(resolve => sunucu.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => sunucu.close(resolve)));
  return sunucu.address().port;
}

test('bağ deposu whatsapp anahtarını Discord kimliğinden ayırır ve dosyada durur', t => {
  assert.equal(bellekAnahtari(WA), `whatsapp:${WA}`);
  assert.notEqual(bellekAnahtari(WA), WA);
  assert.notEqual(bellekAnahtari(WA), DISCORD_ID);

  const bellek = bagOlustur();
  const ilk = bellek.kaydet({ waId: WA, discordUserId: DISCORD_ID, discordAd: 'Ali' });
  assert.equal(ilk.kayit.discordUserId, DISCORD_ID);
  assert.equal(bellek.getir(WA).discordAd, 'Ali');
  assert.equal(bellek.getir(DISCORD_ID), null);
  assert.equal(bellek.discordIdenWa(DISCORD_ID), WA);
  const cakisma = bellek.kaydet({ waId: '905550000099', discordUserId: DISCORD_ID, discordAd: 'Baska' });
  assert.equal(cakisma.hata, 'baska_hat');
  assert.equal(bellek.getir('905550000099'), null);

  const yol = path.join(os.tmpdir(), `wa-bag-${process.pid}.json`);
  t.after(() => fs.rmSync(yol, { force: true }));
  const dosya = {
    oku() {
      try { return JSON.parse(fs.readFileSync(yol, 'utf8')); }
      catch (err) { if (err.code === 'ENOENT') return { baglar: {}, bekleyen: {}, discord: {}, kopruMesajlari: [] }; throw err; }
    },
    yaz(veri) { atomikYaz(yol, JSON.stringify(veri)); }
  };
  const kalici = bagDeposuOlustur(dosya);
  kalici.kaydet({ waId: WA, discordUserId: DISCORD_ID, discordAd: 'Ali' });
  const ham = JSON.parse(fs.readFileSync(yol, 'utf8'));
  assert.equal(ham.baglar[`whatsapp:${WA}`].discordUserId, DISCORD_ID);
  assert.equal(ham.baglar[DISCORD_ID], undefined);
  assert.equal(bagDeposuOlustur(dosya).getir(WA).discordAd, 'Ali');
});

test('imza doğru gövdeyi kabul eder, bozuk imzayı reddeder', () => {
  const raw = Buffer.from('{"ok":true}');
  const baslik = imzaBasligi(raw, SECRET);
  assert.equal(imzaGecerli(raw, baslik, SECRET), true);
  assert.equal(imzaGecerli(raw, 'sha256=ab', SECRET), false);
  assert.equal(imzaGecerli(raw, imzaBasligi(raw, 'baska'), SECRET), false);
});

test('webhook challenge doğrular', async t => {
  const port = await ac(t, { env: ortam(), bag: bagOlustur(), depo: depoOlustur(), gonder: async () => ({ gonderildi: true }) });
  const tamam = await istekAt(port, 'GET', '/webhook?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=12345');
  assert.equal(tamam.status, 200);
  assert.equal(tamam.body, '12345');
  const redd = await istekAt(port, 'GET', '/webhook?hub.mode=subscribe&hub.verify_token=yanlis&hub.challenge=12345');
  assert.equal(redd.status, 403);
});

test('geçerli imza işlenir, ikinci teslimat ve bozuk imza AI çağırmaz', async t => {
  const bag = bagOlustur();
  bag.kaydet({ waId: WA, discordUserId: DISCORD_ID, discordAd: 'Ali' });
  let ai = 0;
  const port = await ac(t, {
    env: ortam(),
    bag,
    depo: depoOlustur(),
    hizBeklemeMs: 0,
    gonder: async () => ({ gonderildi: true }),
    kopruYaz: async () => ({ id: 'k1' }),
    aiYanitla: async () => { ai += 1; return { metin: 'tamam' }; }
  });
  const body = paket({ id: 'wamid.ayni', text: 'manga' });
  const imza = imzaBasligi(body, SECRET);
  const ilk = await istekAt(port, 'POST', '/webhook', body, { 'x-hub-signature-256': imza });
  const ikinci = await istekAt(port, 'POST', '/webhook', body, { 'x-hub-signature-256': imza });
  const bozuk = await istekAt(port, 'POST', '/webhook', body, { 'x-hub-signature-256': 'sha256=deadbeef' });
  assert.equal(ilk.status, 200);
  assert.equal(ikinci.status, 200);
  assert.equal(bozuk.status, 403);
  assert.equal(ai, 1);
});

test('yapay zeka hatası sunucuyu düşürmez', async t => {
  const bag = bagOlustur();
  bag.kaydet({ waId: WA, discordUserId: DISCORD_ID, discordAd: 'Ali' });
  const giden = [];
  let tur = 0;
  const port = await ac(t, {
    env: ortam(),
    bag,
    depo: depoOlustur(),
    hizBeklemeMs: 0,
    gonder: async ({ metin }) => { giden.push(metin); return { gonderildi: true }; },
    kopruYaz: async () => null,
    aiYanitla: async () => {
      tur += 1;
      if (tur === 1) throw new Error('model kapalı');
      return { metin: 'ikinci yanıt' };
    }
  });
  const bir = paket({ id: 'wamid.hata', text: 'bölüm' });
  const iki = paket({ id: 'wamid.devam', text: 'devam' });
  const ilk = await istekAt(port, 'POST', '/webhook', bir, { 'x-hub-signature-256': imzaBasligi(bir, SECRET) });
  const sonra = await istekAt(port, 'POST', '/webhook', iki, { 'x-hub-signature-256': imzaBasligi(iki, SECRET) });
  assert.equal(ilk.status, 200);
  assert.equal(sonra.status, 200);
  assert.match(giden[0], /yanıt üretemedim/);
  assert.equal(giden[1], 'ikinci yanıt');
});

test('kayıtsız kullanıcıya AI yok; bağlanınca aynı hat yanıtlar ve telefon köprüde maskelenir', async t => {
  const bag = bagOlustur();
  const giden = [];
  const kopru = [];
  let ai = 0;
  const port = await ac(t, {
    env: ortam(),
    bag,
    depo: depoOlustur(),
    hizBeklemeMs: 0,
    gonder: async ({ metin }) => { giden.push(metin); return { gonderildi: true }; },
    kopruYaz: async ({ icerik }) => { kopru.push(icerik); return { id: `k${kopru.length}` }; },
    aiYanitla: async () => { ai += 1; return { metin: 'Berserk katalogda.' }; },
    discordIstek: async url => {
      assert.match(url, /\/users\/123456789012345678$/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: DISCORD_ID, username: 'ali', global_name: 'Ali' })
      };
    }
  });
  const gonder = async (id, text) => {
    const body = paket({ id, text });
    return istekAt(port, 'POST', '/webhook', body, { 'x-hub-signature-256': imzaBasligi(body, SECRET) });
  };
  assert.equal((await gonder('wamid.1', 'merhaba manga')).status, 200);
  assert.equal(ai, 0);
  assert.match(giden.at(-1), /Discord kullanıcı/);
  assert.equal(kopru.some(metin => metin.includes(WA)), false);
  assert.match(kopru[0], /90…33/);

  assert.equal((await gonder('wamid.2', DISCORD_ID)).status, 200);
  assert.equal(ai, 0);
  assert.match(giden.at(-1), /bağlandı \(Ali\)/);
  assert.equal(bag.getir(WA).discordUserId, DISCORD_ID);

  assert.equal((await gonder('wamid.3', 'berserk var mı')).status, 200);
  assert.equal(ai, 1);
  assert.equal(giden.at(-1), 'Berserk katalogda.');
  assert.match(kopru.at(-1), /Ali/);
});

test('yönetim isteği ve kapalı grup AI çağırmaz', async t => {
  const bag = bagOlustur();
  bag.kaydet({ waId: WA, discordUserId: DISCORD_ID, discordAd: 'Ali' });
  let ai = 0;
  const giden = [];
  const port = await ac(t, {
    env: ortam(),
    bag,
    depo: depoOlustur(),
    hizBeklemeMs: 0,
    gonder: async ({ metin }) => { giden.push(metin); return { gonderildi: true }; },
    kopruYaz: async () => null,
    aiYanitla: async () => { ai += 1; return { metin: 'olmaz' }; }
  });
  const ban = paket({ id: 'wamid.ban', text: 'şu üyeyi banla' });
  const grup = paket({ from: '905559998877', id: 'wamid.grup', text: 'selam', groupId: 'grp1' });
  await istekAt(port, 'POST', '/webhook', ban, { 'x-hub-signature-256': imzaBasligi(ban, SECRET) });
  await istekAt(port, 'POST', '/webhook', grup, { 'x-hub-signature-256': imzaBasligi(grup, SECRET) });
  assert.equal(ai, 0);
  assert.match(giden[0], /Discord yönetimi/);
  assert.equal(giden.length, 1);
});

test('sohbet belleği whatsapp anahtarındadır, telefon modele gitmez', async () => {
  const yazilan = [];
  let gorulen;
  const sonuc = await whatsappSohbetYanitla({
    waId: WA,
    metin: 'berserk severim',
    ad: 'Ali',
    discordUserId: DISCORD_ID
  }, {
    katalog: async () => '',
    hafizaOku: () => [],
    hafizaYaz: anahtar => yazilan.push(anahtar),
    aiUret: async opts => {
      gorulen = opts;
      return { metin: 'not aldım [ÖĞRENİLDİ: Berserk seviyor]' };
    }
  });
  assert.equal(gorulen.userId, `whatsapp:${WA}`);
  assert.notEqual(gorulen.userId, DISCORD_ID);
  assert.equal(String(gorulen.prompt).includes(WA), false);
  assert.equal(String(gorulen.system).includes(WA), false);
  assert.equal(yazilan[0], `whatsapp:${WA}`);
  assert.equal(sonuc.metin.includes('ÖĞRENİLDİ'), false);
  assert.match(sonuc.metin, /not aldım/);
});

test('pencere kapalıyken şablon yoksa Graph çağrılmaz', async () => {
  let cagri = 0;
  const uyarilar = [];
  const sonuc = await whatsappGonder({
    env: { WHATSAPP_ACCESS_TOKEN: 'test-token', WHATSAPP_PHONE_NUMBER_ID: PHONE },
    alici: { kimlik: WA },
    metin: 'selam',
    pencereAcik: () => false,
    istek: async () => { cagri += 1; return { ok: true, json: async () => ({}) }; },
    uyar: (...parca) => uyarilar.push(parca.join(' '))
  });
  assert.equal(sonuc.neden, 'sablon_yok');
  assert.equal(cagri, 0);
  assert.match(uyarilar.join('\n'), /WHATSAPP_TEMPLATE_NAME/);
  assert.equal(uyarilar.join('\n').includes(WA), false);
  assert.match(SABLON_UYARI, /24 saat/);
});

test('köprü yanıtı kayıtlı mesaja ve !wa önekine gider', async () => {
  const bag = bagOlustur();
  bag.kaydet({ waId: WA, discordUserId: DISCORD_ID, discordAd: 'Ali' });
  bag.kopruMesajKaydet('mesaj-1', WA);
  const giden = [];
  const gonder = async ({ alici, metin }) => {
    giden.push({ alici, metin });
    return { gonderildi: true };
  };
  await personelKopruYaniti({
    content: 'bakıyorum',
    author: { bot: false },
    reference: { messageId: 'mesaj-1' },
    react: async () => {}
  }, { bag, gonder });
  await personelKopruYaniti({
    content: `!wa ${DISCORD_ID} kataloga ekledim`,
    author: { bot: false },
    react: async () => {}
  }, { bag, gonder });
  assert.equal(giden[0].alici.kimlik, WA);
  assert.equal(giden[0].metin, 'bakıyorum');
  assert.equal(giden[1].metin, 'kataloga ekledim');
  assert.equal(kopruMesajiMi('999', '999'), true);
  assert.equal(kopruMesajiMi('998', '999'), false);
  assert.equal(kopruMesajiMi('999', ''), false);
});
