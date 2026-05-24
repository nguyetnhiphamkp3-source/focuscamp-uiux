/**
 * MCP server factory — creates a fresh McpServer per HTTP request,
 * registering all 22 tools with the request's authenticated context.
 *
 * This pattern (per-request server) keeps state simple in a serverless
 * Next.js environment. Stateless transport, no session reuse.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withTelemetry } from "./telemetry";
import type { McpContext } from "./auth";

import { listFeed, createPost, updatePost, deletePost, getPostWithComments } from "@/lib/services/post";
import {
  createChallenge,
  updateChallengeSettings,
  createChallengeTask,
  reviewSubmission,
  listChallengeSubmissions,
} from "@/lib/services/challenge-member";
import { getCommunityProfile } from "@/lib/services/profile";
import {
  listMembers,
  updateMemberRole,
  removeMember,
} from "@/lib/services/community-settings";
import { updateCommunityInfo, assertCommunityCanWrite } from "@/lib/services/community";
import { createCourse, createLesson } from "@/lib/services/course";
import { createNotification } from "@/lib/services/notification";
import { getPlanStatus, planLabel } from "@/lib/platform-plans";

function ok(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

export function buildMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({
    name: "focus.camp",
    version: "1.0.0",
  });
  const cid = ctx.communityId;
  const uid = ctx.ownerId;

  /* ─────────────────────────── READ TOOLS ─────────────────────────── */

  server.tool(
    "community_get_info",
    "Fetch core info + plan status for the connected community.",
    {},
    async () =>
      withTelemetry({
        ctx,
        toolName: "community_get_info",
        args: {},
        fn: async () => {
          const c = await prisma.community.findUnique({
            where: { id: cid },
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
          if (!c) return ok({ error: "not_found" });
          const state = getPlanStatus(c);
          return ok({
            ...c,
            planLabel: planLabel(state.tier),
            planStatus: state.status,
          });
        },
      })
  );

  server.tool(
    "community_get_stats",
    "Aggregate counts (posts, checkins, new members) over the last N days.",
    { days: z.number().int().min(1).max(90).default(7) },
    async ({ days }) =>
      withTelemetry({
        ctx,
        toolName: "community_get_stats",
        args: { days },
        fn: async () => {
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          const [posts, checkins, newMembers, totalMembers] = await Promise.all([
            prisma.post.count({ where: { communityId: cid, createdAt: { gte: since } } }),
            prisma.checkin.count({
              where: { challenge: { communityId: cid }, createdAt: { gte: since } },
            }),
            prisma.membership.count({
              where: { communityId: cid, joinedAt: { gte: since } },
            }),
            prisma.membership.count({ where: { communityId: cid } }),
          ]);
          return ok({ days, posts, checkins, newMembers, totalMembers });
        },
      })
  );

  server.tool(
    "community_list_members",
    "List members of the community with role/tier/level. Paginated.",
    {
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    },
    async ({ limit, offset }) =>
      withTelemetry({
        ctx,
        toolName: "community_list_members",
        args: { limit, offset },
        fn: async () => {
          const { members, total } = await listMembers({ communityId: cid, limit, offset });
          return ok({ total, members });
        },
      })
  );

  server.tool(
    "community_get_member",
    "Full profile of a community member by userId.",
    { userId: z.string().min(1) },
    async ({ userId }) =>
      withTelemetry({
        ctx,
        toolName: "community_get_member",
        args: { userId },
        fn: async () => {
          const profile = await getCommunityProfile({ userId, communityId: cid });
          return ok(profile);
        },
      })
  );

  server.tool(
    "posts_list",
    "List feed posts. Filter by type and pillar.",
    {
      type: z.enum(["POST", "QUESTION", "SIGNAL"]).default("POST"),
      pillar: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().optional(),
      sort: z.enum(["latest", "popular"]).default("latest"),
    },
    async ({ type, pillar, limit, cursor, sort }) =>
      withTelemetry({
        ctx,
        toolName: "posts_list",
        args: { type, pillar, limit, sort },
        fn: async () => {
          const posts = await listFeed({
            communityId: cid,
            type,
            pillar,
            limit,
            cursor,
            sort,
          });
          return ok({ count: posts.length, posts });
        },
      })
  );

  server.tool(
    "posts_get",
    "Single post + its comments.",
    { postId: z.string().cuid() },
    async ({ postId }) =>
      withTelemetry({
        ctx,
        toolName: "posts_get",
        args: { postId },
        fn: async () => {
          const meta = await prisma.post.findUnique({
            where: { id: postId },
            select: { communityId: true },
          });
          if (!meta || meta.communityId !== cid)
            return ok({ error: "not_found_or_not_in_community" });
          const data = await getPostWithComments(postId);
          if (!data) return ok({ error: "not_found" });
          return ok(data);
        },
      })
  );

  server.tool(
    "challenges_list",
    "List challenges in this community by status.",
    { status: z.enum(["OPEN", "ACTIVE", "COMPLETED"]).optional() },
    async ({ status }) =>
      withTelemetry({
        ctx,
        toolName: "challenges_list",
        args: { status },
        fn: async () => {
          const rows = await prisma.challenge.findMany({
            where: { communityId: cid, ...(status ? { status } : {}) },
            include: { _count: { select: { members: true, tasks: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          });
          return ok({ count: rows.length, challenges: rows });
        },
      })
  );

  server.tool(
    "challenges_get",
    "Single challenge + its tasks + member roster summary.",
    { challengeId: z.string().cuid() },
    async ({ challengeId }) =>
      withTelemetry({
        ctx,
        toolName: "challenges_get",
        args: { challengeId },
        fn: async () => {
          const ch = await prisma.challenge.findUnique({
            where: { id: challengeId },
            include: {
              tasks: { orderBy: { dayNumber: "asc" } },
              _count: { select: { members: true, checkins: true } },
            },
          });
          if (!ch || ch.communityId !== cid) return ok({ error: "not_found" });
          return ok(ch);
        },
      })
  );

  server.tool(
    "challenges_list_pending_checkins",
    "List checkins awaiting admin review for a challenge.",
    {
      challengeId: z.string().cuid(),
      limit: z.number().int().min(1).max(50).default(20),
    },
    async ({ challengeId, limit }) =>
      withTelemetry({
        ctx,
        toolName: "challenges_list_pending_checkins",
        args: { challengeId, limit },
        fn: async () => {
          // Verify challenge belongs to this community (api key is per-community)
          const ch = await prisma.challenge.findUnique({
            where: { id: challengeId },
            select: { communityId: true },
          });
          if (!ch || ch.communityId !== cid)
            throw new Error("challenge_not_in_community");
          const result = await listChallengeSubmissions({
            challengeId,
            status: "PENDING",
            limit,
          });
          return ok(result);
        },
      })
  );

  server.tool(
    "xp_list_recent",
    "Recent XP ledger entries — community-wide or per-user.",
    {
      userId: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async ({ userId, limit }) =>
      withTelemetry({
        ctx,
        toolName: "xp_list_recent",
        args: { userId, limit },
        fn: async () => {
          const entries = await prisma.xPLedger.findMany({
            where: {
              communityId: cid,
              ...(userId ? { userId } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
              user: { select: { id: true, name: true, handle: true, image: true } },
            },
          });
          return ok({ count: entries.length, entries });
        },
      })
  );

  /* ─────────────────────────── WRITE TOOLS ─────────────────────────── */

  server.tool(
    "posts_create",
    "Create a new post in the community feed/cot/qa/signals.",
    {
      type: z.enum(["POST", "QUESTION", "SIGNAL"]).default("POST"),
      title: z.string().max(200).optional(),
      body: z.string().min(1).max(10000),
      pillar: z.string().optional(),
      imageUrl: z.string().url().optional(),
    },
    async ({ type, title, body, pillar, imageUrl }) =>
      withTelemetry({
        ctx,
        toolName: "posts_create",
        args: { type, title, body, pillar, imageUrl },
        fn: async () => {
          const post = await createPost({
            userId: uid,
            communityId: cid,
            type,
            title,
            body,
            pillar,
            imageUrl,
          });
          return ok({ id: post.id, slug: post.id, type: post.type });
        },
      })
  );

  server.tool(
    "posts_update",
    "Edit an existing post body/title/pillar.",
    {
      postId: z.string().cuid(),
      title: z.string().max(200).optional(),
      body: z.string().min(1).max(10000),
      pillar: z.string().optional(),
    },
    async ({ postId, title, body, pillar }) =>
      withTelemetry({
        ctx,
        toolName: "posts_update",
        args: { postId, title, pillar },
        fn: async () => {
          await updatePost({ userId: uid, postId, title, body, pillar });
          return ok({ updated: true, id: postId });
        },
      })
  );

  server.tool(
    "posts_delete",
    "Delete a post.",
    { postId: z.string().cuid() },
    async ({ postId }) =>
      withTelemetry({
        ctx,
        toolName: "posts_delete",
        args: { postId },
        fn: async () => {
          await deletePost({ userId: uid, postId });
          return ok({ deleted: true, id: postId });
        },
      })
  );

  server.tool(
    "challenges_create",
    "Create a challenge and N tasks in one go (software factory: spec → instance).",
    {
      slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
      title: z.string().min(2).max(120),
      description: z.string().max(5000).optional(),
      difficulty: z.enum(["NORMAL", "HARD", "CHAOS"]).optional(),
      requiredDays: z.number().int().min(1).max(365).optional(),
      autoStartAfterHours: z.number().int().min(1).max(8760).nullable().optional(),
      bannerUrl: z.string().url().optional(),
      tasks: z
        .array(
          z.object({
            dayNumber: z.number().int().positive(),
            title: z.string().min(1).max(200),
            description: z.string().max(5000).optional(),
            sopContent: z.string().max(10000).optional(),
            videoUrl: z.string().url().optional(),
            evidenceType: z.enum(["TEXT", "LINK", "IMAGE", "TEXT_IMAGE", "FILE"]).optional(),
            evidenceLabel: z.string().max(500).optional(),
          })
        )
        .max(365)
        .optional(),
    },
    async (args) =>
      withTelemetry({
        ctx,
        toolName: "challenges_create",
        args,
        fn: async () => {
          await assertCommunityCanWrite(cid);
          const ch = await createChallenge({
            userId: uid,
            communityId: cid,
            slug: args.slug,
            title: args.title,
            description: args.description,
            difficulty: args.difficulty,
            requiredDays: args.requiredDays,
            autoStartAfterHours: args.autoStartAfterHours ?? null,
            bannerUrl: args.bannerUrl,
          });
          if (args.tasks && args.tasks.length > 0) {
            for (const t of args.tasks) {
              await createChallengeTask({
                userId: uid,
                challengeId: ch.id,
                ...t,
              });
            }
          }
          return ok({
            challengeId: ch.id,
            slug: ch.slug,
            tasksCreated: args.tasks?.length ?? 0,
          });
        },
      })
  );

  server.tool(
    "challenges_update",
    "Update challenge settings (title/description/auto-start/freeze/banner/benefits). " +
      "`benefits` overrides the default \"Bạn sẽ có được gì?\" bullets on the sales view: " +
      "pass an array (max 6 items, each { icon?: emoji ≤ 8 chars, text: string ≤ 150 chars }) " +
      "to set custom bullets; pass null or omit to keep the derived defaults.",
    {
      challengeId: z.string().cuid(),
      title: z.string().min(1).max(120).optional(),
      description: z.string().max(5000).optional(),
      benefits: z
        .array(
          z.object({
            icon: z.string().max(8).optional(),
            text: z.string().min(1).max(150),
          })
        )
        .max(6)
        .nullable()
        .optional(),
      autoStartAfterHours: z.number().int().min(1).max(8760).nullable().optional(),
      bannerUrl: z.string().url().nullable().optional(),
      freezeFromDay: z.number().int().positive().nullable().optional(),
      freezeStartsAt: z.string().datetime().nullable().optional(),
      freezeEndsAt: z.string().datetime().nullable().optional(),
    },
    async (args) =>
      withTelemetry({
        ctx,
        toolName: "challenges_update",
        args,
        fn: async () => {
          await updateChallengeSettings({
            userId: uid,
            challengeId: args.challengeId,
            title: args.title,
            description: args.description,
            autoStartAfterHours:
              "autoStartAfterHours" in args ? args.autoStartAfterHours ?? null : undefined,
            bannerUrl: args.bannerUrl ?? undefined,
            freezeFromDay: args.freezeFromDay ?? undefined,
            freezeStartsAt: args.freezeStartsAt ?? null,
            freezeEndsAt: args.freezeEndsAt ?? null,
            benefits: "benefits" in args ? args.benefits ?? null : undefined,
            actorType: "EXTERNAL_API",
            actorId: ctx.apiKeyId,
          });
          return ok({ updated: true, id: args.challengeId });
        },
      })
  );

  server.tool(
    "checkins_review",
    "Approve or reject a pending checkin.",
    {
      checkinId: z.string().cuid(),
      decision: z.enum(["APPROVED", "REJECTED"]),
      note: z.string().max(2000).optional(),
    },
    async ({ checkinId, decision, note }) =>
      withTelemetry({
        ctx,
        toolName: "checkins_review",
        args: { checkinId, decision, note },
        fn: async () => {
          await reviewSubmission({
            userId: uid,
            checkinId,
            action: decision === "APPROVED" ? "APPROVE" : "REJECT",
            note,
          });
          return ok({ reviewed: true, id: checkinId, status: decision });
        },
      })
  );

  server.tool(
    "notifications_send",
    "Send an inbox notification to a specific community member.",
    {
      recipientUserId: z.string().min(1),
      title: z.string().min(1).max(200),
      body: z.string().max(2000).optional(),
      link: z.string().max(500).optional(),
    },
    async ({ recipientUserId, title, body, link }) =>
      withTelemetry({
        ctx,
        toolName: "notifications_send",
        args: { recipientUserId, title, body, link },
        fn: async () => {
          // Ensure recipient is a member of THIS community
          const m = await prisma.membership.findUnique({
            where: {
              userId_communityId: { userId: recipientUserId, communityId: cid },
            },
            select: { id: true },
          });
          if (!m) throw new Error("recipient_not_member");
          await createNotification({
            userId: recipientUserId,
            actorId: uid,
            type: "AGENT_BROADCAST",
            title,
            body,
            link,
          });
          return ok({ sent: true });
        },
      })
  );

  /* ─────────────────────────── ADMIN TOOLS ─────────────────────────── */

  server.tool(
    "members_update_role",
    "Change a member's role (MEMBER / MOD / ADMIN). Owner cannot self-demote.",
    {
      targetUserId: z.string().min(1),
      role: z.enum(["MEMBER", "MOD", "ADMIN"]),
    },
    async ({ targetUserId, role }) =>
      withTelemetry({
        ctx,
        toolName: "members_update_role",
        args: { targetUserId, role },
        fn: async () => {
          await updateMemberRole({
            userId: uid,
            communityId: cid,
            targetUserId,
            role,
          });
          return ok({ updated: true, targetUserId, role });
        },
      })
  );

  server.tool(
    "members_remove",
    "Remove a member from the community.",
    { targetUserId: z.string().min(1) },
    async ({ targetUserId }) =>
      withTelemetry({
        ctx,
        toolName: "members_remove",
        args: { targetUserId },
        fn: async () => {
          await removeMember({
            userId: uid,
            communityId: cid,
            targetUserId,
          });
          return ok({ removed: true, targetUserId });
        },
      })
  );

  server.tool(
    "courses_create",
    "Create a new course in this community.",
    {
      slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
      title: z.string().min(2).max(120),
      description: z.string().max(5000).optional(),
      pillar: z.string().optional(),
      level: z.string().optional(),
      isPublished: z.boolean().optional(),
    },
    async (args) =>
      withTelemetry({
        ctx,
        toolName: "courses_create",
        args,
        fn: async () => {
          const course = await createCourse({
            userId: uid,
            communityId: cid,
            ...args,
          });
          return ok({ id: course.id, slug: course.slug });
        },
      })
  );

  server.tool(
    "courses_add_lesson",
    "Add a lesson to an existing course.",
    {
      courseId: z.string().cuid(),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      content: z.string().max(50000).optional(),
      videoUrl: z.string().url().optional(),
      duration: z.number().int().nonnegative().optional(),
      position: z.number().int().nonnegative().optional(),
    },
    async (args) =>
      withTelemetry({
        ctx,
        toolName: "courses_add_lesson",
        args,
        fn: async () => {
          const lesson = await createLesson({
            userId: uid,
            courseId: args.courseId,
            title: args.title,
            description: args.description,
            content: args.content,
            videoUrl: args.videoUrl,
            duration: args.duration,
            position: args.position,
          });
          return ok({ id: lesson.id });
        },
      })
  );

  server.tool(
    "community_update_info",
    "Update community name/tagline/description/banner/icon (NOT slug, NOT owner).",
    {
      name: z.string().min(2).max(80).optional(),
      tagline: z.string().max(160).optional(),
      description: z.string().max(5000).optional(),
      bannerUrl: z.string().url().nullable().optional(),
      iconUrl: z.string().url().nullable().optional(),
    },
    async (args) =>
      withTelemetry({
        ctx,
        toolName: "community_update_info",
        args,
        fn: async () => {
          await updateCommunityInfo({
            userId: uid,
            communityId: cid,
            name: args.name,
            tagline: args.tagline,
            description: args.description,
            bannerUrl: args.bannerUrl ?? undefined,
            iconUrl: args.iconUrl ?? undefined,
          });
          return ok({ updated: true });
        },
      })
  );

  return server;
}
