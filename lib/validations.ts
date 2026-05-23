/**
 * Zod schemas for validating user input (server actions, API routes).
 * Every external input should be parsed through one of these.
 */
import { z } from "zod";
import { COMMUNITY_CATEGORIES } from "@/lib/community-categories";
import { parseChallengeVideoUrl } from "@/lib/challenge-video";

/* ========== Shared primitives (used by multiple schemas below) ========== */
export const SlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9, -");

/* ========== Payment / SePay ========== */
export const SePayWebhookSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  gateway: z.string().optional(),
  transactionDate: z.string().optional(),
  accountNumber: z.string().optional(),
  code: z.string().nullable().optional(),
  content: z.string().optional(),
  transferType: z.enum(["in", "out", "credit", "debit"]).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  referenceCode: z.string().optional(),
  accumulated: z.union([z.string(), z.number()]).optional(),
  subAccount: z.string().nullable().optional(),
  transferAmount: z.union([z.string(), z.number()]).optional(),
  description: z.string().optional(),
});
export type SePayWebhookInput = z.infer<typeof SePayWebhookSchema>;

/* ========== Chat ========== */
export const SendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Tin nhắn không được trống")
    .max(2000, "Tin nhắn quá dài (max 2000 ký tự)"),
});

/* ========== Community membership ========== */
export const JoinCommunitySchema = z.object({
  communityId: z.string().cuid(),
  className: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(40)
    .optional()
    .or(z.literal("")),
});

/* ========== Challenge ========== */
export const JoinChallengeSchema = z.object({
  challengeId: z.string().cuid(),
});

const PricingConfigSchema = z.object({
  guestVnd: z.number().nonnegative().optional(),
  memberVnd: z.number().nonnegative().optional(),
  tierPrices: z.record(z.string(), z.number().nonnegative()).optional(),
  aipPrice: z.number().nonnegative().optional(),
  aipEnabled: z.boolean().optional(),
}).nullable().optional();

export const UpdateChallengeSettingsSchema = z.object({
  challengeId: z.string().cuid(),
  // Deprecated — kept optional so old clients don't break. New code ignores it.
  requiresApproval: z.boolean().optional(),
  autoStartAfterHours: z.number().int().min(1).max(8760).nullable().optional(),
  difficulty: z.enum(["NORMAL", "HARD", "CHAOS"]).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  freezeFromDay: z.number().int().positive().optional().nullable(),
  freezeStartsAt: z.string().datetime().optional().nullable().or(z.literal("")),
  freezeEndsAt: z.string().datetime().optional().nullable().or(z.literal("")),
  bannerUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  bannerMediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  bannerVideoUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  featuredOnGlobal: z.boolean().optional(),
  requiredTier: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  pricingConfig: PricingConfigSchema,
  // Deprecated — checkbox removed from UI; ignored if sent by old clients.
  hideFutureTasks: z.boolean().optional(),
  taskUnlockMode: z.enum(["ALL", "DAILY", "SEQUENTIAL", "MANUAL"]).optional(),
  unlockIntervalHours: z.number().int().positive().max(720).optional(),
  freezeWindows: z
    .array(
      z.object({
        label: z.string().optional(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
      })
    )
    .optional()
    .nullable(),
  pitch: z.string().trim().max(20000).optional().nullable(),
  bumpProductId: z.string().cuid().optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.bannerVideoUrl) return;
  if (parseChallengeVideoUrl(data.bannerVideoUrl)) return;
  ctx.addIssue({
    code: "custom",
    path: ["bannerVideoUrl"],
    message: "Chỉ hỗ trợ video YouTube, Vimeo hoặc Wistia",
  });
}).superRefine((data, ctx) => {
  if (data.bannerMediaType !== "VIDEO") return;
  if (data.bannerVideoUrl && parseChallengeVideoUrl(data.bannerVideoUrl)) return;
  ctx.addIssue({
    code: "custom",
    path: ["bannerVideoUrl"],
    message: "Video thumbnail cần URL YouTube, Vimeo hoặc Wistia",
  });
});

export const CreateChallengeSchema = z.object({
  communityId: z.string().cuid(),
  slug: SlugSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  difficulty: z.enum(["NORMAL", "HARD", "CHAOS"]).optional(),
  requiredDays: z.number().int().positive().max(365).optional(),
  // Deprecated — kept for back-compat.
  requiresApproval: z.boolean().optional(),
  autoStartAfterHours: z.number().int().min(1).max(8760).nullable().optional(),
  bannerUrl: z.string().url().max(500).optional().or(z.literal("")),
  taskUnlockMode: z.enum(["ALL", "DAILY", "SEQUENTIAL", "MANUAL"]).optional(),
  unlockIntervalHours: z.number().int().positive().max(720).optional(),
});

export const CreateChallengeTaskSchema = z.object({
  challengeId: z.string().cuid(),
  dayNumber: z.number().int().positive().max(365),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  sopContent: z.string().trim().max(10000).optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  evidenceType: z.enum(["TEXT", "LINK", "IMAGE", "TEXT_IMAGE"]).optional(),
  evidenceLabel: z.string().trim().max(500).optional().or(z.literal("")),
  label: z.string().trim().max(60).optional().or(z.literal("")),
  unlockAfterHours: z.number().int().min(0).max(720).optional().nullable(),
});

export const DeleteChallengeTaskSchema = z.object({
  taskId: z.string().cuid(),
});

export const UpdateChallengeTaskSchema = z.object({
  taskId: z.string().cuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  sopContent: z.string().trim().max(10000).optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  evidenceType: z.enum(["TEXT", "LINK", "IMAGE", "TEXT_IMAGE"]).optional(),
  evidenceLabel: z.string().trim().max(500).optional().or(z.literal("")),
  label: z.string().trim().max(60).optional().or(z.literal("")),
  unlockAfterHours: z.number().int().min(0).max(720).optional().nullable(),
});

export const ReviewSubmissionSchema = z.object({
  checkinId: z.string().cuid(),
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const ApproveAllPendingSchema = z.object({
  challengeId: z.string().cuid(),
});

export const FlagSubmissionSchema = z.object({
  checkinId: z.string().cuid(),
});

export const ResubmitCheckinSchema = z.object({
  checkinId: z.string().cuid(),
  content: z.string().trim().max(1000),
  linkUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const ChallengeCheckinSchema = z.object({
  challengeId: z.string().cuid(),
  content: z.string().trim().max(1000),
  taskId: z.string().cuid().optional(),
  dayNumber: z.number().int().positive().optional(),
  linkUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

/* ========== Posts (Feed / Cốt / Q&A / Signals) ========== */
export const PostTypeSchema = z.enum(["POST", "QUESTION", "SIGNAL"]);

export const CreatePostSchema = z.object({
  communityId: z.string().cuid(),
  type: PostTypeSchema.default("POST"),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(1, "Nội dung không được trống")
    .max(10000, "Nội dung quá dài (max 10.000 ký tự)"),
  // Pillar key must match one entry in Community.pillarsConfig — validated
  // against the community's config in the service layer, not here.
  pillar: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .or(z.literal("")),
  bountyAip: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export const ReactPostSchema = z.object({
  postId: z.string().cuid(),
  emoji: z.string().min(1).max(10).default("❤️"),
});

export const MarkCotSchema = z.object({
  postId: z.string().cuid(),
});

export const UpdatePostSchema = z.object({
  postId: z.string().cuid(),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(1, "Nội dung không được trống")
    .max(10000, "Nội dung quá dài (max 10.000 ký tự)"),
  pillar: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .or(z.literal("")),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
});

export const DeletePostSchema = z.object({
  postId: z.string().cuid(),
});

export const CreateCommentSchema = z.object({
  postId: z.string().cuid(),
  parentId: z.string().cuid().optional(),
  body: z
    .string()
    .trim()
    .min(1, "Nội dung không được trống")
    .max(5000, "Comment quá dài (max 5000 ký tự)"),
});

export const CommentIdSchema = z.object({
  commentId: z.string().cuid(),
});

export const UpdateCommentSchema = z.object({
  commentId: z.string().cuid(),
  body: z
    .string()
    .trim()
    .min(1, "Nội dung không được trống")
    .max(5000, "Comment quá dài (max 5000 ký tự)"),
});

/* ========== Product purchase ========== */
export const BuyProductSchema = z.object({
  productId: z.string().cuid(),
});

/* ========== User profile ========== */
export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  handle: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "Handle chỉ gồm a-z, 0-9, -, _")
    .optional()
    .or(z.literal("")),
  image: z.string().url().max(500).optional().or(z.literal("")),
});

/* ========== Auth ========== */
export const LoginRedirectSchema = z.object({
  redirectTo: z
    .string()
    .startsWith("/", "Chỉ accept relative paths")
    .max(500)
    .optional(),
});

/* ========== Community concept config ========== */

const KeyString = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Key chỉ gồm a-z, 0-9, -");

const PillarItemSchema = z.object({
  key: KeyString,
  label: z.string().trim().min(1).max(60),
  emoji: z.string().max(8).optional().or(z.literal("")),
  cssClass: z.string().max(60).optional().or(z.literal("")),
  color: z.string().max(40).optional().or(z.literal("")),
});

const ClassItemSchema = z.object({
  key: KeyString,
  label: z.string().trim().min(1).max(60),
  emoji: z.string().max(8).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z.string().max(40).optional().or(z.literal("")),
});

const LevelTierItemSchema = z.object({
  minLevel: z.number().int().nonnegative().max(10000),
  name: z.string().trim().min(1).max(40),
  emoji: z.string().max(8).optional().or(z.literal("")),
  color: z.string().max(40).optional().or(z.literal("")),
});

export const UpdatePillarsSchema = z.object({
  communityId: z.string().cuid(),
  pillars: z.array(PillarItemSchema).max(20),
});

export const UpdateClassesSchema = z.object({
  communityId: z.string().cuid(),
  classes: z.array(ClassItemSchema).max(20),
});

export const UpdateCurrencySchema = z.object({
  communityId: z.string().cuid(),
  currencyName: z.string().trim().min(1).max(30),
  currencyIcon: z.string().trim().min(1).max(8),
  gemsName: z.string().trim().max(30).optional().or(z.literal("")),
  gemsIcon: z.string().trim().max(8).optional().or(z.literal("")),
});

export const UpdateLevelsSchema = z.object({
  communityId: z.string().cuid(),
  tiers: z.array(LevelTierItemSchema).max(50),
});

export const FeatureKeySchema = z.enum([
  "chat",
  "feed",
  "cot",
  "signals",
  "qa",
  "courses",
  "challenges",
  "events",
  "leaderboard",
  "marketplace",
  "agent",
]);

export const UpdateUiConfigSchema = z.object({
  communityId: z.string().cuid(),
  hiddenFeatures: z.array(FeatureKeySchema).max(20),
});

export const ExternalEventTypeSchema = z.enum([
  "new_member",
  "checkin_submitted",
  "post_cot",
  "purchase_completed",
  "challenge_completed",
]);

export const UpdateChannelConfigSchema = z.object({
  communityId: z.string().cuid(),
  discord: z
    .object({
      webhookUrl: z.string().url().or(z.literal("")),
      eventTypes: z.array(ExternalEventTypeSchema),
    })
    .nullable(),
  telegram: z
    .object({
      botToken: z.string().trim().min(0).max(200),
      chatId: z.string().trim().min(0).max(80),
      eventTypes: z.array(ExternalEventTypeSchema),
    })
    .nullable(),
});

export const UpdateMemberRoleSchema = z.object({
  communityId: z.string().cuid(),
  targetUserId: z.string().cuid(),
  role: z.enum(["MEMBER", "MOD", "ADMIN"]),
});

export const RemoveMemberSchema = z.object({
  communityId: z.string().cuid(),
  targetUserId: z.string().cuid(),
});

export const PlanTierSchema = z.enum(["SOLO", "PRO", "AGENCY"]);
const CommunityCategorySchema = z.enum(COMMUNITY_CATEGORIES);

export const CreateCommunitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: SlugSchema,
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  category: CommunityCategorySchema.optional().nullable().or(z.literal("")),
  planTier: PlanTierSchema,
});

export const RenewCommunityPlanSchema = z.object({
  communityId: z.string().cuid(),
});

export const CreateApiKeySchema = z.object({
  communityId: z.string().cuid(),
  name: z.string().trim().min(1).max(60),
  expiresInDays: z.number().int().positive().max(365 * 5).optional().nullable(),
});

export const RevokeApiKeySchema = z.object({
  communityId: z.string().cuid(),
  apiKeyId: z.string().cuid(),
});

export const UpdateCommunityInfoSchema = z.object({
  communityId: z.string().cuid(),
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  category: CommunityCategorySchema.optional().nullable().or(z.literal("")),
  featuredOnGlobal: z.boolean().optional(),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  iconUrl: z.string().url().optional().or(z.literal("")),
  introVideoUrl: z.string().url().optional().or(z.literal("")),
  introGallery: z.array(z.object({
    type: z.enum(["video", "image"]),
    url: z.string().url(),
  })).max(20).optional(),
});

/* ========== Course / Lesson CRUD ========== */
export const CreateCourseSchema = z.object({
  communityId: z.string().cuid(),
  slug: SlugSchema,
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  pillar: z.string().max(40).optional().or(z.literal("")),
  level: z.enum(["BASIC", "ADVANCED", "EXPERT"]).optional(),
  isPublished: z.boolean().optional(),
});

export const UpdateCourseSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  pillar: z.string().max(40).optional().or(z.literal("")),
  level: z.enum(["BASIC", "ADVANCED", "EXPERT"]).optional(),
  isPublished: z.boolean().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
});

export const CreateLessonSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().max(20000).optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  duration: z.number().int().nonnegative().optional(),
});

export const UpdateLessonSchema = z.object({
  lessonId: z.string().cuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().max(20000).optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  duration: z.number().int().nonnegative().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const DeleteLessonSchema = z.object({
  lessonId: z.string().cuid(),
});

export const MarkLessonCompleteSchema = z.object({
  lessonId: z.string().cuid(),
  completed: z.boolean(),
});

export const CreateProductSchema = z.object({
  communityId: z.string().cuid(),
  slug: SlugSchema,
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  type: z.string().max(40).optional(),
  pillar: z.string().max(40).optional().or(z.literal("")),
  priceVnd: z.number().nonnegative().optional(),
  isFree: z.boolean().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  fileUrl: z.string().url().optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  licenseKeyTemplate: z.string().trim().max(80).optional().or(z.literal("")),
});

/* ========== Product settings ========== */
export const UpdateProductSettingsSchema = z.object({
  productId: z.string().cuid(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(5000).optional().nullable(),
  priceVnd: z.number().nonnegative().optional(),
  priceOldVnd: z.number().nonnegative().optional().nullable(),
  isVisible: z.boolean().optional(),
  bumpProductId: z.string().cuid().optional().nullable(),
  upsellProductId: z.string().cuid().optional().nullable(),
  showInCartBump: z.boolean().optional(),
  // Extended fields (parity with create flow)
  type: z.string().max(40).optional(),
  pillar: z.string().max(40).optional().nullable().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),
  fileUrl: z.string().url().optional().nullable().or(z.literal("")),
  externalUrl: z.string().url().optional().nullable().or(z.literal("")),
  licenseKeyTemplate: z.string().trim().max(80).optional().nullable().or(z.literal("")),
});

/* ========== Coupon ========== */
export const CouponCodeSchema = z
  .string()
  .trim()
  .min(3, "Mã coupon tối thiểu 3 ký tự")
  .max(32, "Mã coupon tối đa 32 ký tự")
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]+$/, "Mã chỉ chứa A-Z, 0-9"));

export const CouponRefTypeSchema = z.enum([
  "product",
  "challenge",
  "cart",
  "event",
]);

export const CouponDiscountTypeSchema = z.enum(["PERCENTAGE", "FIXED"]);

const baseCouponSchema = z.object({
  code: CouponCodeSchema,
  discountType: CouponDiscountTypeSchema,
  percentageBps: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  maxDiscountVnd: z.coerce.number().int().nonnegative().optional().nullable(),
  fixedAmountVnd: z.coerce.number().int().positive().optional().nullable(),
  minOrderVnd: z.coerce.number().int().nonnegative().optional().nullable(),
  validFrom: z.coerce.date().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  maxRedemptions: z.coerce.number().int().positive().optional().nullable(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  allowedRefTypes: z.array(CouponRefTypeSchema).min(1, "Chọn ít nhất 1 loại checkout"),
  isActive: z.coerce.boolean().default(true),
});

export const CreateCouponSchema = baseCouponSchema.refine(
  (v) => {
    if (v.discountType === "PERCENTAGE") return v.percentageBps != null;
    return v.fixedAmountVnd != null;
  },
  {
    message: "PERCENTAGE cần percentageBps; FIXED cần fixedAmountVnd",
    path: ["discountType"],
  },
).refine(
  (v) => !v.validFrom || !v.validUntil || v.validFrom <= v.validUntil,
  { message: "validFrom phải trước validUntil", path: ["validUntil"] },
);

export const UpdateCouponSchema = baseCouponSchema.partial().refine(
  (v) => !v.validFrom || !v.validUntil || v.validFrom <= v.validUntil,
  { message: "validFrom phải trước validUntil", path: ["validUntil"] },
);

export const ApplyCouponInputSchema = z.object({
  code: CouponCodeSchema,
  communityId: z.string().cuid(),
  refType: CouponRefTypeSchema,
  orderAmountVnd: z.coerce.number().int().positive(),
});

/* ========== Helper ========== */
/** Parse FormData against a schema; throws with readable error if invalid. */
export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData
): z.infer<T> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return schema.parse(obj);
}
