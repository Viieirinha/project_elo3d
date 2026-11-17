#!/usr/bin/env bash
# Deploy manual: ./deploy.sh root@IP_DO_VPS
# Gera o build do frontend, envia frontend + API, aplica o schema e reinicia a API.
set -euo pipefail

VPS="${1:-${VPS:-}}"
[ -n "$VPS" ] || { echo "Uso: ./deploy.sh usuario@host"; exit 1; }
cd "$(dirname "$0")"

echo ">> Build do frontend"
npm ci
npm run build

echo ">> Enviando arquivos"
rsync -az --delete dist/ "$VPS:/var/www/elo3d/dist/"
rsync -az --delete --exclude node_modules --exclude '.env' server/ "$VPS:/opt/elo3d/server/"

echo ">> Atualizando API no servidor"
ssh "$VPS" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/elo3d/server
npm ci --omit=dev --silent
chown -R root:elo3d /opt/elo3d && chmod -R g+rX /opt/elo3d
set -a; . /etc/elo3d/api.env; set +a
node src/migrate.js
systemctl restart elo3d-api
sleep 2
curl -fsS http://127.0.0.1:3001/api/health && echo
REMOTE

echo ">> Pronto: https://elo3d.wmbens.cloud"
