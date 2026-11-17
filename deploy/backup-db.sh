#!/usr/bin/env bash
# Backup do banco ELO 3D: dump comprimido, verificado, com rotação.
# Instalado em /usr/local/sbin/elo3d-backup e agendado pelo elo3d-backup.timer.
set -euo pipefail

DIR="${BACKUP_DIR:-/var/backups/elo3d}"
DB="${BACKUP_DB:-elo3d}"
DIAS="${BACKUP_DIAS:-14}"

umask 077
mkdir -p "$DIR"
ARQ="$DIR/elo3d-$(date +%Y%m%d-%H%M%S).sql.gz"
TMP="$ARQ.partial"
trap 'rm -f "$TMP"' EXIT

# pipefail garante que uma falha do pg_dump derruba o script (e não grava um arquivo "bom").
runuser -u postgres -- pg_dump --clean --if-exists "$DB" | gzip -9 > "$TMP"
gzip -t "$TMP"
zcat "$TMP" | grep -q 'PostgreSQL database dump complete' || { echo "Dump incompleto." >&2; exit 1; }
mv "$TMP" "$ARQ"

# Só apaga os antigos depois de ter um backup novo válido.
find "$DIR" -maxdepth 1 -name 'elo3d-*.sql.gz' -mtime +"$DIAS" -delete

echo "Backup OK: $ARQ ($(du -h "$ARQ" | cut -f1)); $(find "$DIR" -maxdepth 1 -name 'elo3d-*.sql.gz' | wc -l) arquivo(s) guardados."
