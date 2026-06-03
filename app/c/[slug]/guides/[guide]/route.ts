/**
 * Gated standalone guide pages (migrated from taip.io), scoped to a community.
 *
 * These are full standalone HTML documents (own fonts/CSS), served as-is to
 * preserve their original design. Access is gated to members of the community
 * in the URL (owner bypasses). Only the `the-all-in-plan` community owns these
 * guides — other slugs 404.
 *
 * URL: /c/<slug>/guides/<guide>  (also accepts <guide>.html)
 * Content lives in content/guides/*.html, bundled via lib/guides/content.generated.ts.
 *
 * Note: this is a Route Handler (route.ts), so it bypasses the community
 * layout and renders the raw HTML document — exactly what standalone pages need.
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GUIDES } from "@/lib/guides/content.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only this community owns the migrated guides.
const GUIDE_COMMUNITY_SLUG = "the-all-in-plan";

// Relaxed CSP for these standalone pages: they load Google Fonts. Middleware
// skips its strict CSP for /c/<slug>/guides/* so this one applies.
const GUIDE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
].join("; ") + ";";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; guide: string }> }
) {
  const { slug, guide } = await params;

  // Guides only exist for the owning community.
  if (slug !== GUIDE_COMMUNITY_SLUG) {
    return new Response("Not found", { status: 404 });
  }

  const guideSlug = guide.replace(/\.html$/, "");
  const html = GUIDES[guideSlug];
  if (!html) {
    return new Response("Not found", { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    // Middleware normally redirects unauthenticated users to /login first.
    return new Response("Unauthorized", { status: 401 });
  }

  // Gate: must be a member (or owner) of the community.
  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!community) {
    return new Response("Not found", { status: 404 });
  }

  let allowed = community.ownerId === userId;
  if (!allowed) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_communityId: { userId, communityId: community.id },
      },
      select: { id: true },
    });
    allowed = !!membership;
  }
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": GUIDE_CSP,
    },
  });
}
