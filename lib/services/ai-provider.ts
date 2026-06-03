import { generateText } from "ai";
import { isIP } from "net";
import { Prisma, type AIProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AI_PROVIDER_TYPES,
  defaultModelForProvider,
  isAIProviderType,
  type AIProviderType,
} from "@/lib/constants/ai-providers";
import { buildModel } from "@/lib/ai-model";
import { encryptSecret, decryptSecret } from "@/lib/integrations/encryption";
import { assertCommunityPermission } from "@/lib/services/community-settings";

export type AIProviderClient = {
  id: string;
  name: string;
  displayName: string;
  providerType: AIProviderType;
  providerLabel: string;
  baseUrl: string | null;
  enabled: boolean;
  hasApiKey: boolean;
  maskedKey: string | null;
  modelInputMode: "select" | "manual";
  /** Display name of the user who created this provider (null for legacy rows). */
  createdByName: string | null;
};

export type ResolvedAIModelConfig = {
  providerId: string | null;
  providerType: AIProviderType;
  apiKey: string;
  modelId: string;
  baseUrl: string | null;
  providerDisplayName: string | null;
};

export function normalizeProviderName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function providerTypeLabel(providerType: string): string {
  return isAIProviderType(providerType)
    ? AI_PROVIDER_TYPES[providerType].label
    : providerType;
}

export function toAIProviderClient(provider: AIProvider): AIProviderClient {
  const providerType = normalizeProviderType(provider.providerType);
  const apiKey = decryptProviderKey(provider.encryptedApiKey);
  return {
    id: provider.id,
    name: provider.name,
    displayName: provider.displayName,
    providerType,
    providerLabel: AI_PROVIDER_TYPES[providerType].label,
    baseUrl: provider.baseUrl,
    enabled: provider.enabled,
    hasApiKey: !!apiKey,
    maskedKey: maskApiKey(apiKey),
    modelInputMode: AI_PROVIDER_TYPES[providerType].modelInputMode,
    createdByName: readCreatedByName(provider.settings),
  };
}

/** Read the snapshotted creator name stored in `settings.createdBy` (if any). */
function readCreatedByName(settings: Prisma.JsonValue | null): string | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const createdBy = (settings as Record<string, unknown>).createdBy;
  if (!createdBy || typeof createdBy !== "object" || Array.isArray(createdBy)) return null;
  const name = (createdBy as Record<string, unknown>).name;
  return typeof name === "string" && name ? name : null;
}

export async function listAIProviders(
  userId: string,
  communityId: string,
  options?: { enabledOnly?: boolean },
): Promise<AIProviderClient[]> {
  await assertCommunityPermission(userId, communityId, "manage_ai_agent");
  const providers = await prisma.aIProvider.findMany({
    where: {
      communityId,
      ...(options?.enabledOnly ? { enabled: true } : {}),
    },
    orderBy: [{ enabled: "desc" }, { createdAt: "asc" }],
  });
  return providers.map(toAIProviderClient);
}

export async function getAIProviderForUse(
  communityId: string,
  providerId: string | null | undefined,
): Promise<ResolvedAIModelConfig | null> {
  if (!providerId) return null;
  const provider = await prisma.aIProvider.findFirst({
    where: { id: providerId, communityId },
  });
  if (!provider || !provider.enabled) return null;

  const providerType = normalizeProviderType(provider.providerType);
  const apiKey = decryptProviderKey(provider.encryptedApiKey);
  if (!apiKey) return null;

  return {
    providerId: provider.id,
    providerType,
    apiKey,
    modelId: defaultModelForProvider(providerType) ?? "",
    baseUrl: provider.baseUrl,
    providerDisplayName: provider.displayName,
  };
}

export async function createAIProvider(input: {
  userId: string;
  communityId: string;
  name: string;
  displayName: string;
  providerType: string;
  baseUrl?: string | null;
  apiKey?: string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
}): Promise<AIProviderClient> {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  const data = normalizeProviderInput(input);
  const actor = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });
  const settings = {
    ...(input.settings ?? {}),
    createdBy: { id: input.userId, name: actor?.name ?? "" },
  };
  const provider = await prisma.aIProvider.create({
    data: {
      communityId: input.communityId,
      name: data.name,
      displayName: data.displayName,
      providerType: data.providerType,
      baseUrl: data.baseUrl,
      encryptedApiKey: data.apiKey ? encryptProviderKey(data.apiKey) : null,
      enabled: input.enabled ?? true,
      settings: settings as Prisma.InputJsonValue,
    },
  });
  return toAIProviderClient(provider);
}

export async function updateAIProvider(input: {
  userId: string;
  communityId: string;
  providerId: string;
  data: {
    name?: string;
    displayName?: string;
    providerType?: string;
    baseUrl?: string | null;
    apiKey?: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
  };
}): Promise<AIProviderClient> {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  await assertProviderBelongsToCommunity(input.providerId, input.communityId);

  const updateData: Parameters<typeof prisma.aIProvider.update>[0]["data"] = {};
  if (input.data.name !== undefined) {
    const name = normalizeProviderName(input.data.name);
    if (!name) throw new Error("Provider name is required");
    updateData.name = name;
  }
  if (input.data.displayName !== undefined) {
    const displayName = input.data.displayName.trim().slice(0, 80);
    if (!displayName) throw new Error("Display name is required");
    updateData.displayName = displayName;
  }
  if (input.data.providerType !== undefined) {
    const providerType = normalizeProviderType(input.data.providerType);
    updateData.providerType = providerType;
    updateData.baseUrl = normalizeBaseUrl(providerType, input.data.baseUrl);
  } else if (input.data.baseUrl !== undefined) {
    const existing = await prisma.aIProvider.findUnique({
      where: { id: input.providerId },
      select: { providerType: true },
    });
    updateData.baseUrl = normalizeBaseUrl(
      normalizeProviderType(existing?.providerType ?? "anthropic"),
      input.data.baseUrl,
    );
  }
  if (input.data.apiKey !== undefined) {
    const apiKey = input.data.apiKey.trim();
    updateData.encryptedApiKey = apiKey ? encryptProviderKey(apiKey) : null;
  }
  if (input.data.enabled !== undefined) updateData.enabled = input.data.enabled;
  if (input.data.settings !== undefined) {
    updateData.settings = input.data.settings as Prisma.InputJsonValue;
  }

  const provider = await prisma.aIProvider.update({
    where: { id: input.providerId },
    data: updateData,
  });
  return toAIProviderClient(provider);
}

export async function deleteAIProvider(input: {
  userId: string;
  communityId: string;
  providerId: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  await assertProviderBelongsToCommunity(input.providerId, input.communityId);
  await assertProviderNotInUse(input.communityId, input.providerId);
  await prisma.aIProvider.delete({ where: { id: input.providerId } });
}

export async function validateAIProvider(input: {
  providerType: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  modelId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const providerType = normalizeProviderType(input.providerType);
  const apiKey = input.apiKey?.trim();
  if (!apiKey) return { ok: false, error: "Missing API key" };
  const modelId = input.modelId.trim();
  if (!modelId) return { ok: false, error: "Missing model ID" };
  const baseUrl = normalizeBaseUrl(providerType, input.baseUrl);

  try {
    const model = buildModel({ providerType, apiKey, modelId, baseUrl });
    await generateText({ model, prompt: "Hi", maxOutputTokens: 1 });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return { ok: false, error: mapProviderError(message, modelId) };
  }
}

export async function validateStoredAIProvider(input: {
  userId: string;
  communityId: string;
  providerId: string;
  modelId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  const config = await resolveAIProviderConfig({
    communityId: input.communityId,
    providerId: input.providerId,
    modelId: input.modelId,
  });
  if (!config) return { ok: false, error: "Provider is not configured or is disabled." };
  return validateAIProvider({
    providerType: config.providerType,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    modelId: config.modelId,
  });
}

export async function setCommunityAgentBrains(input: {
  userId: string;
  communityId: string;
  chatProviderId?: string | null;
  chatModel?: string | null;
  reviewProviderId?: string | null;
  reviewModel?: string | null;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  await assertOptionalProvider(input.communityId, input.chatProviderId);
  await assertOptionalProvider(input.communityId, input.reviewProviderId);
  await assertModelForProvider(input.communityId, input.chatProviderId, input.chatModel);
  await assertModelForProvider(input.communityId, input.reviewProviderId, input.reviewModel);
  await prisma.community.update({
    where: { id: input.communityId },
    data: {
      ...(input.chatProviderId !== undefined
        ? { agentProviderId: input.chatProviderId || null }
        : {}),
      ...(input.chatModel !== undefined
        ? { agentModel: input.chatModel?.trim() || null }
        : {}),
      ...(input.reviewProviderId !== undefined
        ? { agentReviewProviderId: input.reviewProviderId || null }
        : {}),
      ...(input.reviewModel !== undefined
        ? { agentReviewModel: input.reviewModel?.trim() || null }
        : {}),
    },
  });
}

export async function resolveAIProviderConfig(input: {
  communityId: string;
  providerId: string | null | undefined;
  modelId: string | null | undefined;
}): Promise<ResolvedAIModelConfig | null> {
  const resolved = await getAIProviderForUse(input.communityId, input.providerId);
  if (!resolved) return null;
  const modelId =
    input.modelId?.trim() ||
    defaultModelForProvider(resolved.providerType) ||
    "";
  if (!modelId) return null;
  return {
    ...resolved,
    modelId,
  };
}

export function normalizeProviderType(providerType: string): AIProviderType {
  if (!isAIProviderType(providerType)) {
    throw new Error(`Unsupported provider type: ${providerType}`);
  }
  return providerType;
}

function normalizeProviderInput(input: {
  name: string;
  displayName: string;
  providerType: string;
  baseUrl?: string | null;
  apiKey?: string;
}) {
  const providerType = normalizeProviderType(input.providerType);
  const name = normalizeProviderName(input.name || input.displayName || providerType);
  if (!name) throw new Error("Provider name is required");
  const displayName = input.displayName.trim().slice(0, 80);
  if (!displayName) throw new Error("Display name is required");
  const apiKey = input.apiKey?.trim() ?? "";
  if (!apiKey) throw new Error("API key is required");
  return {
    name,
    displayName,
    providerType,
    baseUrl: normalizeBaseUrl(providerType, input.baseUrl),
    apiKey,
  };
}

function normalizeBaseUrl(
  providerType: AIProviderType,
  baseUrl: string | null | undefined,
): string | null {
  if (providerType !== "openaiCompatible") return null;
  const trimmed = baseUrl?.trim() ?? "";
  if (!trimmed) throw new Error("Base URL is required for OpenAI Compatible");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      throw new Error("Base URL must use https");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("Base URL must not include credentials, query, or fragment");
    }
    if (isBlockedBaseUrlHost(url.hostname)) {
      throw new Error("Base URL host is not allowed");
    }
    return url.toString().replace(/\/$/, "");
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Base URL")) {
      throw err;
    }
    throw new Error("Base URL is invalid");
  }
}

function isBlockedBaseUrlHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".lan") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const [a, b] = host.split(".").map((part) => Number(part));
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (ipVersion === 6) {
    return (
      host === "::1" ||
      host === "::" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80:")
    );
  }
  return false;
}

function encryptProviderKey(apiKey: string): string {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.INTEGRATION_SECRET_KEY ||
      process.env.INTEGRATION_SECRET_KEY.length !== 64)
  ) {
    throw new Error("INTEGRATION_SECRET_KEY is required before saving AI provider keys");
  }
  return encryptSecret(apiKey);
}

function decryptProviderKey(stored: string | null): string | null {
  return stored ? decryptSecret(stored) : null;
}

function maskApiKey(apiKey: string | null): string | null {
  if (!apiKey) return null;
  if (apiKey.length <= 10) return "********";
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

async function assertProviderBelongsToCommunity(
  providerId: string,
  communityId: string,
) {
  const provider = await prisma.aIProvider.findFirst({
    where: { id: providerId, communityId },
    select: { id: true },
  });
  if (!provider) throw new Error("Provider not found");
}

async function assertOptionalProvider(
  communityId: string,
  providerId: string | null | undefined,
) {
  if (!providerId) return;
  await assertProviderBelongsToCommunity(providerId, communityId);
}

async function assertModelForProvider(
  communityId: string,
  providerId: string | null | undefined,
  modelId: string | null | undefined,
) {
  if (!providerId) return;
  const provider = await prisma.aIProvider.findFirst({
    where: { id: providerId, communityId },
    select: { providerType: true },
  });
  if (!provider) throw new Error("Provider not found");
  const providerType = normalizeProviderType(provider.providerType);
  if (providerType === "openaiCompatible" && !modelId?.trim()) {
    throw new Error("OpenAI Compatible requires a model ID");
  }
}

async function assertProviderNotInUse(communityId: string, providerId: string) {
  const [community, challengeCount] = await Promise.all([
    prisma.community.findUnique({
      where: { id: communityId },
      select: { agentProviderId: true, agentReviewProviderId: true },
    }),
    prisma.challenge.count({
      where: { communityId, aiReviewProviderId: providerId },
    }),
  ]);
  if (
    community?.agentProviderId === providerId ||
    community?.agentReviewProviderId === providerId ||
    challengeCount > 0
  ) {
    throw new Error("Provider is currently used by Agent or AI Review settings");
  }
}

function mapProviderError(message: string, modelId: string) {
  if (/401|unauthorized|authentication|invalid.*key/i.test(message)) {
    return "API key is invalid or expired.";
  }
  if (/billing|quota|insufficient|credit|payment/i.test(message)) {
    return "Provider account has no billing/credit available.";
  }
  if (/model.*not found|does not exist|not available|invalid model/i.test(message)) {
    return `Model "${modelId}" is not available for this provider.`;
  }
  if (/rate|429|too many/i.test(message)) {
    return "Provider rate limit. Try again later.";
  }
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}
