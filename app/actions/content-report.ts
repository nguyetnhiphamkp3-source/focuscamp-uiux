"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { CreateReportSchema, ResolveReportSchema } from "@/lib/validations";
import {
  createContentReport,
  resolveContentReport,
} from "@/lib/services/content-report";
import { assertCommunityPermission } from "@/lib/services/community-settings";

type ActionResult = { ok: true } | { ok: false; reason: string };

export async function reportContentAction(input: {
  communitySlug: string;
  targetType: "POST" | "COMMENT";
  postId?: string;
  commentId?: string;
  reason: string;
  detail?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const rl = await rateLimit({ key: `report-create:${s.user.id}`, limit: 5, windowSec: 60 });
  if (!rl.ok) return { ok: false, reason: "Bạn gửi báo cáo quá nhanh, vui lòng thử lại sau." };

  const parsed = CreateReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message ?? "invalid" };

  try {
    await createContentReport({
      reporterId: s.user.id,
      targetType: parsed.data.targetType,
      postId: parsed.data.postId,
      commentId: parsed.data.commentId,
      reason: parsed.data.reason as "SPAM" | "HARASSMENT" | "SENSITIVE" | "RULE_VIOLATION" | "OTHER",
      detail: parsed.data.detail,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { ok: false, reason: "Bạn đã báo cáo nội dung này rồi." };
    }
    logError(err, { userId: s.user.id });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function resolveReportAction(input: {
  communitySlug: string;
  communityId: string;
  reportId: string;
  action: "DISMISS" | "DELETE_CONTENT";
  note?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  try {
    await assertCommunityPermission(s.user.id, input.communityId, "moderate_content");
  } catch {
    return { ok: false, reason: "Bạn không có quyền xử lý báo cáo." };
  }

  const parsed = ResolveReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message ?? "invalid" };

  try {
    await resolveContentReport({
      reportId: parsed.data.reportId,
      resolvedById: s.user.id,
      action: parsed.data.action,
      note: parsed.data.note,
    });
    revalidatePath(`/c/${input.communitySlug}/reports`);
    revalidatePath(`/c/${input.communitySlug}/feed`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, reportId: input.reportId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
