/**
 * Protected file download for purchased products.
 * - Auth required.
 * - User must have a COMPLETED Purchase for this product.
 * - Returns 302 redirect to short-lived presigned R2 URL (15 min).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl, keyFromPublicUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true, fileUrl: true, communityId: true, isFree: true },
  });
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!product.fileUrl) {
    return NextResponse.json(
      { error: "no_file", message: "Sản phẩm này không có file đính kèm" },
      { status: 404 }
    );
  }

  // Permission: must have completed purchase OR product is free + user is community member
  if (!product.isFree) {
    const purchase = await prisma.purchase.findFirst({
      where: {
        productId,
        userId: s.user.id,
        status: "COMPLETED",
      },
      select: { id: true },
    });
    if (!purchase) {
      return NextResponse.json(
        { error: "not_purchased", message: "Bạn cần mua sản phẩm này trước" },
        { status: 403 }
      );
    }
  } else {
    const member = await prisma.membership.findUnique({
      where: {
        userId_communityId: {
          userId: s.user.id,
          communityId: product.communityId,
        },
      },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: "not_a_member", message: "Cần là thành viên cộng đồng" },
        { status: 403 }
      );
    }
  }

  // Generate presigned URL
  const key = keyFromPublicUrl(product.fileUrl);
  if (!key) {
    logger.warn(
      { productId, fileUrl: product.fileUrl },
      "[download] cannot derive key from fileUrl"
    );
    return NextResponse.json(
      { error: "bad_file_url" },
      { status: 500 }
    );
  }

  // Use the file's basename as download filename, prefixed with product title
  const basename = key.split("/").pop() || "download";
  const dotIdx = basename.lastIndexOf(".");
  const ext = dotIdx > 0 ? basename.slice(dotIdx) : "";
  const safeName =
    product.title.replace(/[^\w\s.-]/g, "_").slice(0, 80) + ext;

  const url = await getPresignedDownloadUrl({
    key,
    filename: safeName,
    expiresIn: 900,
  });
  if (!url) {
    return NextResponse.json(
      { error: "presign_failed" },
      { status: 500 }
    );
  }

  logger.info(
    { productId, userId: s.user.id, key },
    "[download] presigned"
  );
  return NextResponse.redirect(url, 302);
}
