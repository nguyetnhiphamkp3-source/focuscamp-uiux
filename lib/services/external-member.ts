/**
 * External-member provisioning.
 *
 * Used by the landing-page webhook (POST /api/integrations/member): after a
 * customer pays on an external landing page, create/find their focus.camp
 * account (passwordless), join them to the community (free tier) and optionally
 * enroll them in a challenge — WITHOUT a focus.camp payment.
 *
 * Idempotent per (apiKeyId, externalOrderId): re-runs (LDP retries) return the
 * original result instead of duplicating work or re-sending login emails.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { joinCommunity, assertCommunityCanWrite } from "@/lib/services/community";
import { joinChallenge } from "@/lib/services/challenge-member";
import { logger } from "@/lib/logger";

export interface ProvisionExternalMemberInput {
  apiKeyId: string;
  communityId: string;
  email: string;
  name: string;
  /** Challenge slug within the key's community. Optional — omit to only join community. */
  challengeSlug?: string | null;
  /** Caller's order id — the idempotency key for this provision. */
  externalOrderId: string;
}

export interface ProvisionExternalMemberResult {
  userId: string;
  /** True only when this call created a brand-new User row. */
  userCreated: boolean;
  /** True when the member is enrolled in the requested challenge. */
  challengeJoined: boolean;
  /** True when this externalOrderId was already processed before (no new work). */
  alreadyProcessed: boolean;
}

export async function provisionExternalMember(
  input: ProvisionExternalMemberInput
): Promise<ProvisionExternalMemberResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  // 1. Idempotency: short-circuit if this order was already processed.
  // NOTE: the dedupe key is (apiKeyId, externalOrderId) only — it does NOT
  // include challengeSlug. Callers MUST use a unique externalOrderId per intended
  // (member, challenge) outcome; reusing an id with a different challenge silently
  // returns the original result without joining the new challenge.
  const prior = await prisma.externalMemberProvision.findUnique({
    where: {
      apiKeyId_externalOrderId: {
        apiKeyId: input.apiKeyId,
        externalOrderId: input.externalOrderId,
      },
    },
    select: { userId: true, userCreated: true, challengeId: true },
  });
  if (prior) {
    return {
      userId: prior.userId,
      userCreated: prior.userCreated,
      challengeJoined: prior.challengeId !== null,
      alreadyProcessed: true,
    };
  }

  // 2. Enforce the community plan allows writes BEFORE any mutation, so the
  //    community-only and challenge paths behave identically and we never create
  //    a half-provisioned member (user + membership but no challenge/audit row)
  //    when the owner's plan is pending/expired. joinChallenge enforces the same
  //    gate internally; doing it up front lets us fail fast with a stable code.
  try {
    await assertCommunityCanWrite(input.communityId);
  } catch {
    throw new Error("community_inactive");
  }

  // 3. Resolve + validate challenge belongs to this community (if requested).
  let challengeId: string | null = null;
  if (input.challengeSlug) {
    const challenge = await prisma.challenge.findUnique({
      where: {
        communityId_slug: {
          communityId: input.communityId,
          slug: input.challengeSlug,
        },
      },
      select: { id: true },
    });
    if (!challenge) throw new Error("challenge_not_found");
    challengeId = challenge.id;
  }

  // 4. Upsert user by email (passwordless — no password field exists).
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });
  let userId: string;
  let userCreated = false;
  if (existing) {
    userId = existing.id;
    // Fill name only if currently empty — never overwrite a real name.
    if (!existing.name?.trim() && name) {
      await prisma.user.update({ where: { id: userId }, data: { name } });
    }
  } else {
    try {
      const created = await prisma.user.create({
        data: { email, name: name || null },
        select: { id: true },
      });
      userId = created.id;
      userCreated = true;
    } catch (err) {
      // Race: another request created the same email between find + create.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const row = await prisma.user.findUniqueOrThrow({
          where: { email },
          select: { id: true },
        });
        userId = row.id;
      } else {
        throw err;
      }
    }
  }

  // 5. Join community (free tier — idempotent, transaction-wrapped).
  await joinCommunity(userId, input.communityId);

  // 6. Enroll in challenge (lands ACTIVE, no payment, no personalStartsAt).
  let challengeJoined = false;
  if (challengeId) {
    await joinChallenge({ userId, challengeId });
    challengeJoined = true;
  }

  // 7. Record provision (idempotency + audit). Race on the unique key → another
  //    concurrent request already recorded it; treat as already processed.
  try {
    await prisma.externalMemberProvision.create({
      data: {
        apiKeyId: input.apiKeyId,
        communityId: input.communityId,
        userId,
        challengeId,
        email,
        externalOrderId: input.externalOrderId,
        userCreated,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info(
        { apiKeyId: input.apiKeyId, externalOrderId: input.externalOrderId },
        "[external-member] concurrent duplicate, already provisioned"
      );
      return { userId, userCreated: false, challengeJoined, alreadyProcessed: true };
    }
    throw err;
  }

  logger.info(
    {
      apiKeyId: input.apiKeyId,
      communityId: input.communityId,
      userId,
      userCreated,
      challengeJoined,
      externalOrderId: input.externalOrderId,
    },
    "[external-member] provisioned"
  );

  return { userId, userCreated, challengeJoined, alreadyProcessed: false };
}
