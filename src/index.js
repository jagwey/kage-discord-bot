import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import http from 'http';
import { yedektenGeriYukle, yedeklemeyiBaslat } from './services/kalicilikServisi.js';

// Render portu hızlı bulamazsa servisi öldürür. Yedek geri yükleme Discord'a bağlı
// olduğu için yavaşlayabilir; bu yüzden port hemen açılır, gerçek sunucu gelince
// bot.js bu yer tutucuyu kapatır.
globalThis.__erkenSunucu = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Kage-95 ayaga kalkiyor');
}).listen(process.env.PORT || 3000, '0.0.0.0');

// Veri dosyaları servisler yüklenmeden önce Discord yedeğinden geri getirilir;
// bot.js ve servisleri bu yüzden geri yüklemeden sonra içe aktarılır.
await yedektenGeriYukle();
await import('./bot.js');
yedeklemeyiBaslat();
