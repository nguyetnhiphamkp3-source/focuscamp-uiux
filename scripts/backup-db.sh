#!/usr/bin/env bash
# Daily Postgres backup for focus.camp
# Installation on VPS:
#   1. Copy this file to /opt/focus-camp/backup-db.sh
#   2. chmod +x /opt/focus-camp/backup-db.sh
#   3. Add cron: `crontab -e` → add line:
#      0 3 * * * /opt/focus-camp/backup-db.sh >> /var/log/focus-camp-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/opt/focus-camp/backups"
CONTAINER="focus-camp-db"
DB_NAME="focuscamp"
DB_USER="focuscamp"
RETAIN_DAYS=7

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/focuscamp-$STAMP.sql.gz"

echo "[$(date -u +%FT%TZ)] Starting backup → $FILE"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$FILE"

SIZE=$(du -h "$FILE" | cut -f1)
echo "[$(date -u +%FT%TZ)] Backup complete ($SIZE)"

# Prune old backups
find "$BACKUP_DIR" -name "focuscamp-*.sql.gz" -type f -mtime +$RETAIN_DAYS -delete
echo "[$(date -u +%FT%TZ)] Pruned backups older than $RETAIN_DAYS days"
