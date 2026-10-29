/**
 * Oracle pm2 süreç adı: kage-discord-bot.
 * Geçersiz / yetkisiz token çıkış kodu 78 (src/discordKimlik.js FATAL_AUTH_CIKIS).
 * stop_exit_codes bu kodda süreci durdurur; ağ hatası (çıkış 1) sınırlı restart alır.
 *
 * min_uptime, başarısız açılışın (login denemeleri ~2 dk) kararsız sayılması içindir.
 * Süreç bu süreden uzun ayakta kalırsa sonraki çökme normal restart hakkını korur.
 * pm2 üstel beklemeyi 15 sn'de tavana vurur.
 *
 * Eski `pm2 start src/index.js` kaydı bu dosyayı okumaz. Güncellemeden sonra bir kez:
 *   pm2 delete kage-discord-bot
 *   pm2 start ecosystem.config.cjs --update-env
 *   pm2 save
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
      max_restarts: 10,
      min_uptime: 180000,
      exp_backoff_restart_delay: 1000,
      stop_exit_codes: [78]
    }
  ]
};
