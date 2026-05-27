/**
 * User service - identity-level mutations (profile, handle). Anything that
 * touches the User row lives here. Membership-level fields (role/xp/class)
 * belong in community-settings.ts or challenge.ts, not here.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

const HANDLE_ALREADY_USED = "Handle da duoc dung boi nguoi khac";
const HANDLE_CHANGE_LIMIT_REACHED = "Ban chi duoc doi handle 1 lan";
const HANDLE_REQUIRED_AFTER_SET = "Khong the xoa handle sau khi da dat";

type UserTx = Prisma.TransactionClient;

export async function updateOwnProfile(input: {
  userId: string;
  name?: string;
  bio?: string;
  location?: string;
  handle?: string;
  image?: string;
}) {
  try {
    const nextHandle = input.handle?.trim().toLowerCase() || null;
    const updated = await prisma.$transaction(
      async (tx) => {
        const current = await tx.user.findUnique({
          where: { id: input.userId },
          select: { handle: true, handleChangeCount: true },
        });
        if (!current) throw new Error("User khong ton tai");

        const data: Prisma.UserUpdateInput = {
          name: input.name?.trim() || null,
          bio: input.bio?.trim() || null,
          location: input.location?.trim() || null,
        };
        if (input.image !== undefined) {
          data.image = input.image.trim() || null;
        }

        if (current.handle !== nextHandle) {
          if (current.handle && !nextHandle) {
            throw new Error(HANDLE_REQUIRED_AFTER_SET);
          }

          if (nextHandle) {
            await assertHandleAvailable(tx, nextHandle);
          }

          if (current.handle && nextHandle) {
            if (current.handleChangeCount >= 1) {
              throw new Error(HANDLE_CHANGE_LIMIT_REACHED);
            }
            await tx.userHandleHistory.create({
              data: { userId: input.userId, handle: current.handle },
            });
            data.handleChangeCount = { increment: 1 };
          }

          data.handle = nextHandle;
        }

        return tx.user.update({
          where: { id: input.userId },
          data,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    logger.info({ userId: input.userId }, "[user] profile updated");
    return updated;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(HANDLE_ALREADY_USED);
    }
    throw err;
  }
}

async function assertHandleAvailable(tx: UserTx, handle: string) {
  const existingUser = await tx.user.findFirst({
    where: {
      OR: [{ handle }, { id: handle }],
    },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error(HANDLE_ALREADY_USED);
  }

  const existingHistory = await tx.userHandleHistory.findUnique({
    where: { handle },
    select: { userId: true },
  });
  if (existingHistory) {
    throw new Error(HANDLE_ALREADY_USED);
  }
}

export type ResolvedUserHandle = {
  userId: string;
  canonicalHandle: string;
  shouldRedirect: boolean;
};

export async function resolveUserHandleParam(
  rawParam: string,
): Promise<ResolvedUserHandle | null> {
  const clean = cleanHandleParam(rawParam);
  if (!clean) return null;

  const [resolved] = await prisma.$queryRaw<
    Array<{ id: string; handle: string | null }>
  >`
    SELECT "id", "handle"
    FROM (
      SELECT u."id", u."handle", 1 AS "priority"
      FROM "User" u
      WHERE u."handle" = ${clean}

      UNION ALL

      SELECT u."id", u."handle", 2 AS "priority"
      FROM "User" u
      WHERE u."id" = ${clean}

      UNION ALL

      SELECT u."id", u."handle", 3 AS "priority"
      FROM "UserHandleHistory" h
      INNER JOIN "User" u ON u."id" = h."userId"
      WHERE h."handle" = ${clean}
    ) resolved_user
    ORDER BY "priority"
    LIMIT 1
  `;
  if (resolved) {
    return toResolvedHandle(clean, resolved.id, resolved.handle);
  }

  return null;
}

export function userProfilePath(
  resolved: Pick<ResolvedUserHandle, "canonicalHandle">,
  suffix = "",
) {
  return `/u/${encodeURIComponent(resolved.canonicalHandle)}${suffix}`;
}

function cleanHandleParam(rawParam: string) {
  return decodeURIComponent(rawParam).trim().replace(/^@/, "").toLowerCase();
}

function toResolvedHandle(
  cleanParam: string,
  userId: string,
  handle: string | null,
): ResolvedUserHandle {
  const canonicalHandle = handle || userId;
  return {
    userId,
    canonicalHandle,
    shouldRedirect: cleanParam !== canonicalHandle,
  };
}
