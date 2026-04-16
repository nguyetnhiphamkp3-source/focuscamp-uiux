/**
 * Marketplace product admin CRUD.
 * Community owner only.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== userId)
    throw new Error("Chỉ admin cộng đồng mới quản lý sản phẩm");
}

export async function createProduct(input: {
  userId: string;
  communityId: string;
  slug: string;
  title: string;
  description?: string;
  type?: string; // TEMPLATE | TOOL | SOP | BUNDLE
  pillar?: string;
  priceVnd?: number;
  isFree?: boolean;
  externalUrl?: string;
}) {
  await assertCommunityOwner(input.userId, input.communityId);
  const existing = await prisma.product.findFirst({
    where: { communityId: input.communityId, slug: input.slug },
    select: { id: true },
  });
  if (existing)
    throw new Error(`Slug "${input.slug}" đã tồn tại trong community này`);

  const product = await prisma.product.create({
    data: {
      communityId: input.communityId,
      slug: input.slug,
      title: input.title,
      description: input.description?.trim() || null,
      type: input.type || "TEMPLATE",
      pillar: input.pillar || null,
      priceVnd: input.priceVnd ?? 0,
      isFree: input.isFree ?? (!input.priceVnd || input.priceVnd === 0),
      externalUrl: input.externalUrl?.trim() || null,
    },
  });
  logger.info({ productId: product.id, by: input.userId }, "[product] created");
  return product;
}
