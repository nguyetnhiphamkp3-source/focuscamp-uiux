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
  "/pricing",
  "/terms",
  "/privacy",
  "/refund",
  "/docs",
  "/marketplace",
  "/api/auth",
  "/api/sepay",
  "/api/health",
  "/api/notifications",
  "/api/mcp",
  "/api/telegram",
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
  const { pathname, searchParams } = req.nextUrl;

  const res = NextResponse.next();

  // Affiliate tracking: ?ref=<code> sets cookie fc_ref for 30 days
  const refCode = searchParams.get("ref");
  if (refCode && /^[A-Za-z0-9]{4,16}$/.test(refCode)) {
    res.cookies.set("fc_ref", refCode, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
  }

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  // connect-src narrowed: self + Cloudflare R2 (uploads) + Sentry (telemetry).
  // If you add a new external XHR target, whitelist it here — don't fall back to https:.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.ingest.sentry.io https://o.ingest.sentry.io",
      "frame-src 'self' https://www.youtube.com",
    ].join("; ") + ";"
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
