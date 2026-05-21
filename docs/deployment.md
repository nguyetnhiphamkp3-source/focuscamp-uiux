# Deployment

## Platform: VPS (Self-hosted via Docker Compose)

## SSH Access
- Host alias: `focuscamp` (or `focus-camp`, `fc-vps`)
- IP: `103.97.127.186`
- Port: `2018`
- User: `root`
- Config: `~/.ssh/config`

```bash
ssh focuscamp
```

## Deploy Command
```bash
# On VPS
cd /path/to/app
git pull && docker compose up -d --build
```

## Environment Variables
Set in `.env.production` on the VPS. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `SENTRY_DSN` — Sentry error tracking (optional)
- R2 storage credentials for file uploads

## DB Migrations
```bash
# Run inside container after deploy
prisma migrate deploy
```

First-time setup:
```bash
bash scripts/init-prisma-migrations.sh
```

## Rollback
```bash
git log --oneline -10   # find target commit
git checkout <commit>
docker compose up -d --build
```

## Monitoring
- Health check: `GET /api/health`
- Logs: `docker compose logs -f`
