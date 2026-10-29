#!/usr/bin/env bash
# Oracle VM üretim güncellemesi.
# Beklenen yol: ~/kage-discord-bot/guncelle.sh
# Akış: git pull, bağımlılık kurulumu, pm2 restart.
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

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
