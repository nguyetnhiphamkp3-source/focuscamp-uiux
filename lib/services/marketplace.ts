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
  type?: string; // TEMPLATE | TOOL | SOP | BUNDLE | LICENSE
  pillar?: string;
  priceVnd?: number;
  isFree?: boolean;
  externalUrl?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  licenseKeyTemplate?: string;
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
      fileUrl: input.fileUrl?.trim() || null,
      thumbnailUrl: input.thumbnailUrl?.trim() || null,
      licenseKeyTemplate:
        input.type === "LICENSE"
          ? input.licenseKeyTemplate?.trim() || "FC-{XXXX}-{XXXX}"
          : null,
    },
  });
  logger.info({ productId: product.id, by: input.userId }, "[product] created");
  return product;
}

/**
 * Update general product settings (title, price, visibility, bump/upsell refs).
 * Community owner only.
 */
export async function updateProductSettings(input: {
  userId: string;
  productId: string;
  title?: string;
  description?: string | null;
  priceVnd?: number;
  priceOldVnd?: number | null;
  isVisible?: boolean;
  bumpProductId?: string | null;
  upsellProductId?: string | null;
  showInCartBump?: boolean;
}): Promise<void> {
  // 1. Load product + community to check ownership
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { community: { select: { ownerId: true, id: true } } },
  });
  if (!product) throw new Error("product_not_found");
  if (product.community.ownerId !== input.userId) throw new Error("unauthorized");

  // 2. Validate bump/upsell products belong to same community and not self-reference
  for (const refId of [input.bumpProductId, input.upsellProductId]) {
    if (!refId) continue;
    if (refId === input.productId) throw new Error("cannot_self_reference");
    const ref = await prisma.product.findUnique({
      where: { id: refId },
      select: { communityId: true },
    });
    if (!ref || ref.communityId !== product.communityId) throw new Error("invalid_bump_product");
  }

  // 3. Update
  await prisma.product.update({
    where: { id: input.productId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priceVnd !== undefined && { priceVnd: input.priceVnd }),
      ...(input.priceOldVnd !== undefined && { priceOldVnd: input.priceOldVnd }),
      ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
      ...(input.bumpProductId !== undefined && { bumpProductId: input.bumpProductId }),
      ...(input.upsellProductId !== undefined && { upsellProductId: input.upsellProductId }),
      ...(input.showInCartBump !== undefined && { showInCartBump: input.showInCartBump }),
    },
  });
  logger.info({ productId: input.productId, by: input.userId }, "[product] settings updated");
}

/**
 * Owner toggles whether this product appears on the global marketplace.
 */
export async function setProductFeaturedGlobal(input: {
  userId: string;
  productId: string;
  featured: boolean;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { communityId: true },
  });
  if (!product) throw new Error("Sản phẩm không tồn tại");
  await assertCommunityOwner(input.userId, product.communityId);
  await prisma.product.update({
    where: { id: input.productId },
    data: { featuredOnGlobal: input.featured },
  });
  logger.info(
    { productId: input.productId, featured: input.featured, by: input.userId },
    "[product] featuredOnGlobal toggled"
  );
}
