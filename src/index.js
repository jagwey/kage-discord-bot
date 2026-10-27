import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import { yedektenGeriYukle, yedeklemeyiBaslat } from './services/kalicilikServisi.js';

// Veri dosyaları servisler yüklenmeden önce Discord yedeğinden geri getirilir;
// bot.js ve servisleri bu yüzden geri yüklemeden sonra içe aktarılır.
await yedektenGeriYukle();
await import('./bot.js');
yedeklemeyiBaslat();
