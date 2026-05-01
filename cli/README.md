# `fc` — focus.camp command-line

Wraps the focus.camp MCP API for humans and AI agents. Same auth, same
operations as the web UI — but pipe-friendly and scriptable.

## Install

```bash
# From source (this repo)
cd app/cli
pnpm install
pnpm build
npm link              # installs `fc` globally on your $PATH

# (Future) — once published to npm:
# npm install -g @focus-camp/cli
```

## Auth

Each API key is scoped to one community. Create one at
`/c/<your-community>/settings → API Keys`, copy the secret, then:

```bash
fc auth login
# Paste the key when prompted. Saved to ~/.fc/config.json (mode 0600).

fc auth status        # show endpoint + masked key + community slug
fc auth logout        # wipe the saved key
```

Override at runtime with env vars:

```bash
FOCUS_CAMP_API_KEY=sk_… FOCUS_CAMP_BASE_URL=https://focus.camp/api/mcp fc community info
```

## Output formats

| Mode | When |
|---|---|
| `pretty` | default on a TTY — colored, human-readable |
| `json` | default in pipes — `fc post list \| jq …` |
| `yaml` | for configs / readable structured output |

Override on any subcommand: `--format json`.

## Commands

```text
fc auth login | logout | status

fc community info
fc community stats
fc community update --name … --tagline …

fc member list --role MEMBER --tier PRO --limit 50
fc member get <userId>
fc member role <userId> ADMIN
fc member remove <userId>

fc post list --type COT --limit 20
fc post get <postId>
fc post create --type POST --title "…" --body "…"
fc post create --type COT --title "…" --body-file post.md
echo "today's win" | fc post create --type COT --body-file -
fc post update <postId> --body-file revised.md
fc post delete <postId>

fc challenge list
fc challenge get <slug>
fc challenge create --slug 30-day-write --title "30-day Writing" --total-days 30
fc challenge pending --challenge-slug 30-day-write
fc challenge review <submissionId> --decision APPROVED --feedback "great!"

fc course create --slug ai-agents --title "AI Agents 101"
fc course lesson <courseId> --title "Lesson 1" --video-url https://…

fc xp recent --limit 30

fc notify send --user-id <id> --title "…" --body "…" --url https://…
fc notify send --title "Broadcast to all members" --body "…"

fc tools                  # list every available MCP tool
```

## Examples for AI agents

The CLI is designed to be invoked from a Claude Skill, a shell script, a cron,
or any tool that can spawn a subprocess. Default JSON output makes piping easy.

```bash
# 1. Auto-review yesterday's pending checkins
fc challenge pending --format json |
  jq -r '.[] | select(.daysWaiting > 1) | .submissionId' |
  while read id; do
    fc challenge review "$id" --decision APPROVED --feedback "auto-approved"
  done

# 2. Bulk-promote a list of members to ADMIN
cat new-admins.txt | xargs -I{} fc member role {} ADMIN

# 3. Daily digest post from yesterday's top XP
fc xp recent --limit 50 --format json |
  jq -r '... your aggregator ...' |
  fc post create --type POST --title "Daily Digest" --body-file -
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `fc: not authenticated` | Run `fc auth login` |
| `Login failed: invalid_or_missing_bearer_token` | Wrong API key or revoked. Regenerate at `/c/<slug>/settings → API Keys` |
| `Login failed: rate_limited` | 60 requests / minute / key. Slow down. |
| `presign_failed` from `fc post create --image-url …` | Server R2 misconfigured — check VPS env |
| HTTPS errors against custom domain | Pass `FOCUS_CAMP_BASE_URL=https://your-domain/api/mcp` |

## Architecture

```text
┌────────────────┐         ┌──────────────────────────┐
│ fc CLI         │  HTTPS  │ focus.camp /api/mcp      │
│ (Streamable    │ ──────▶ │ (MCP Streamable HTTP +   │
│  HTTP client)  │  Bearer │  Bearer-auth + per-key   │
│                │         │  rate limit + per-tool   │
│                │         │  scope check)            │
└────────────────┘         └──────────────────────────┘
        ▲                              │
        │                              ▼
   ~/.fc/config.json           Prisma → Postgres
   { apiKey, baseUrl }
```

The CLI does **not** maintain its own state besides the config file. Every
command opens a connection, calls one tool, prints, exits. Idempotent and
stateless — easy to script, easy to restart, easy to reason about.
