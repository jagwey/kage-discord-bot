// Yavaş ağlarda Discord'a bağlanma 10 sn'den uzun sürebilir; varsayılan undici bağlantıyı bu yüzden koparıyordu.
// REST istekleri bu ajanla, bağlantı süresi 60 sn olarak yapılır.
import { Agent } from 'undici';

export const ajan = new Agent({ connect: { timeout: 60000 } });
