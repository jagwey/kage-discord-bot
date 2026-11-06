# WhatsApp Business Cloud API

WhatsApp, Kage’nin ikinci arayüzüdür. Konuşma beyni Discord’daki ile aynı model ağıdır (`akilliAiUret`: Gemini, Groq, OpenRouter, Pollinations). Ban, rol, kanal ve Ryo gibi Discord yönetim araçları bu hatta yoktur. Ürün genel amaçlı bir sohbet botu değil; Kage95 manga keşfi ve site desteğidir.

Süreçler ayrıdır:

- `kage-discord-bot` → `src/index.js` (Discord Gateway, değişmeden)
- `kage-whatsapp-bot` → `src/whatsapp/index.js` (yalnızca HTTP webhook)

WhatsApp süreci Discord’a ikinci kez `login` olmaz. Köprü kanalına yazmak ve üye doğrulamak REST ile yapılır. İki Gateway oturumu aynı bot tokenini düşürür.

## Jagwey’in Meta’dan dolduracağı değişkenler

Meta Developer Console → uygulama → WhatsApp → API Setup, ve App settings → Basic:

| Değişken | Nereden |
| --- | --- |
| `WHATSAPP_VERIFY_TOKEN` | Sen seçersin. Aynı değeri webhook formuna yaz. |
| `WHATSAPP_APP_SECRET` | App settings → Basic → App secret |
| `WHATSAPP_ACCESS_TOKEN` | Kalıcı sistem kullanıcısı tokeni. Geçici 24 saatlik tokeni üretme. |
| `WHATSAPP_PHONE_NUMBER_ID` | API Setup → Phone number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | API Setup → WhatsApp Business Account ID |
| `WHATSAPP_ENABLED` | `1` |
| `WHATSAPP_PORT` | Varsayılan `3100`. Discord `PORT` (3000) ile karıştırma. |
| `WHATSAPP_BRIDGE_CHANNEL_ID` | Personelin baktığı Discord metin kanalının ID’si |
| `DISCORD_TOKEN` | Zaten var. Köprü ve üye araması bunu kullanır. |
| `GUILD_ID` | Doluysa kayıt, hesabın bu sunucuda olduğunu doğrular. |

İsteğe bağlı: `WHATSAPP_ALLOWLIST` (virgülle wa_id), `WHATSAPP_GROUPS=1`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANG` (varsayılan `tr`).

Bu değerleri `.env` içine yaz. Repoya koyma.

## Webhook

Meta callback URL: `https://<alan>/webhook`

Doğrulama: `GET` `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`.

Mesaj: `POST`. `X-Hub-Signature-256` HMAC SHA256, anahtar `WHATSAPP_APP_SECRET`. Tutmazsa 403.

Abone olunacak alan: `messages`.

Yerelde:

```bash
npm run whatsapp
```

`WHATSAPP_ENABLED=1` ve dört zorunlu anahtar (`VERIFY_TOKEN`, `APP_SECRET`, `ACCESS_TOKEN`, `PHONE_NUMBER_ID`) yoksa süreç açılmaz (çıkış 76 veya 77). Sağlık: `GET /health`.

Meta test numarası API Setup sayfasındaki alıcı listesine eklenir. İlk yazışma oradan gider.

## nginx

Meta düz HTTP kabul etmez. Örnek:

```nginx
location /webhook {
  proxy_pass http://127.0.0.1:3100;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Sertifika Let’s Encrypt ile 443’te durur. Uygulama yalnızca yerel `3100` dinler.

## Kayıt

İlk WhatsApp mesajında tam Kage beyni çalışmaz. Kullanıcı Discord kullanıcı adını veya 17-20 haneli kullanıcı ID’sini yollar. Eşleme `data/whatsapp_bag.json` içine yazılır: `whatsapp:<wa_id>` ↔ `discordUserId`. Dosya `data/` altında olduğu için git’e girmez.

`GUILD_ID` varsa ID sunucu üyeliğiyle, kullanıcı adı üye aramasıyla doğrulanır. `GUILD_ID` yoksa yalnızca rakam ID kabul edilir (`GET /users/{id}`). Aynı Discord hesabı iki WhatsApp hattına bağlanamaz.

Konuşma notları `data/whatsapp_hafiza.json` içinde, anahtar `whatsapp:<wa_id>` olur. Discord’un `kage_hafiza.json` dosyasına yazılmaz. İki PM2 süreci aynı tam-dosya önbelleği yazarsa birbirinin kaydını siler; bu yüzden bellek dosyaları ayrı, anahtarlar da ayrıdır. Bağlantı kimliği gösterir, hafızayı birleştirmez.

## Köprü kanalı

`WHATSAPP_BRIDGE_CHANNEL_ID` doluysa sıra şöyledir:

1. Gelen yazı köprü kanalına düşer (Discord görünen adı + maskeli kimlik, tam telefon yok).
2. Kayıt tamamsa aynı Kage ağı yanıt üretir.
3. Yanıt WhatsApp’a gider.
4. Aynı yanıt, gelen köprü mesajına reply olarak yansır.

Personel o reply’a cevap yazarsa metin Cloud API ile ilgili hatta gider. Alternatif: `!wa <discordId> metin`. Köprü kanalındaki diğer yazılar Kage sohbetine, XP’ye ve ekonomiye girmez.

## 24 saat

Kullanıcı yazdıktan sonra 24 saat içinde serbest metin gider. Süre `whatsapp_bag.json` içindeki `sonGelen` ile tutulur. Pencere kapalıysa ve `WHATSAPP_TEMPLATE_NAME` doluysa onaylı şablon denenir. Şablon adı boşsa gönderim yapılmaz; log: `Onaylı şablon yapılandırılmamış (WHATSAPP_TEMPLATE_NAME boş)`.

## Gruplar

Bu bir Discord botu gibi arkadaş grubuna eklenemez. Cloud API grupları yalnızca Meta olayı iletirse ve işletme o grubun tarafıysa çalışır (`group_id`, `phone_number_id`). Varsayılan kapalıdır. `WHATSAPP_GROUPS=1` iken gelen grup metni, grubun kendisine yanıtlanır. Personel köprüsü yine kişinin 1:1 hattına yazar.

Resmi özet: [Group messaging](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/groups-messaging).

## Politika

Meta Terms §4.7 (15 Ocak 2026): WhatsApp Business Platform’da birincil ürünü genel amaçlı yapay zeka asistanı olan botlar yasaktır. Bu hat Kage95 manga keşfi ve kullanıcı desteğidir. “ChatGPT ol” isteği reddedilir. Discord yönetim komutları çalıştırılmaz.

## PM2

```bash
pm2 start ecosystem.config.cjs --only kage-whatsapp-bot --update-env
pm2 save
```

`guncelle.sh` yalnızca çevrimiçi süreci yeniler. Kapalı WhatsApp sürecini kendiliğinden açmaz. Discord süreci ayrı adla durur.

`wamid` mükerrerliği süreç belleğindedir. Restart sonrası Meta aynı mesajı yeniden yollarsa ikinci bir yanıt gidebilir.
