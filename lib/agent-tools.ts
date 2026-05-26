/**
 * AI SDK tools for the community chat agent.
 *
 * Read-only subset of MCP tools, converted to AI SDK `tool()` format so the
 * chat agent can query community data (challenges, members, stats, posts, XP)
 * while responding to users. No write tools — the chat agent is read-only.
 */
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listFeed, getPostWithComments } from "@/lib/services/post";
import { listChallengeSubmissions } from "@/lib/services/challenge-member";
import { getCommunityProfile } from "@/lib/services/profile";
import { listMembers } from "@/lib/services/community-settings";
import { getPlanStatus, planLabel } from "@/lib/platform-plans";

export function buildChatAgentTools(communityId: string) {
  return {
    community_get_info: tool({
      description: "Fetch core info + plan status for the connected community.",
      inputSchema: z.object({}),
      execute: async () => {
        const c = await prisma.community.findUnique({
          where: { id: communityId },
          select: {
            id: true,
            slug: true,
            name: true,
            tagline: true,
            description: true,
            memberCount: true,
            planTier: true,
            planExpiresAt: true,
            createdAt: true,
          },
        });
        if (!c) return { error: "not_found" };
        const state = getPlanStatus(c);
        return { ...c, planLabel: planLabel(state.tier), planStatus: state.status };
      },
    }),

    community_get_stats: tool({
      description:
        "Aggregate counts (posts, checkins, new members) over the last N days.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(7),
      }),
      execute: async ({ days }) => {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [posts, checkins, newMembers, totalMembers] = await Promise.all([
          prisma.post.count({
            where: { communityId, createdAt: { gte: since } },
          }),
          prisma.checkin.count({
            where: {
              challenge: { communityId },
              createdAt: { gte: since },
            },
          }),
          prisma.membership.count({
            where: { communityId, joinedAt: { gte: since } },
          }),
          prisma.membership.count({ where: { communityId } }),
        ]);
        return { days, posts, checkins, newMembers, totalMembers };
      },
    }),

    community_list_members: tool({
      description:
        "List members of the community with role/tier/level. Paginated.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      }),
      execute: async ({ limit, offset }) => {
        const { members, total } = await listMembers({
          communityId,
          limit,
          offset,
        });
        return { total, members };
      },
    }),

    community_get_member: tool({
      description: "Full profile of a community member by userId.",
      inputSchema: z.object({ userId: z.string().min(1) }),
      execute: async ({ userId }) => {
        const profile = await getCommunityProfile({ userId, communityId });
        return profile;
      },
    }),

    posts_list: tool({
      description: "List feed posts. Filter by type and pillar.",
      inputSchema: z.object({
        type: z.enum(["POST", "QUESTION", "SIGNAL"]).default("POST"),
        pillar: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().optional(),
        sort: z.enum(["latest", "popular"]).default("latest"),
      }),
      execute: async ({ type, pillar, limit, cursor, sort }) => {
        const posts = await listFeed({
          communityId,
          type,
          pillar,
          limit,
          cursor,
          sort,
        });
        return { count: posts.length, posts };
      },
    }),

    posts_get: tool({
      description: "Single post + its comments.",
      inputSchema: z.object({ postId: z.string() }),
      execute: async ({ postId }) => {
        const meta = await prisma.post.findUnique({
          where: { id: postId },
          select: { communityId: true },
        });
        if (!meta || meta.communityId !== communityId)
          return { error: "not_found_or_not_in_community" };
        const data = await getPostWithComments(postId);
        if (!data) return { error: "not_found" };
        return data;
      },
    }),

    challenges_list: tool({
      description: "List challenges in this community by status.",
      inputSchema: z.object({
        status: z.enum(["OPEN", "ACTIVE", "COMPLETED"]).optional(),
      }),
      execute: async ({ status }) => {
        const rows = await prisma.challenge.findMany({
          where: { communityId, ...(status ? { status } : {}) },
          include: { _count: { select: { members: true, tasks: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return { count: rows.length, challenges: rows };
      },
    }),

    challenges_get: tool({
      description: "Single challenge + its tasks + member roster summary.",
      inputSchema: z.object({ challengeId: z.string() }),
      execute: async ({ challengeId }) => {
        const ch = await prisma.challenge.findUnique({
          where: { id: challengeId },
          include: {
            tasks: { orderBy: { dayNumber: "asc" } },
            _count: { select: { members: true, checkins: true } },
          },
        });
        if (!ch || ch.communityId !== communityId)
          return { error: "not_found" };
        return ch;
      },
    }),

    challenges_list_pending_checkins: tool({
      description:
        "List checkins awaiting admin review for a challenge.",
      inputSchema: z.object({
        challengeId: z.string(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ challengeId, limit }) => {
        const ch = await prisma.challenge.findUnique({
          where: { id: challengeId },
          select: { communityId: true },
        });
        if (!ch || ch.communityId !== communityId)
          return { error: "challenge_not_in_community" };
        return listChallengeSubmissions({
          challengeId,
          status: "PENDING",
          limit,
        });
      },
    }),

    xp_list_recent: tool({
      description:
        "Recent XP ledger entries — community-wide or per-user.",
      inputSchema: z.object({
        userId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      execute: async ({ userId, limit }) => {
        const entries = await prisma.xPLedger.findMany({
          where: {
            communityId,
            ...(userId ? { userId } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, handle: true, image: true },
            },
          },
        });
        return { count: entries.length, entries };
      },
    }),
  };
}
