export const AI_PROVIDER_TYPES = {
  anthropic: {
    label: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    requiresApiKey: true,
    modelInputMode: "select",
  },
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    modelInputMode: "select",
  },
  google: {
    label: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    requiresApiKey: true,
    modelInputMode: "select",
  },
  groq: {
    label: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    modelInputMode: "select",
  },
  xai: {
    label: "xAI",
    defaultBaseUrl: "https://api.x.ai/v1",
    requiresApiKey: true,
    modelInputMode: "select",
  },
  openaiCompatible: {
    label: "OpenAI Compatible",
    defaultBaseUrl: "",
    requiresApiKey: true,
    modelInputMode: "manual",
  },
} as const;

export type AIProviderType = keyof typeof AI_PROVIDER_TYPES;

export const AI_PROVIDER_TYPE_KEYS = Object.keys(
  AI_PROVIDER_TYPES,
) as AIProviderType[];

export function isAIProviderType(value: string): value is AIProviderType {
  return value in AI_PROVIDER_TYPES;
}

export const PROVIDER_MODELS: Record<
  Exclude<AIProviderType, "openaiCompatible">,
  { value: string; label: string }[]
> = {
  anthropic: [
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4-5", label: "Claude Opus 4.5" },
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  google: [
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  groq: [
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
    { value: "qwen/qwen3-32b", label: "Qwen3 32B" },
  ],
  xai: [
    { value: "grok-3-mini", label: "Grok 3 Mini" },
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-4", label: "Grok 4" },
  ],
};

export function defaultModelForProvider(providerType: string): string | null {
  if (providerType === "openaiCompatible") return null;
  if (!isAIProviderType(providerType)) return null;
  const models =
    PROVIDER_MODELS[providerType as Exclude<AIProviderType, "openaiCompatible">];
  return models?.[0]?.value ?? null;
}
