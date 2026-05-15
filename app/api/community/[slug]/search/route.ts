import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Community-scoped search: posts, courses, challenges.
 * GET /api/community/[slug]/search?q=keyword
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ posts: [], courses: [], challenges: [] });
  }

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!community) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [posts, courses, challenges] = await Promise.all([
    prisma.post.findMany({
      where: {
        communityId: community.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { body: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, body: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.course.findMany({
      where: {
        communityId: community.id,
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true, title: true, description: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.challenge.findMany({
      where: {
        communityId: community.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true, title: true, description: true, difficulty: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ posts, courses, challenges });
}
