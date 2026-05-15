/**
 * Community role / permission source of truth.
 *
 * Owner is NOT a Membership.role; owner status comes from Community.ownerId.
 * Membership.role is for delegated operators: ADMIN, MOD, MEMBER.
 *
 * See docs/roles-permissions.md before changing this matrix.
 */
export type CommunityRole = "OWNER" | "ADMIN" | "MOD" | "MEMBER";

export type CommunityPermission =
  | "manage_settings"
  | "manage_roles"
  | "manage_billing"
  | "manage_api_keys"
  | "manage_ai_agent"
  | "manage_courses"
  | "manage_challenges"
  | "review_challenge_members"
  | "review_submissions"
  | "moderate_content"
  | "publish_signals"
  | "manage_events"
  | "manage_marketplace"
  | "manage_orders";

const ROLE_PERMISSIONS: Record<CommunityRole, ReadonlySet<CommunityPermission>> = {
  OWNER: new Set([
    "manage_settings",
    "manage_roles",
    "manage_billing",
    "manage_api_keys",
    "manage_ai_agent",
    "manage_courses",
    "manage_challenges",
    "review_challenge_members",
    "review_submissions",
    "moderate_content",
    "publish_signals",
    "manage_events",
    "manage_marketplace",
    "manage_orders",
  ]),
  ADMIN: new Set([
    "manage_courses",
    "manage_challenges",
    "review_challenge_members",
    "review_submissions",
    "moderate_content",
    "publish_signals",
    "manage_events",
  ]),
  MOD: new Set(["review_submissions", "moderate_content"]),
  MEMBER: new Set(),
};

export function normalizeCommunityRole(role: string | null | undefined): Exclude<CommunityRole, "OWNER"> {
  if (role === "ADMIN" || role === "MOD") return role;
  return "MEMBER";
}

export function effectiveCommunityRole(input: {
  isOwner: boolean;
  membershipRole?: string | null;
}): CommunityRole {
  return input.isOwner ? "OWNER" : normalizeCommunityRole(input.membershipRole);
}

export function canCommunity(role: CommunityRole, permission: CommunityPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function communityPermissionFlags(role: CommunityRole) {
  return {
    canManageSettings: canCommunity(role, "manage_settings"),
    canManageRoles: canCommunity(role, "manage_roles"),
    canManageBilling: canCommunity(role, "manage_billing"),
    canManageApiKeys: canCommunity(role, "manage_api_keys"),
    canManageAiAgent: canCommunity(role, "manage_ai_agent"),
    canManageCourses: canCommunity(role, "manage_courses"),
    canManageChallenges: canCommunity(role, "manage_challenges"),
    canReviewChallengeMembers: canCommunity(role, "review_challenge_members"),
    canReviewSubmissions: canCommunity(role, "review_submissions"),
    canModerateContent: canCommunity(role, "moderate_content"),
    canPublishSignals: canCommunity(role, "publish_signals"),
    canManageEvents: canCommunity(role, "manage_events"),
    canManageMarketplace: canCommunity(role, "manage_marketplace"),
    canManageOrders: canCommunity(role, "manage_orders"),
  };
}
