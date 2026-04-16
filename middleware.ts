import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * Auth + security middleware.
 *
 * Public: /, /login, /discovery, /about, /brand, /api/auth, /api/sepay,
 *         /api/payments, /api/health, /pay.
 * Everything else inside /c requires authentication.
 *
 * Heavy business logic stays in service layer.
 */

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/discovery",
  "/about",
  "/brand",
  "/pay",
  "/api/auth",
  "/api/sepay",
  "/api/payments",
  "/api/health",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (prefix === "/") continue;
    if (pathname === prefix || pathname.startsWith(prefix + "/"))
      return true;
  }
  return false;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Security headers for all responses
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (isPublic(pathname)) return res;

  // Protected: require a session cookie
  const session = await auth();
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  // Match everything except static assets and image routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff|woff2|ttf|otf)$).*)",
  ],
};
