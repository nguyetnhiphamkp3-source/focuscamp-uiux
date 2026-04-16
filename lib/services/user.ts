/**
 * User service — identity-level mutations (profile, handle). Anything that
 * touches the User row lives here. Membership-level fields (role/xp/class)
 * belong in community-settings.ts or challenge.ts, not here.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function updateOwnProfile(input: {
  userId: string;
  name?: string;
  bio?: string;
  location?: string;
  handle?: string;
}) {
  try {
    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: {
        name: input.name?.trim() || null,
        bio: input.bio?.trim() || null,
        location: input.location?.trim() || null,
        handle: input.handle?.trim().toLowerCase() || null,
      },
    });
    logger.info({ userId: input.userId }, "[user] profile updated");
    return updated;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Handle đã được dùng bởi người khác");
    }
    throw err;
  }
}
