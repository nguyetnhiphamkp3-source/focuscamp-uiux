import { cookies } from "next/headers";

export const PREVIEW_MEMBER_COOKIE = "fc_preview_member";

export async function getEffectiveOwnership(realIsOwner: boolean) {
  if (!realIsOwner) return { effectiveIsOwner: false, previewAsMember: false };
  const cookieStore = await cookies();
  const previewAsMember =
    cookieStore.get(PREVIEW_MEMBER_COOKIE)?.value === "1";
  return { effectiveIsOwner: !previewAsMember, previewAsMember };
}
