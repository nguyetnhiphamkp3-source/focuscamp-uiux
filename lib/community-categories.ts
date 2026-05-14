export const COMMUNITY_CATEGORIES = [
  "Business & Founder",
  "Marketing & Traffic",
  "Ecommerce",
  "Developer",
  "Content Creator",
  "Investing",
  "AI & Tech",
  "Fitness & Health",
] as const;

export const DISCOVERY_CATEGORY_ALL = "Tất cả";

export const DISCOVERY_CATEGORIES = [
  DISCOVERY_CATEGORY_ALL,
  ...COMMUNITY_CATEGORIES,
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export function isCommunityCategory(
  value: string | null | undefined
): value is CommunityCategory {
  return COMMUNITY_CATEGORIES.includes(value as CommunityCategory);
}
