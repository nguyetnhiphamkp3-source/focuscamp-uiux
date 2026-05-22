import { prisma } from "@/lib/prisma";

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin === true;
}

