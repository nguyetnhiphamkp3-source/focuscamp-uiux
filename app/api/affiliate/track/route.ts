import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackClick, getAffiliateConfig } from "@/lib/services/affiliate";

export const runtime = "nodejs";

const CODE_RE = /^[A-Za-z0-9]{4,16}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ref = searchParams.get("ref") ?? "";
  const to = searchParams.get("to") ?? "/";

  // Validate ref code format
  if (!CODE_RE.test(ref)) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // Validate destination to prevent open redirect
  if (!to.startsWith("/") || to.startsWith("//")) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // Look up the affiliate link
  const link = await prisma.affiliateLink.findUnique({
    where: { code: ref },
    select: { id: true, userId: true },
  });

  if (!link) {
    return NextResponse.redirect(new URL(to, req.url), 302);
  }

  // Get community's affiliate config for cookieDays
  // AffiliateLink doesn't have communityId directly, so we use default 30 days
  // unless we can find the community from the destination path
  let cookieDays = 30;

  // Try to extract community slug from destination path /c/<slug>...
  const slugMatch = to.match(/^\/c\/([^/]+)/);
  if (slugMatch) {
    const community = await prisma.community.findUnique({
      where: { slug: slugMatch[1] },
      select: { affiliateConfig: true },
    });
    if (community) {
      const cfg = getAffiliateConfig({ affiliateConfig: community.affiliateConfig });
      cookieDays = cfg.cookieDays;
    }
  }

  // Increment clicks (best-effort)
  await trackClick(ref);

  // Set cookie and redirect
  const res = NextResponse.redirect(new URL(to, req.url), 302);
  res.cookies.set("fc_ref", ref, {
    maxAge: cookieDays * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  return res;
}
