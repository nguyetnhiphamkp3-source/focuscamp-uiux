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
};

export function buildModel(
  provider: string,
  apiKey: string,
  modelId: string,
): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "groq":
      return createGroq({ apiKey })(modelId);
    case "xai":
      return createXai({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "anthropic":
    default:
      return createAnthropic({ apiKey })(modelId);
  }
}
