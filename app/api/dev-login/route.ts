/**
 * DEV-ONLY one-click login. Disabled in production.
 *
 * Visit http://localhost:3000/api/dev-login and you'll be logged in as the
 * SEED_OWNER_EMAIL user (creates one if missing) and redirected to "/".
 * No Google / magic-link needed for local UI work.
 *
 * Optional: /api/dev-login?email=someone@focus.camp to log in as another user.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email =
    req.nextUrl.searchParams.get("email") ||
    process.env.SEED_OWNER_EMAIL ||
    "dev@focus.camp";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Dev Owner",
      handle: email.split("@")[0].replace(/[^a-z0-9_]/gi, "_"),
      image: "https://api.dicebear.com/9.x/initials/svg?seed=Dev",
      emailVerified: new Date(),
      isSuperAdmin: true,
    },
  });

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  const res = NextResponse.redirect(new URL("/", req.url));
  // NextAuth v5 dev (http) cookie name. Middleware only checks presence;
  // auth() resolves the real session from the DB by this token.
  res.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
