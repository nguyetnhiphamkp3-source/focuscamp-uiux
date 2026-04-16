#!/usr/bin/env bash
# One-time script: convert current DB (managed by `prisma db push`) to migration-based.
# Run on VPS ONCE after deploying this commit.
#
# What it does:
# 1. Generate a baseline migration from current schema
# 2. Mark it as already applied so Prisma doesn't re-run it
# 3. Future schema changes use `prisma migrate dev` locally + `migrate deploy` in CI

set -euo pipefail

cd "$(dirname "$0")/.."

MIGRATION_NAME=${1:-initial}
MIGRATION_DIR="prisma/migrations/0_${MIGRATION_NAME}"

if [ -d "$MIGRATION_DIR" ]; then
  echo "Migration $MIGRATION_DIR already exists — abort."
  exit 1
fi

mkdir -p "$MIGRATION_DIR"
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$MIGRATION_DIR/migration.sql"

echo "Generated $MIGRATION_DIR/migration.sql"
echo ""
echo "Marking as applied against current DB..."
npx prisma migrate resolve --applied "0_${MIGRATION_NAME}"

echo ""
echo "✅ Baseline migration created + marked applied."
echo "Future changes: edit schema.prisma → 'pnpm prisma migrate dev --name my_change' locally."
echo "On deploy: 'npx prisma migrate deploy' instead of 'db push'."
