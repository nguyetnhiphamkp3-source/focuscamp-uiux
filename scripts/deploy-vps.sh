#!/usr/bin/env bash
# Manual deploy script for VPS (used when GH Actions billing is blocked).
# Pulls latest main, applies Prisma migrations, rebuilds image, recreates app.
set -e

cd /opt/focus-camp/app

echo "=== [1/6] Pull latest commits ==="
git fetch origin main
git clean -fd -- scripts/migrate-challenge.ts scripts/migration-data/ 2>/dev/null || true
git pull origin main --ff-only
echo "VPS: $(git log -1 --format='%h %s')"

echo "=== [2/6] Apply pending Prisma migrations ==="
docker compose -f /opt/focus-camp/docker-compose.yml exec -T app npx prisma@6.19.3 migrate deploy 2>&1 | tail -8 || echo "(migrate had non-zero exit, check above)"

echo "=== [3/6] Sync docker-compose.yml to parent dir ==="
cp -f docker-compose.yml /opt/focus-camp/docker-compose.yml

echo "=== [4/6] Rebuild image ==="
DOCKER_BUILDKIT=1 docker buildx build --load -t ghcr.io/duongtrongnghia/focus-camp:latest . 2>&1 | tail -4

echo "=== [5/6] Restart app ==="
cd /opt/focus-camp
docker compose up -d --force-recreate app

echo "=== [6/6] Healthcheck ==="
for i in $(seq 1 30); do
  if docker compose exec -T app wget -q -O /dev/null http://127.0.0.1:3000/api/health 2>/dev/null; then
    echo "App healthy after ${i}s"; break
  fi
  sleep 2
done
docker image prune -f >/dev/null 2>&1 || true

echo "=== DONE ==="
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
