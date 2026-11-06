/**
 * Oracle pm2 süreç adı: kage-discord-bot.
 *
 * Çıkış 78 (src/discordKimlik.js FATAL_AUTH_CIKIS): geçersiz veya sıfırlanmış token,
 * Gateway 4004/401 veya Invalidated. Yeniden deneme yok.
 * Çıkış 79 (src/oturumSiniri.js IDENTIFY_TAVAN_CIKIS): kayan bir saatte 5 IDENTIFY.
 * stop_exit_codes bu kodlarda süreci durdurur; pm2 yeniden başlatmaz.
 * Ağ hatası (çıkış 1) en fazla 3 kararsız yeniden başlatma alır.
 *
 * Token Discord tarafından sıfırlandıysa döngü kurma. Sırayla, bir kez:
 *   pm2 stop kage-discord-bot
 *   # .env içindeki DISCORD_TOKEN değerini yenile
 *   pm2 start ecosystem.config.cjs --update-env
 *   pm2 save
 * Eski `pm2 start src/index.js` kaydı bu dosyayı okumaz.
 *
 * min_uptime, bu süreden kısa ömrü kararsız sayar.
 * .runtime/discord-oturum.json saatlik sayacı tutar; silmek tavanı sıfırlar.
 * Çıkış 79'dan hemen sonra start, pencerede beş kayıt duruyorsa yine 79 verir.
 *
 * kage-whatsapp-bot ayrı süreçtir ve Discord Gateway açmaz.
 * Çıkış 76: WHATSAPP_ENABLED kapalı. Çıkış 77: zorunlu WhatsApp ortamı eksik.
 * İkisi de stop_exit_codes içindedir; pm2 bu çıkışlarda döngü kurmaz.
 * Açmak için .env içinde WHATSAPP_ENABLED=1 ve:
 *   pm2 start ecosystem.config.cjs --only kage-whatsapp-bot --update-env
 */
module.exports = {
  apps: [
    {
      name: 'kage-discord-bot',
      script: 'src/index.js',
      cwd: __dirname,
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      kill_timeout: 25000,
      autorestart: true,
      max_restarts: 3,
      min_uptime: 180000,
      exp_backoff_restart_delay: 1000,
      stop_exit_codes: [78, 79]
    },
    {
      name: 'kage-whatsapp-bot',
      script: 'src/whatsapp/index.js',
      cwd: __dirname,
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      kill_timeout: 8000,
      autorestart: true,
      max_restarts: 5,
      min_uptime: 5000,
      exp_backoff_restart_delay: 1000,
      stop_exit_codes: [76, 77]
    }
  ]
};
