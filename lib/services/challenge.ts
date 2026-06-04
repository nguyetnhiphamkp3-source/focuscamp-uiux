/**
 * Challenge service — read queries (leaderboard, etc.)
 * and re-exports from sub-modules for backwards compatibility.
 */
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { computeStreak } from "./challenge-progress";

/** Cache tag for a challenge's leaderboard — invalidated on review decisions. */
export function challengeLeaderboardTag(challengeId: string): string {
  return `challenge:${challengeId}:leaderboard`;
}

/**
 * Get per-challenge leaderboard: top members by streak (tiebreak by checkin count).
 * Cached per (challengeId, limit) and shared across all concurrent viewers — the
 * heavy member + approved-checkin scan runs once per cache window instead of once
 * per render. Invalidated on review decisions via
 * revalidateTag(challengeLeaderboardTag(id), "max"); 60s acts as a safety net.
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 10
) {
  return unstable_cache(
    () => computeChallengeLeaderboard(challengeId, limit),
    ["challenge-leaderboard", challengeId, String(limit)],
    { tags: [challengeLeaderboardTag(challengeId)], revalidate: 60 },
  )();
}

async function computeChallengeLeaderboard(
  challengeId: string,
  limit: number
) {
  // Member rows without the user join — only userId/status/completedAt are needed
  // to rank. Display fields (name/image) are hydrated for the top `limit` only.
  const members = await prisma.challengeMember.findMany({
    where: { challengeId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { userId: true, status: true, completedAt: true },
    take: 200,
  });
  const memberUserIds = members.map((m) => m.userId);
  const checkins = memberUserIds.length
    ? await prisma.checkin.findMany({
        where: { challengeId, userId: { in: memberUserIds }, status: "APPROVED" },
        select: { userId: true, dayNumber: true },
      })
    : [];
  const byUser = new Map<string, number[]>();
  for (const c of checkins) {
    if (c.dayNumber == null) continue;
    if (!byUser.has(c.userId)) byUser.set(c.userId, []);
    byUser.get(c.userId)!.push(c.dayNumber);
  }

  // Rank first (no display data needed), then hydrate only the visible top rows —
  // previously a full user join for all 200 members ran on every (cache-miss) render.
  const ranked = members
    .map((m) => {
      const days = byUser.get(m.userId) ?? [];
      return {
        userId: m.userId,
        status: m.status,
        completedAt: m.completedAt,
        currentDay: days.length ? Math.max(...days) : 0,
        streak: computeStreak(days),
        totalCheckins: days.length,
      };
    })
    .sort((a, b) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return -1;
      if (b.status === "COMPLETED" && a.status !== "COMPLETED") return 1;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return b.totalCheckins - a.totalCheckins;
    })
    .slice(0, limit);

  const topUserIds = ranked.map((r) => r.userId);
  const users = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true, email: true, image: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return ranked.map((r) => {
    const u = userById.get(r.userId);
    return {
      userId: r.userId,
      name: u?.name || u?.email || "Member",
      image: u?.image ?? null,
      status: r.status,
      completedAt: r.completedAt,
      currentDay: r.currentDay,
      streak: r.streak,
      totalCheckins: r.totalCheckins,
    };
  });
}

// Re-export everything from sub-modules for backwards compatibility
export * from "./challenge-member";
export * from "./challenge-progress";
