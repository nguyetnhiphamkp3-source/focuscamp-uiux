/**
 * Zod schemas for validating user input (server actions, API routes).
 * Every external input should be parsed through one of these.
 */
import { z } from "zod";

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
});

/* ========== Challenge ========== */
export const JoinChallengeSchema = z.object({
  challengeId: z.string().cuid(),
});

export const ChallengeCheckinSchema = z.object({
  challengeId: z.string().cuid(),
  content: z.string().trim().min(5).max(1000),
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
  pillar: z
    .enum(["offer", "traffic", "conversion", "delivery"])
    .optional()
    .or(z.literal("")),
  bountyAip: z.number().int().nonnegative().optional(),
});

export const ReactPostSchema = z.object({
  postId: z.string().cuid(),
  emoji: z.string().min(1).max(10).default("❤️"),
});

export const MarkCotSchema = z.object({
  postId: z.string().cuid(),
});

/* ========== Product purchase ========== */
export const BuyProductSchema = z.object({
  productId: z.string().cuid(),
});

/* ========== Auth ========== */
export const LoginRedirectSchema = z.object({
  redirectTo: z
    .string()
    .startsWith("/", "Chỉ accept relative paths")
    .max(500)
    .optional(),
});

/* ========== Community slug ========== */
export const SlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9, -");

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
