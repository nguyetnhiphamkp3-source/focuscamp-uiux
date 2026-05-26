import { type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  xai: "grok-3-mini",
  google: "gemini-2.5-flash",
  openaiCompatible: "gpt-4o-mini",
};

export function buildModel(
  input:
    | { providerType: string; apiKey: string; modelId: string; baseUrl?: string | null }
    | string,
  legacyApiKey?: string,
  legacyModelId?: string,
): LanguageModel {
  const provider =
    typeof input === "string"
      ? input
      : input.providerType;
  const apiKey =
    typeof input === "string"
      ? legacyApiKey ?? ""
      : input.apiKey;
  const modelId =
    typeof input === "string"
      ? legacyModelId ?? ""
      : input.modelId;
  const baseUrl = typeof input === "string" ? null : input.baseUrl;

  if (!apiKey.trim()) {
    throw new Error("AI provider API key is required");
  }
  if (!modelId.trim()) {
    throw new Error("AI provider model ID is required");
  }

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "openaiCompatible":
      if (!baseUrl) {
        throw new Error("OpenAI Compatible provider requires a base URL");
      }
      return createOpenAI({ apiKey, baseURL: baseUrl })(modelId);
    case "groq":
      return createGroq({ apiKey })(modelId);
    case "xai":
      return createXai({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
