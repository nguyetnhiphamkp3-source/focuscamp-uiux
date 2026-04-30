/**
 * One-shot script: register the Telegram bot webhook with focus.camp.
 *
 * Run after deploy or whenever you change the webhook URL.
 *
 *   docker compose exec app npx tsx scripts/setup-telegram-webhook.ts
 *
 * Required env: TELEGRAM_BOT_TOKEN, APP_URL (or NEXT_PUBLIC_APP_URL).
 * Optional: TELEGRAM_WEBHOOK_SECRET (recommended — header-based auth).
 */
import { setTelegramWebhook } from "../lib/integrations/telegram";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is required");
    process.exit(1);
  }
  if (!appUrl) {
    console.error("APP_URL is required");
    process.exit(1);
  }
  const url = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  console.log(`Setting Telegram webhook → ${url}`);
  const ok = await setTelegramWebhook({
    botToken: token,
    url,
    secretToken: secret,
  });
  console.log(ok ? "✓ Webhook set" : "✗ Failed");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
