#!/usr/bin/env bash
# Oracle VM üretim güncellemesi.
# Beklenen yol: ~/kage-discord-bot/guncelle.sh
# Akış: git pull, bağımlılık kurulumu, yalnızca çevrimiçi süreci yenile.
# Durmuş süreci başlatmaz. Token sıfırından sonra bir kez elle:
#   pm2 start ecosystem.config.cjs --update-env && pm2 save
set -euo pipefail

cd "$(dirname "$0")"

git pull --ff-only

# package-lock.json .gitignore'da. Kilit makinede varsa npm ci;
# yoksa npm ci başarısız olacağı için npm install.
if [[ -f package-lock.json ]]; then
  npm ci
else
  echo "package-lock.json yok; npm install çalıştırılıyor." >&2
  npm install
fi

# Durmuş süreç (token sıfırlama sonrası) burada açılmaz.
durum="$(pm2 jlist 2>/dev/null | node --input-type=module -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", c => { raw += c; });
process.stdin.on("end", () => {
  try {
    const liste = JSON.parse(raw || "[]");
    const app = liste.find(a => a.name === "kage-discord-bot");
    process.stdout.write(app?.pm2_env?.status || "yok");
  } catch {
    process.stdout.write("bilinmiyor");
  }
});
' || true)"

if [[ "$durum" == "online" ]]; then
  pm2 startOrReload ecosystem.config.cjs --update-env
else
  echo "kage-discord-bot durumu: ${durum:-bilinmiyor}. Otomatik başlatılmadı." >&2
  echo "Token tamamsa bir kez: pm2 start ecosystem.config.cjs --update-env && pm2 save" >&2
fi
pm2 save
