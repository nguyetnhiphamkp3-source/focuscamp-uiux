/**
 * Cron-style script: send "expiring soon" + "expired" emails.
 * Run daily 9am VN time. Idempotent: tracks `lastExpireEmailAt` is NOT yet
 * implemented, so we just re-send each day in the 7..1 day window. Acceptable
 * spam level for v1; switch to a flag if users complain.
 *
 * Usage in deploy / cron:
 *   docker compose exec app npx tsx scripts/send-expiring-emails.ts
 */
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";
import {
  subscriptionExpiringEmail,
  subscriptionExpiredEmail,
} from "../lib/email-templates";

async function main() {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Communities expiring in next 7 days
  const expiring = await prisma.community.findMany({
    where: {
      planExpiresAt: { gte: now, lte: in7d },
      planTier: { in: ["SOLO", "PRO", "AGENCY"] },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      planExpiresAt: true,
      owner: { select: { email: true, name: true } },
    },
  });

  for (const c of expiring) {
    if (!c.owner?.email || !c.planExpiresAt) continue;
    const daysLeft = Math.max(
      1,
      Math.ceil(
        (c.planExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
    );
    await sendEmail({
      to: c.owner.email,
      ...subscriptionExpiringEmail({
        communityName: c.name,
        daysLeft,
        communitySlug: c.slug,
      }),
    });
    console.log(`[expiring] sent → ${c.owner.email} (${c.slug}, ${daysLeft}d)`);
  }

  // 2. Communities just past grace (expired exactly 7d ago, +/- 1 day to
  //    catch yesterday's stragglers). Sent ONCE-ish (idempotent flag TODO).
  const justExpired = await prisma.community.findMany({
    where: {
      planExpiresAt: {
        gte: new Date(past7d.getTime() - 24 * 60 * 60 * 1000),
        lte: past7d,
      },
      planTier: { in: ["SOLO", "PRO", "AGENCY"] },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      owner: { select: { email: true } },
    },
  });

  for (const c of justExpired) {
    if (!c.owner?.email) continue;
    await sendEmail({
      to: c.owner.email,
      ...subscriptionExpiredEmail({
        communityName: c.name,
        communitySlug: c.slug,
      }),
    });
    console.log(`[expired] sent → ${c.owner.email} (${c.slug})`);
  }

  console.log(
    `[done] expiring=${expiring.length} expired=${justExpired.length}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
