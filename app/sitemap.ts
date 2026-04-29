import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://focus.camp";
  const now = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/discovery`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/direct-challenge`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/brand`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Top 100 communities (active ones — exclude pending plans)
  let communities: { slug: string; updatedAt: Date }[] = [];
  try {
    communities = await prisma.community.findMany({
      where: {
        OR: [
          { planTier: "GRANDFATHER" },
          { planExpiresAt: { gte: now } },
        ],
      },
      select: { slug: true, updatedAt: true },
      take: 100,
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    // Sitemap should not fail build if DB unreachable; fall through.
  }

  const communityPaths: MetadataRoute.Sitemap = communities.map((c) => ({
    url: `${base}/c/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPaths, ...communityPaths];
}
