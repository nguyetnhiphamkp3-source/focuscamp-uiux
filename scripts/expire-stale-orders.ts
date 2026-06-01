/**
 * Cron-style script: expire stale pending orders.
 * Sets Payment.status PENDING -> EXPIRED once an order has been pending for more
 * than 14 days, keeping the "Chờ thanh toán" list and member counts clean. The
 * 14-day grace (well past the 30-min payment window) leaves room for late manual
 * matching when SePay auto-confirmation fails.
 *
 * Usage in deploy / cron:
 *   docker compose exec app npx tsx scripts/expire-stale-orders.ts
 */
import { prisma } from "../lib/prisma";

const GRACE_DAYS = 14;

async function main() {
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);

  const { count } = await prisma.payment.updateMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    data: { status: "EXPIRED" },
  });

  console.log(`[expire-stale-orders] expired ${count} order(s) older than ${GRACE_DAYS}d (cutoff ${cutoff.toISOString()})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
