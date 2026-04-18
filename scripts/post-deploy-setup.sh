#!/usr/bin/env bash
#
# ONE-TIME post-deploy setup script.
# SSH vào VPS, chạy: bash /opt/focus-camp/app/scripts/post-deploy-setup.sh
# Xong rồi không cần chạy lại.
#
set -euo pipefail

echo ""
echo "========================================="
echo "  focus.camp — Post-deploy setup"
echo "========================================="
echo ""

cd /opt/focus-camp

# 1. Thêm REDIS_URL nếu chưa có
echo "[1/6] Checking REDIS_URL in .env..."
if grep -q "REDIS_URL" app/.env 2>/dev/null; then
  echo "  → Already set, skipping."
else
  echo 'REDIS_URL=redis://redis:6379' >> app/.env
  echo "  → Added REDIS_URL=redis://redis:6379"
fi

# 2. Pull code mới nhất
echo ""
echo "[2/6] Pulling latest code..."
cd app
git fetch origin main
git checkout main
git pull origin main --ff-only
cd /opt/focus-camp

# 3. Pull new Docker image + start all services (including Redis)
echo ""
echo "[3/6] Starting all services (app + db + redis)..."
docker compose pull app 2>/dev/null || true
docker compose up -d
echo "  → Waiting for services to be ready..."
sleep 8

# 4. Check services are running
echo ""
echo "[4/6] Checking service health..."
docker compose ps
echo ""

# 5. Mark baseline migration as applied + run new migrations
echo ""
echo "[5/6] Setting up database migrations..."
echo "  → Marking baseline migration as already applied..."
docker compose exec -T app npx prisma migrate resolve --applied 0_initial 2>/dev/null || echo "  → (already marked, ok)"
echo "  → Running pending migrations..."
docker compose exec -T app npx prisma migrate deploy
echo "  → Done."

# 6. Health check
echo ""
echo "[6/6] Final health check..."
sleep 3
HEALTH=$(docker compose exec -T app wget -q -O - http://localhost:3000/api/health 2>/dev/null || echo '{"status":"failed"}')
echo "  → $HEALTH"

echo ""
echo "========================================="
echo "  DONE! focus.camp is ready."
echo "========================================="
echo ""
echo "Services running:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
