#!/usr/bin/env bash
# Export 21 challenge tasks từ taip.io prod → scripts/migration-data/tasks.json
#
# Cách dùng:
#   bash scripts/taip-export.sh
#
# Yêu cầu: SSH access vào taip.io (103.97.126.56 port 2018)
# Sẽ hỏi password SSH khi chạy.

set -euo pipefail

TAIP_HOST="103.97.126.56"
TAIP_PORT="2018"
TAIP_USER="${TAIP_USER:-root}"
EXPEDITION_ID="${EXPEDITION_ID:-1}"
OUT_DIR="$(dirname "$0")/migration-data"

mkdir -p "$OUT_DIR"

echo "▸ Connecting to taip.io (${TAIP_HOST}:${TAIP_PORT})..."

# Export expedition info
ssh -p "$TAIP_PORT" "${TAIP_USER}@${TAIP_HOST}" "
  psql the_all_in_plan -t -A -c \"
    SELECT row_to_json(e) FROM (
      SELECT id, title, description, difficulty, required_days, max_members,
             deposit_aip, status, starts_at, ends_at, slug,
             freeze_from_day, freeze_starts_at, freeze_ends_at
      FROM expeditions WHERE id = ${EXPEDITION_ID} LIMIT 1
    ) e;
  \"
" > "$OUT_DIR/expedition.json"
echo "✓ expedition.json"

# Export 21 tasks
ssh -p "$TAIP_PORT" "${TAIP_USER}@${TAIP_HOST}" "
  psql the_all_in_plan -t -A -c \"
    SELECT json_agg(t ORDER BY t.day_number) FROM (
      SELECT day_number, title, description, label, sop_content,
             video_url, meeting_at, evidence_type, evidence_label
      FROM challenge_tasks
      WHERE expedition_id = ${EXPEDITION_ID}
    ) t;
  \"
" > "$OUT_DIR/tasks.json"

TASK_COUNT=$(ssh -p "$TAIP_PORT" "${TAIP_USER}@${TAIP_HOST}" \
  "psql the_all_in_plan -t -A -c \"SELECT COUNT(*) FROM challenge_tasks WHERE expedition_id=${EXPEDITION_ID};\"")
echo "✓ tasks.json (${TASK_COUNT} tasks)"

echo ""
echo "✅ Export done → $OUT_DIR"
echo "   Bước tiếp: pnpm tsx scripts/migrate-challenge.ts"
