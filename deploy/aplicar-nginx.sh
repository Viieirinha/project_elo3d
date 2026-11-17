#!/usr/bin/env bash
# Instala/atualiza a configuração do Nginx do ELO 3D com segurança:
#  - o arquivo do site só define domínio e HTTPS; o resto vem do snippet (atualizável sem tocar no certbot);
#  - testa com `nginx -t` e, se falhar, restaura a configuração anterior sem recarregar nada.
# Seguro para rodar quantas vezes quiser. Rode como root.
set -euo pipefail

DOMINIO="elo3d.wmbens.cloud"
SITE="/etc/nginx/sites-available/elo3d"
SNIPPET="/etc/nginx/snippets/elo3d-app.conf"
CERT="/etc/letsencrypt/live/$DOMINIO"
AQUI="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Rode como root."; exit 1; }
mkdir -p /etc/nginx/snippets

BKP="$(mktemp -d)"
[ -f "$SITE" ] && cp -a "$SITE" "$BKP/site"
[ -f "$SNIPPET" ] && cp -a "$SNIPPET" "$BKP/snippet"

restaurar() {
  echo "!! Configuração inválida, restaurando a anterior." >&2
  if [ -f "$BKP/site" ]; then cp -a "$BKP/site" "$SITE"; else rm -f "$SITE" /etc/nginx/sites-enabled/elo3d; fi
  if [ -f "$BKP/snippet" ]; then cp -a "$BKP/snippet" "$SNIPPET"; else rm -f "$SNIPPET"; fi
}

install -m 644 "$AQUI/nginx-app.conf" "$SNIPPET"

if [ -f "$CERT/fullchain.pem" ]; then
  cat > "$SITE" <<CONF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMINIO;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMINIO;

    ssl_certificate     $CERT/fullchain.pem;
    ssl_certificate_key $CERT/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    include $SNIPPET;
}
CONF
  MODO="HTTPS"
else
  cat > "$SITE" <<CONF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMINIO;

    include $SNIPPET;
}
CONF
  MODO="HTTP (rode: certbot --nginx -d $DOMINIO)"
fi

ln -sf "$SITE" /etc/nginx/sites-enabled/elo3d

if nginx -t 2>/dev/null; then
  systemctl reload nginx
  echo "Nginx atualizado: $MODO"
else
  nginx -t || true
  restaurar
  exit 1
fi
