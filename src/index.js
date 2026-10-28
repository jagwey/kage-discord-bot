import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import http from 'http';
import { yedektenGeriYukle, yedeklemeyiBaslat } from './services/kalicilikServisi.js';

globalThis.__kageDurum = {
  durum: 'starting',
  detay: 'Bot başlatılıyor.',
  sonDegisim: new Date().toISOString()
};

// Render portu hızlı bulamazsa servisi öldürür. Yedek geri yükleme Discord'a bağlı
// olduğu için yavaşlayabilir; bu yüzden port hemen açılır, gerçek sunucu gelince
// bot.js bu yer tutucuyu kapatır.
globalThis.__erkenSunucu = http.createServer((req, res) => {
  const durum = globalThis.__kageDurum?.durum || 'starting';
  const canli = durum === 'online' || durum === 'starting';
  res.writeHead(canli ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    status: durum,
    bot: 'Kage',
    detail: globalThis.__kageDurum?.detay || 'Başlatılıyor.',
    time: new Date().toISOString()
  }));
}).listen(process.env.PORT || 3000, '0.0.0.0');

// Veri dosyaları servisler yüklenmeden önce Discord yedeğinden geri getirilir;
// bot.js ve servisleri bu yüzden geri yüklemeden sonra içe aktarılır.
await yedektenGeriYukle({ timeoutMs: 8000 });
await import('./bot.js');
yedeklemeyiBaslat();
