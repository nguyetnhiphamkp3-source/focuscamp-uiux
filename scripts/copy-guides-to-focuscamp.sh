#!/usr/bin/env bash
# SCP HTML guides from taip.io VPS → focus.camp VPS
#
# Usage:
#   ./scripts/copy-guides-to-focuscamp.sh
#
# Requires SSH access to both servers. Prompts for passwords interactively.
# Guide files land in /var/www/focus-camp/app/public/guides/ on focus.camp VPS
# and are served publicly at https://focus.camp/guides/<filename>.html
#
# If you want auth-protected guides, use the Next.js API route approach instead
# and upload to Cloudflare R2 — see docs/guides-auth.md (TODO).

set -euo pipefail

TAIP_HOST="103.97.126.56"
TAIP_PORT="2018"
TAIP_USER="${TAIP_USER:-root}"
TAIP_GUIDES_PATH="/var/www/the-all-in-plan/storage/app/private/guides"

FC_HOST="103.97.127.186"
FC_PORT="2018"
FC_USER="${FC_USER:-root}"
FC_GUIDES_PATH="/var/www/focus-camp/app/public/guides"

GUIDES=(
  "day14-vps-mcp.html"
  "day15-agent-brain.html"
  "day16-tu-tao-skill.html"
  "day17-skill-creative-fb.html"
  "day18-skill-video-ai.html"
  "day19-san-pham-so.html"
  "day20-ke-hoach-kinh-doanh.html"
  "iman-funnel-map-viet.html"
  "bao-cao-huong-dan-quan-tri-menu.html"
)

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Step 1/3 — Download guides from taip.io (${TAIP_HOST}:${TAIP_PORT})"
for f in "${GUIDES[@]}"; do
  echo "  ↓ $f"
  scp -P "$TAIP_PORT" "${TAIP_USER}@${TAIP_HOST}:${TAIP_GUIDES_PATH}/${f}" "$TMP_DIR/" || {
    echo "  ⚠ Skipped (not found on taip.io): $f"
  }
done

DOWNLOADED=$(ls "$TMP_DIR" | wc -l | tr -d ' ')
echo "  → $DOWNLOADED files downloaded to $TMP_DIR"

if [[ "$DOWNLOADED" -eq 0 ]]; then
  echo "✗ Nothing to upload. Exiting."
  exit 1
fi

echo ""
echo "Step 2/3 — Ensure target directory exists on focus.camp (${FC_HOST}:${FC_PORT})"
ssh -p "$FC_PORT" "${FC_USER}@${FC_HOST}" "mkdir -p ${FC_GUIDES_PATH}"

echo ""
echo "Step 3/3 — Upload guides to focus.camp"
for f in "$TMP_DIR"/*.html; do
  fname=$(basename "$f")
  echo "  ↑ $fname"
  scp -P "$FC_PORT" "$f" "${FC_USER}@${FC_HOST}:${FC_GUIDES_PATH}/${fname}"
done

echo ""
echo "✅ Done. Guides available at:"
for f in "${GUIDES[@]}"; do
  echo "   https://focus.camp/guides/$f"
done
echo ""
echo "⚠  These URLs are PUBLIC. To restrict to members only, implement"
echo "   the API route approach in app/app/api/guides/[slug]/route.ts"
