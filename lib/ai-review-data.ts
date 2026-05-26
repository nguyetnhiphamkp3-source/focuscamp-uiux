export type AIReviewDecision = "APPROVE" | "REJECT" | "FLAG";

export type AIReviewData = {
  decision: AIReviewDecision | string;
  confidence: number;
  reasoning: string;
  model: string;
  reviewedAt: string;
  providerType?: string;
  providerId?: string | null;
  reviewerName?: string | null;
  reviewerAvatarUrl?: string | null;
  visionFailed?: boolean;
};
