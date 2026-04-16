import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth + security middleware.
 *
 * Public: /, /login, /discovery, /about, /brand, /api/auth, /api/sepay,
 *         /api/payments, /api/health, /pay, /c/[slug] (viewable by guests —
 *         Right sidebar lets them join/login).
 * Protected: /c/[slug]/chat, /challenges, /courses, /marketplace, /profile,
 *            /invite, /settings + /c/[slug]/<any non-landing subroute>.
 *
 * Edge-compatible: uses session cookie presence only (no DB call). Full auth
 * verification still happens server-side per page via `auth()`.
 */

const PUBLIC_PREFIXES = [
  "/login",
  "/discovery",
  "/about",
  "/brand",
  "/direct-challenge",
  "/search",
  "/u/",
  "/pay",
  "/api/auth",
  "/api/sepay",
  "/api/payments",
  "/api/health",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return true;
  }
  // Allow guest browsing of community landing pages; protection happens
  // at the page/action level for actions that need auth.
  // Pattern: /c/[slug] or /c/[slug]/ (no sub path)
  if (/^\/c\/[^/]+\/?$/.test(pathname)) return true;
  return false;
}

/** Cookie names NextAuth v5 uses for session. Accept either dev or prod variant. */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (isPublic(pathname)) return res;

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff|woff2|ttf|otf)$).*)",
  ],
};
