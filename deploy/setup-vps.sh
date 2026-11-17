#!/usr/bin/env bash
# Configuração inicial do VPS (Ubuntu 24.04). Rodar UMA vez, como root, no servidor:
#   bash setup-vps.sh
# É seguro rodar de novo: não recria banco, usuário nem segredos já existentes.
set -euo pipefail

DOMINIO="elo3d.wmbens.cloud"
DIR_APP="/opt/elo3d"
DIR_WEB="/var/www/elo3d"
ENV_FILE="/etc/elo3d/api.env"

[ "$(id -u)" -eq 0 ] || { echo "Rode como root."; exit 1; }

# --- A porta 80 precisa estar livre ou ser do Nginx ---
DONO80=$(ss -ltnpH 'sport = :80' 2>/dev/null | grep -oP 'users:\(\("\K[^"]+' | head -1 || true)
if [ -n "$DONO80" ] && [ "$DONO80" != "nginx" ]; then
  echo "A porta 80 está em uso por '$DONO80', não pelo Nginx."
  echo "Este setup usa Nginx. Me avise qual servidor é (ex.: apache2) antes de continuar."
  exit 1
fi

echo ">> Instalando pacotes..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx postgresql certbot python3-certbot-nginx rsync curl ca-certificates openssl

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo ">> Instalando Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

echo ">> Usuário e diretórios..."
id elo3d >/dev/null 2>&1 || useradd --system --home "$DIR_APP" --shell /usr/sbin/nologin elo3d
mkdir -p "$DIR_APP/server" "$DIR_WEB/dist" /etc/elo3d

if [ ! -f "$ENV_FILE" ]; then
  echo ">> Criando banco e segredos..."
  DB_PASS=$(openssl rand -hex 24)
  JWT=$(openssl rand -hex 32)
  CONVITE=$(openssl rand -hex 4)
  su postgres -c "psql -v ON_ERROR_STOP=1 -qc \"CREATE USER elo3d WITH PASSWORD '$DB_PASS'\" -c \"CREATE DATABASE elo3d OWNER elo3d\""
  umask 077
  cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgres://elo3d:$DB_PASS@127.0.0.1:5432/elo3d
JWT_SECRET=$JWT
CODIGO_CONVITE=$CONVITE
PORT=3001
ENV
  chown root:elo3d "$ENV_FILE"; chmod 640 "$ENV_FILE"
  echo "   Código de convite para cadastro: $CONVITE  (guardado em $ENV_FILE)"
else
  echo ">> $ENV_FILE já existe, mantido."
fi

echo ">> Serviço da API e Nginx..."
SRC="$(cd "$(dirname "$0")" && pwd)"
install -m 644 "$SRC/elo3d-api.service" /etc/systemd/system/elo3d-api.service
install -m 644 "$SRC/nginx.conf" /etc/nginx/sites-available/elo3d
ln -sf /etc/nginx/sites-available/elo3d /etc/nginx/sites-enabled/elo3d
nginx -t

echo ">> Backup diário do banco..."
install -m 755 "$SRC/backup-db.sh" /usr/local/sbin/elo3d-backup
install -m 644 "$SRC/elo3d-backup.service" /etc/systemd/system/elo3d-backup.service
install -m 644 "$SRC/elo3d-backup.timer" /etc/systemd/system/elo3d-backup.timer

systemctl daemon-reload
systemctl enable --now postgresql nginx
systemctl enable --now elo3d-backup.timer
systemctl reload nginx

cat <<MSG

Setup concluído. Backups diários em /var/backups/elo3d (14 dias). Teste agora com:
  systemctl start elo3d-backup && ls -lh /var/backups/elo3d

Próximos passos:
  1) No seu computador:  ./deploy.sh root@IP_DO_VPS      (envia o app e sobe a API)
  2) Com o DNS de $DOMINIO já apontando para este servidor, aqui no VPS:
       certbot --nginx -d $DOMINIO
MSG
