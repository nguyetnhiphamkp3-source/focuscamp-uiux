#!/usr/bin/env bash
# Mark all PRE-EXISTING communities as GRANDFATHER tier (free lifetime).
# Run ONCE on VPS after first deploy of the monetization feature, BEFORE any new
# community is created. Idempotent: only sets rows where planTier is the default
# 'SOLO' AND planExpiresAt IS NULL (i.e., schema migration default not paid).
#
# Usage: bash scripts/grandfather-communities.sh
#
# Run inside the docker compose env (DATABASE_URL must be set):
#   docker compose exec app bash scripts/grandfather-communities.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set. Aborting."
  exit 1
fi

echo "Grandfathering existing communities…"

# Apply ONLY to communities that existed BEFORE the schema added planTier.
# Easy heuristic: planExpiresAt IS NULL AND planTier = 'SOLO' (schema default).
# After this, any new community will start with planExpiresAt = null and
# planTier = chosen tier (SOLO/PRO/AGENCY) — they are PENDING payment.
#
# WARNING: run this BEFORE allowing new community creation, otherwise new
# pending communities would also flip to GRANDFATHER. Add a one-shot guard
# below: only flip rows where createdAt < cutoff.

CUTOFF="${GRANDFATHER_CUTOFF:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
echo "Cutoff timestamp: $CUTOFF"

psql "$DATABASE_URL" <<SQL
UPDATE "Community"
SET "planTier" = 'GRANDFATHER',
    "planExpiresAt" = NULL
WHERE "planTier" = 'SOLO'
  AND "planExpiresAt" IS NULL
  AND "createdAt" < '$CUTOFF';

SELECT id, slug, name, "planTier", "planExpiresAt", "createdAt"
FROM "Community"
ORDER BY "createdAt";
SQL

echo "Done."
