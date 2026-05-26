import { generateObject } from "ai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildModel } from "@/lib/ai-model";
import { getAgentProfile, getAgentReviewModelConfig } from "@/lib/services/agent";
import { reviewSubmission } from "@/lib/services/challenge-member";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const reviewResultSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "FLAG"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
});

/**
 * Trigger AI review only if the challenge has it enabled.
 * Can be called with just checkinId — looks up challengeId internally.
 */
export async function triggerAIReviewIfEnabled(checkinId: string) {
  try {
    const checkin = await prisma.checkin.findUnique({
      where: { id: checkinId },
      select: { challengeId: true, challenge: { select: { aiReviewEnabled: true } } },
    });
    if (!checkin?.challenge.aiReviewEnabled) return;
    await runAIReview({ checkinId });
  } catch (err) {
    logger.warn({ err, checkinId }, "[ai-review] triggerAIReviewIfEnabled failed");
  }
}

/**
 * Run AI review on a single checkin. Idempotent — skips if already reviewed.
 */
export async function runAIReview({ checkinId }: { checkinId: string }) {
  const checkin = await prisma.checkin.findUnique({
    where: { id: checkinId },
    include: {
      task: { select: { aiReviewGuidelines: true, aiReviewRedFlags: true, evidenceType: true, title: true } },
      challenge: {
        select: {
          id: true,
          communityId: true,
          aiReviewEnabled: true,
          aiReviewThreshold: true,
          aiReviewFallback: true,
          aiReviewProviderId: true,
          aiReviewProvider: true,
          aiReviewModel: true,
        },
      },
    },
  });

  if (!checkin || !checkin.challenge.aiReviewEnabled) return;
  if (checkin.status !== "PENDING") return;
  if (!checkin.task?.aiReviewGuidelines) return;

  const { challenge } = checkin;

  // Rate limit per community
  const rl = await rateLimit({
    key: `ai-review:${challenge.communityId}`,
    limit: 100,
    windowSec: 3600,
  });
  if (!rl.ok) {
    logger.warn({ communityId: challenge.communityId }, "[ai-review] rate limited");
    return;
  }

  // Resolve model: challenge override > community review brain > chat brain > legacy
  const modelConfig = await getAgentReviewModelConfig({
    communityId: challenge.communityId,
    challengeProviderId: challenge.aiReviewProviderId,
    challengeModel: challenge.aiReviewModel,
    legacyProvider: challenge.aiReviewProvider,
  });
  if (!modelConfig) {
    logger.warn({ communityId: challenge.communityId }, "[ai-review] no API key");
    return;
  }
  const modelId = modelConfig.modelId;
  const model = buildModel(modelConfig);
  const agentProfile = await getAgentProfile(challenge.communityId);

  // Build prompt
  const useVision = (checkin.task.evidenceType === "IMAGE" || checkin.task.evidenceType === "TEXT_IMAGE") && checkin.imageUrl;
  const systemPrompt = buildReviewPrompt(checkin.task.aiReviewGuidelines, checkin.task.aiReviewRedFlags);

  const userContent: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [
    { type: "text", text: `Task: ${checkin.task.title}\n\nSubmission:\n${checkin.content}${checkin.linkUrl ? `\nLink: ${checkin.linkUrl}` : ""}` },
  ];
  if (useVision && checkin.imageUrl) {
    userContent.push({ type: "image", image: new URL(checkin.imageUrl) });
  }

  try {
    const { object: result } = await generateObject({
      model,
      schema: reviewResultSchema,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.3,
    });

    const aiReviewData = {
      decision: result.decision,
      confidence: result.confidence,
      reasoning: result.reasoning,
      model: modelId,
      providerType: modelConfig.providerType,
      providerId: modelConfig.providerId,
      reviewerName: agentProfile.name,
      reviewerAvatarUrl: agentProfile.avatarUrl,
      reviewedAt: new Date().toISOString(),
    };

    // Apply decision
    const threshold = challenge.aiReviewThreshold;
    if (result.decision === "APPROVE" && result.confidence >= threshold) {
      await reviewSubmission({
        userId: "ai-review",
        checkinId,
        action: "APPROVE",
        note: `${agentProfile.name} đã duyệt (${Math.round(result.confidence * 100)}%) — ${result.reasoning}`,
        internal: true,
      });
    } else if (result.decision === "REJECT" && result.confidence >= threshold) {
      await reviewSubmission({
        userId: "ai-review",
        checkinId,
        action: "REJECT",
        note: `${agentProfile.name} từ chối (${Math.round(result.confidence * 100)}%) — ${result.reasoning}`,
        internal: true,
      });
    } else if (result.decision === "FLAG" || result.confidence < threshold) {
      // Below threshold or explicit FLAG — keep PENDING for admin
      if (challenge.aiReviewFallback === "REJECT" && result.decision === "REJECT") {
        await reviewSubmission({
          userId: "ai-review",
          checkinId,
          action: "REJECT",
          note: `${agentProfile.name} từ chối (${Math.round(result.confidence * 100)}%) — ${result.reasoning}`,
          internal: true,
        });
      }
      // else: keep PENDING, admin will see it in "AI Flagged" tab
    }

    // Always save aiReviewData
    await prisma.checkin.update({
      where: { id: checkinId },
      data: { aiReviewData: aiReviewData as Prisma.InputJsonValue },
    });

    logger.info({ checkinId, decision: result.decision, confidence: result.confidence }, "[ai-review] completed");
  } catch (err) {
    // If vision fails, retry text-only
    if (useVision) {
      logger.warn({ err, checkinId }, "[ai-review] vision failed, retrying text-only");
      try {
        const { object: result } = await generateObject({
          model,
          schema: reviewResultSchema,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent.filter((c) => c.type === "text") }],
          temperature: 0.3,
        });
        const aiReviewData = {
          decision: result.decision,
          confidence: result.confidence,
          reasoning: result.reasoning,
          model: modelId,
          providerType: modelConfig.providerType,
          providerId: modelConfig.providerId,
          reviewerName: agentProfile.name,
          reviewerAvatarUrl: agentProfile.avatarUrl,
          reviewedAt: new Date().toISOString(),
          visionFailed: true,
        };
        await prisma.checkin.update({
          where: { id: checkinId },
          data: { aiReviewData: aiReviewData as Prisma.InputJsonValue },
        });
      } catch (retryErr) {
        logger.error({ err: retryErr, checkinId }, "[ai-review] text-only retry also failed");
      }
    } else {
      logger.error({ err, checkinId }, "[ai-review] generateObject failed");
    }
  }
}

/**
 * Scan all PENDING checkins for a challenge and run AI review on each.
 */
export async function scanPendingCheckins(challengeId: string) {
  const pending = await prisma.checkin.findMany({
    where: { challengeId, status: "PENDING", aiReviewData: { equals: Prisma.DbNull } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  for (const checkin of pending) {
    await runAIReview({ checkinId: checkin.id });
  }

  logger.info({ challengeId, count: pending.length }, "[ai-review] batch scan completed");
}

function buildReviewPrompt(guidelines: string, redFlags: string | null): string {
  let prompt = `You are an AI submission reviewer for a daily challenge platform.

Review the member's submission against the criteria below. Return a JSON decision.

## Approval Criteria
${guidelines}`;

  if (redFlags) {
    prompt += `\n\n## Red Flags (auto-reject if detected)\n${redFlags}`;
  }

  prompt += `\n\n## Instructions
- APPROVE: submission clearly meets the criteria
- REJECT: submission clearly violates criteria or contains red flags
- FLAG: uncertain, needs human review
- Set confidence 0.0-1.0 based on how certain you are
- Keep reasoning under 100 words, in Vietnamese`;

  return prompt;
}
