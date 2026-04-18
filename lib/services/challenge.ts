/**
 * Challenge service — read queries (leaderboard, etc.)
 * and re-exports from sub-modules for backwards compatibility.
 */
import { prisma } from "@/lib/prisma";
import { computeStreak } from "./challenge-progress";

/**
 * Get per-challenge leaderboard: top members by streak (tiebreak by checkin count).
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 10
) {
  const members = await prisma.challengeMember.findMany({
    where: { challengeId, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    take: 200,
  });
  const memberUserIds = members.map((m) => m.userId);
  const checkins = await prisma.checkin.findMany({
    where: { challengeId, userId: { in: memberUserIds } },
    select: { userId: true, dayNumber: true, createdAt: true },
  });
  const byUser = new Map<string, number[]>();
  for (const c of checkins) {
    if (c.dayNumber == null) continue;
    if (!byUser.has(c.userId)) byUser.set(c.userId, []);
    byUser.get(c.userId)!.push(c.dayNumber);
  }

  const rows = members.map((m) => {
    const days = byUser.get(m.userId) ?? [];
    return {
      userId: m.userId,
      name: m.user.name || m.user.email || "Member",
      image: m.user.image,
      status: m.status,
      completedAt: m.completedAt,
      currentDay: days.length ? Math.max(...days) : 0,
      streak: computeStreak(days),
      totalCheckins: days.length,
    };
  });

  rows.sort((a, b) => {
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return -1;
    if (b.status === "COMPLETED" && a.status !== "COMPLETED") return 1;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return b.totalCheckins - a.totalCheckins;
  });

  return rows.slice(0, limit);
}

// Re-export everything from sub-modules for backwards compatibility
export * from "./challenge-member";
export * from "./challenge-progress";
