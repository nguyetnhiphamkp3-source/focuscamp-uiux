/**
 * Local dev helper — NOT for production.
 *
 * Creates (or reuses) the SEED_OWNER_EMAIL user and prints a session token
 * you can paste into your browser cookie to be logged in without OAuth/email.
 *
 * Usage:  pnpm exec tsx scripts/dev-login.ts
 * Then in DevTools console on http://localhost:3000:
 *   document.cookie = "authjs.session-token=<TOKEN>; path=/; max-age=2592000"
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL || "dev@focus.camp";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Dev Owner",
      handle: "dev",
      image: "https://api.dicebear.com/9.x/initials/svg?seed=Dev",
      emailVerified: new Date(),
      isSuperAdmin: true,
    },
  });

  const sessionToken = randomUUID();
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("\n✅ Dev user ready:", user.email, `(id=${user.id}, superAdmin=${user.isSuperAdmin})`);
  console.log("\n🔑 Session token (paste in browser DevTools console):\n");
  console.log(
    `document.cookie = "authjs.session-token=${sessionToken}; path=/; max-age=2592000"`
  );
  console.log("\nThen refresh http://localhost:3000 — you'll be logged in.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
