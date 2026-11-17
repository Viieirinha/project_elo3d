#!/usr/bin/env bash
# Deploy feito DENTRO do VPS (ex.: pelo web console da Hostinger).
# Uso, a partir do clone do repositório no servidor:
#   cd /opt/elo3d-src && bash deploy/deploy-no-servidor.sh
# Baixa a versão mais recente, gera o build, publica o front e a API, aplica o schema e reinicia a API.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Rode como root."; exit 1; }
cd "$(dirname "$0")/.."
REPO="$(pwd)"

echo ">> Atualizando o código"
git pull --ff-only

echo ">> Build do frontend"
npm ci --no-audit --no-fund
npm run build

echo ">> Publicando"
rsync -a --delete dist/ /var/www/elo3d/dist/
rsync -a --delete --exclude node_modules server/ /opt/elo3d/server/

echo ">> Nginx (cabeçalhos de segurança e cache; com teste e rollback)"
bash "$REPO/deploy/aplicar-nginx.sh"

echo ">> Atualizando a API"
cd /opt/elo3d/server
npm ci --omit=dev --no-audit --no-fund --silent
chown -R root:elo3d /opt/elo3d && chmod -R g+rX /opt/elo3d
set -a; . /etc/elo3d/api.env; set +a
node src/migrate.js
systemctl restart elo3d-api
sleep 2
curl -fsS http://127.0.0.1:3001/api/health && echo
echo ">> Pronto."
