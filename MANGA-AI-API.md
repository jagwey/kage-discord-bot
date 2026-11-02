# Kage95 ortak AI API

`npm run start:ai` ayrı süreç açar; Discord login/komut/olaylarını başlatmaz.
`127.0.0.1:3095` üzerinde dinler. Dış erişim yalnızca HTTPS ters proxy üzerinden olmalıdır.

Sunucu ortamı: `KAGE_AI_SHARED_SECRET` (en az 32 rastgele karakter), `KAGE_AI_PORT=3095`.
Botta kullanılan `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` aynı sunucu gizli ayarlarından okunur.
Bölüm görselleri Gemini gerektirir. Anahtarları git'e, tarayıcıya veya günlük kayıtlarına koymayın.

- `POST /v1/manga/rank`: `{query,candidates:[{id,text}],preferences?}` → `{ids:[...]}`.
- `POST /v1/chapter/ask`: `{question,imageBase64,mimeType}` → `{yanit}`.
- Her ikisi `Authorization: Bearer <shared secret>` ister. CORS açılmaz.
- Dakikada toplam 20 yetkili istek, aynı anda 1 AI çağrısı. `429` ve `Retry-After: 60`.
- 10 dakika / en fazla 500 sonuç önbelleği. Anahtar, soru ve aday/tercih/görsel içeriğinin hash'idir.
- Aramada en fazla 25 × 800 karakter aday; 500 karakter sorgu; Groq/OpenRouter için sağlayıcı başına tek model. Gemini mevcut model yedeğini toplam zaman bütçesi içinde kullanır.
- Groq → Gemini → OpenRouter, toplam 20 saniye bütçe. Web araması Pollinations kullanmaz.
- Web çağrıları Discord hafızasını okumaz/yazmaz. Gölge Göz moderasyon olayları siteye taşınmaz.

Örnek Nginx HTTPS sunucu bloğu içine (sertifika ve alan adı mevcut TLS yapılandırmasından):

```nginx
location ~ ^/v1/(manga/rank|chapter/ask)$ {
    client_max_body_size 2100k;
    proxy_pass http://127.0.0.1:3095;
    proxy_set_header Authorization $http_authorization;
    proxy_read_timeout 30s;
    proxy_connect_timeout 3s;
}
```

3095 portunu internete açmayın. Proxy loglarına istek gövdesi/Authorization eklemeyin.
Mevcut Discord sürecini değiştirmeden yeni süreci servis yöneticisiyle başlatın; yalnızca bir AI örneği kullanın.
Örnek mevcut PM2 kurulumu varsa: `pm2 start src/mangaAiApi.js --name kage-ai --instances 1`.
API anahtarları iki sürecin sağlayıcı kotasını ortak tüketir; web için ayrı düşük kotalı sağlayıcı anahtarı tanımlanabilir.

`npm test` tüm bot ve API testlerini çalıştırır. Testler gerçek AI çağrısı yapmaz.
