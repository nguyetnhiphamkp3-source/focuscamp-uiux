/**
 * Marketplace product admin CRUD.
 * Permitted for community OWNER + ADMIN (manage_marketplace permission).
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

async function assertCanManageMarketplace(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      ownerId: true,
      memberships: { where: { userId }, select: { role: true } },
    },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: c.ownerId === userId,
    membershipRole: c.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_marketplace")) {
    throw new Error("Cần quyền ADMIN để quản lý marketplace");
  }
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
  await assertCanManageMarketplace(input.userId, input.communityId);
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
  type?: string;
  pillar?: string | null;
  thumbnailUrl?: string | null;
  fileUrl?: string | null;
  externalUrl?: string | null;
  licenseKeyTemplate?: string | null;
  featuredOnGlobal?: boolean;
}): Promise<void> {
  // 1. Load product + community to check ownership
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { communityId: true },
  });
  if (!product) throw new Error("product_not_found");
  await assertCanManageMarketplace(input.userId, product.communityId);

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
      ...(input.type !== undefined && { type: input.type }),
      ...(input.pillar !== undefined && { pillar: input.pillar || null }),
      ...(input.thumbnailUrl !== undefined && { thumbnailUrl: input.thumbnailUrl || null }),
      ...(input.fileUrl !== undefined && { fileUrl: input.fileUrl || null }),
      ...(input.externalUrl !== undefined && { externalUrl: input.externalUrl || null }),
      ...(input.licenseKeyTemplate !== undefined && { licenseKeyTemplate: input.licenseKeyTemplate || null }),
      ...(input.featuredOnGlobal !== undefined && { featuredOnGlobal: input.featuredOnGlobal }),
    },
  });
  logger.info({ productId: input.productId, by: input.userId }, "[product] settings updated");
}

/**
 * Delete a product. Refuses if any COMPLETED purchases exist (paying customers
 * would lose access). PENDING/EXPIRED purchases get hard-deleted alongside.
 */
export async function deleteProduct(input: {
  userId: string;
  productId: string;
}): Promise<{ communityId: string }> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { communityId: true },
  });
  if (!product) throw new Error("Sản phẩm không tồn tại");
  await assertCanManageMarketplace(input.userId, product.communityId);
  const completed = await prisma.purchase.count({
    where: { productId: input.productId, status: "COMPLETED" },
  });
  if (completed > 0) {
    throw new Error(
      `Không thể xóa: đã có ${completed} đơn hàng đã thanh toán. Hãy ẩn sản phẩm thay vì xóa.`,
    );
  }
  await prisma.$transaction(async (tx) => {
    // Drop bump/upsell references from other products before deleting
    await tx.product.updateMany({
      where: { bumpProductId: input.productId },
      data: { bumpProductId: null },
    });
    await tx.product.updateMany({
      where: { upsellProductId: input.productId },
      data: { upsellProductId: null },
    });
    await tx.purchase.deleteMany({ where: { productId: input.productId } });
    await tx.product.delete({ where: { id: input.productId } });
  });
  logger.info({ productId: input.productId, by: input.userId }, "[product] deleted");
  return { communityId: product.communityId };
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
  await assertCanManageMarketplace(input.userId, product.communityId);
  await prisma.product.update({
    where: { id: input.productId },
    data: { featuredOnGlobal: input.featured },
  });
  logger.info(
    { productId: input.productId, featured: input.featured, by: input.userId },
    "[product] featuredOnGlobal toggled"
  );
}
