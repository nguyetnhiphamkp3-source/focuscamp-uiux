"use client";

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  updateAgentBrainsAction,
  updateAgentProfileAction,
  updateAgentSystemPromptAction,
} from "@/app/actions/agent";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import {
  AI_PROVIDER_TYPES,
  AI_PROVIDER_TYPE_KEYS,
  PROVIDER_MODELS,
  defaultModelForProvider,
  type AIProviderType,
} from "@/lib/constants/ai-providers";
import type { AIProviderClient } from "@/lib/services/ai-provider";
import {
  inputStyle,
  btnPrimary,
  btnSecondary,
  btnDanger,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

type LegacyProvider = "anthropic" | "openai" | "groq" | "xai" | "google";

type ProviderForm = {
  id: string | null;
  name: string;
  displayName: string;
  providerType: AIProviderType;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  testModelId: string;
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

function emptyProviderForm(type: AIProviderType = "anthropic"): ProviderForm {
  return {
    id: null,
    name: "",
    displayName: "",
    providerType: type,
    baseUrl: AI_PROVIDER_TYPES[type].defaultBaseUrl,
    apiKey: "",
    enabled: true,
    testModelId: defaultModelForProvider(type) ?? "",
  };
}

function formFromProvider(provider: AIProviderClient): ProviderForm {
  return {
    id: provider.id,
    name: provider.name,
    displayName: provider.displayName,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl ?? AI_PROVIDER_TYPES[provider.providerType].defaultBaseUrl,
    apiKey: "",
    enabled: provider.enabled,
    testModelId: defaultModelForProvider(provider.providerType) ?? "",
  };
}

function modelOptionsFor(providerType: AIProviderType) {
  if (providerType === "openaiCompatible") return [];
  return PROVIDER_MODELS[providerType];
}

function formatAgentSettingsError(msg: string | null): string | null {
  if (!msg) return null;
  const exact: Record<string, string> = {
    provider_save_failed: "Không lưu được nhà cung cấp.",
    provider_delete_failed: "Không xóa được nhà cung cấp.",
    validation_failed: "Không kiểm tra được nhà cung cấp.",
    unauthorized: "Bạn chưa đăng nhập.",
    invalid_json: "Dữ liệu gửi lên không hợp lệ.",
    invalid: "Dữ liệu chưa hợp lệ.",
    missing_community: "Thiếu thông tin cộng đồng.",
    rate_limited: "Bạn kiểm tra quá nhanh. Thử lại sau ít phút.",
    unknown: "Có lỗi không xác định.",
  };
  if (exact[msg]) return exact[msg];

  const lower = msg.toLowerCase();
  if (lower.includes("integration_secret_key")) {
    return "Server chưa cấu hình khóa mã hóa để lưu API key.";
  }
  if (lower.includes("missing api key") || lower.includes("api key is required")) {
    return "Thiếu khóa API.";
  }
  if (lower.includes("missing model id") || lower.includes("requires a model id")) {
    return "Thiếu Model ID.";
  }
  if (lower.includes("provider not found")) {
    return "Không tìm thấy nhà cung cấp này.";
  }
  if (lower.includes("disabled") || lower.includes("not configured")) {
    return "Nhà cung cấp chưa được cấu hình hoặc đang bị tắt.";
  }
  if (lower.includes("invalid or expired")) {
    return "Khóa API không hợp lệ hoặc đã hết hạn.";
  }
  if (lower.includes("billing") || lower.includes("credit")) {
    return "Tài khoản nhà cung cấp chưa có billing/credit khả dụng.";
  }
  if (lower.includes("rate limit")) {
    return "Nhà cung cấp đang giới hạn tốc độ. Thử lại sau.";
  }
  if (lower.includes("model") && lower.includes("not available")) {
    return msg.replace("is not available for this provider", "không khả dụng với nhà cung cấp này");
  }
  if (lower.includes("base url")) {
    return msg
      .replace("Base URL is required for OpenAI Compatible", "OpenAI Compatible cần Base URL")
      .replace("Base URL must use https", "Base URL phải dùng https")
      .replace(
        "Base URL must not include credentials, query, or fragment",
        "Base URL không được chứa credentials, query hoặc fragment",
      )
      .replace("Base URL host is not allowed", "Host của Base URL không được phép")
      .replace("Base URL is invalid", "Base URL không hợp lệ");
  }
  if (lower.includes("currently used")) {
    return "Nhà cung cấp này đang được Agent hoặc AI Review sử dụng.";
  }
  return msg;
}

export function AgentConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: {
    prompt: string;
    hasApiKey: boolean;
    provider: LegacyProvider;
    model: string | null;
    communityName: string;
    agentName: string | null;
    agentAvatarUrl: string | null;
    agentTagline: string | null;
    chatProviderId: string | null;
    reviewProviderId: string | null;
    reviewModel: string | null;
    providers: AIProviderClient[];
  };
}) {
  const router = useRouter();
  const [providers, setProviders] = useState(initial.providers);

  const [agentName, setAgentName] = useState(
    initial.agentName ?? `${initial.communityName} Agent`,
  );
  const [agentAvatarUrl, setAgentAvatarUrl] = useState<string | null>(
    initial.agentAvatarUrl,
  );
  const [agentTagline, setAgentTagline] = useState(initial.agentTagline ?? "");

  const [chatProviderId, setChatProviderId] = useState(initial.chatProviderId ?? "");
  const [chatModel, setChatModel] = useState(
    initial.model ?? defaultModelForProvider(initial.provider) ?? "",
  );
  const [reviewProviderId, setReviewProviderId] = useState(
    initial.reviewProviderId ?? "",
  );
  const [reviewModel, setReviewModel] = useState(
    initial.reviewModel ?? initial.model ?? "",
  );

  const [providerForm, setProviderForm] = useState<ProviderForm>(
    emptyProviderForm("anthropic"),
  );
  const [providerErr, setProviderErr] = useState<string | null>(null);
  const [providerSaved, setProviderSaved] = useState(false);
  const [providerPending, startProvider] = useTransition();
  const [testStatus, setTestStatus] = useState<
    "idle" | "checking" | "valid" | "error"
  >("idle");
  const [testErr, setTestErr] = useState<string | null>(null);

  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profilePending, startProfile] = useTransition();

  const [brainErr, setBrainErr] = useState<string | null>(null);
  const [brainSaved, setBrainSaved] = useState(false);
  const [brainPending, startBrain] = useTransition();

  const [prompt, setPrompt] = useState(initial.prompt);
  const [promptPending, startPrompt] = useTransition();
  const [promptErr, setPromptErr] = useState<string | null>(null);
  const [promptSaved, setPromptSaved] = useState(false);

  const enabledProviders = useMemo(
    () => providers.filter((provider) => provider.enabled),
    [providers],
  );

  const chatProvider = providers.find((provider) => provider.id === chatProviderId);
  const reviewProvider = providers.find((provider) => provider.id === reviewProviderId);

  function updateProviderForm(fields: Partial<ProviderForm>) {
    setProviderForm((current) => {
      const next = { ...current, ...fields };
      if (fields.providerType) {
        next.baseUrl = AI_PROVIDER_TYPES[fields.providerType].defaultBaseUrl;
        next.testModelId = defaultModelForProvider(fields.providerType) ?? "";
      }
      return next;
    });
    setProviderSaved(false);
    setProviderErr(null);
    setTestStatus("idle");
    setTestErr(null);
  }

  async function refreshProviders() {
    const res = await fetch(`/api/ai-providers?communityId=${communityId}`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.providers)) {
      setProviders(data.providers);
    }
  }

  function saveProvider() {
    setProviderErr(null);
    setProviderSaved(false);
    startProvider(async () => {
      const body = {
        communityId,
        name: providerForm.name,
        displayName: providerForm.displayName,
        providerType: providerForm.providerType,
        baseUrl: providerForm.baseUrl || null,
        enabled: providerForm.enabled,
        ...(providerForm.apiKey.trim()
          ? { apiKey: providerForm.apiKey.trim() }
          : {}),
      };
      const res = await fetch(
        providerForm.id
          ? `/api/ai-providers/${providerForm.id}`
          : "/api/ai-providers",
        {
          method: providerForm.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!data.ok) {
        setProviderErr(data.error || "provider_save_failed");
        return;
      }
      await refreshProviders();
      setProviderForm(emptyProviderForm(providerForm.providerType));
      setProviderSaved(true);
      router.refresh();
    });
  }

  function deleteProvider(provider: AIProviderClient) {
    if (!window.confirm(`Xóa nhà cung cấp "${provider.displayName}"?`)) return;
    setProviderErr(null);
    setProviderSaved(false);
    startProvider(async () => {
      const res = await fetch(
        `/api/ai-providers/${provider.id}?communityId=${communityId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!data.ok) {
        setProviderErr(data.error || "provider_delete_failed");
        return;
      }
      await refreshProviders();
      if (chatProviderId === provider.id) setChatProviderId("");
      if (reviewProviderId === provider.id) setReviewProviderId("");
      setProviderSaved(true);
      router.refresh();
    });
  }

  async function testProvider() {
    setTestStatus("checking");
    setTestErr(null);
    const directTest = !providerForm.id || !!providerForm.apiKey.trim();
    const res = await fetch("/api/ai-providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        directTest && providerForm.apiKey.trim()
          ? {
              communityId,
              providerType: providerForm.providerType,
              baseUrl: providerForm.baseUrl || null,
              apiKey: providerForm.apiKey.trim(),
              modelId: providerForm.testModelId,
            }
          : {
              communityId,
              providerId: providerForm.id,
              modelId: providerForm.testModelId,
            },
      ),
    });
    const data = await res.json();
    if (data.ok) {
      setTestStatus("valid");
      return;
    }
    setTestStatus("error");
    setTestErr(data.error || "validation_failed");
  }

  function submitProfile() {
    setProfileErr(null);
    setProfileSaved(false);
    startProfile(async () => {
      const res = await updateAgentProfileAction({
        communityId,
        communitySlug,
        name: agentName,
        avatarUrl: agentAvatarUrl,
        tagline: agentTagline,
      });
      if (!res.ok) {
        setProfileErr(res.reason);
        return;
      }
      setProfileSaved(true);
      router.refresh();
    });
  }

  function submitBrains() {
    setBrainErr(null);
    setBrainSaved(false);
    startBrain(async () => {
      const res = await updateAgentBrainsAction({
        communityId,
        communitySlug,
        chatProviderId: chatProviderId || null,
        chatModel,
        reviewProviderId: reviewProviderId || null,
        reviewModel,
      });
      if (!res.ok) {
        setBrainErr(res.reason);
        return;
      }
      setBrainSaved(true);
      router.refresh();
    });
  }

  function submitPrompt() {
    setPromptErr(null);
    setPromptSaved(false);
    startPrompt(async () => {
      const res = await updateAgentSystemPromptAction({
        communityId,
        communitySlug,
        prompt,
      });
      if (!res.ok) {
        setPromptErr(res.reason);
        return;
      }
      setPromptSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="AI Agent cộng đồng"
        subtitle="Cấu hình danh tính hiển thị, khóa API nhà cung cấp, và bộ não dùng cho chat/duyệt bài."
      />

      <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 14, marginBottom: 18 }}>
        <ImageUploadField
          value={agentAvatarUrl}
          onChange={setAgentAvatarUrl}
          context="avatar"
          shape="circle"
          disabled={profilePending}
          placeholder="Agent"
          maxSizeNote="Tối đa 2MB"
        />
        <div style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>
            Tên Agent
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              maxLength={80}
              disabled={profilePending}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Mô tả ngắn
            <input
              value={agentTagline}
              onChange={(e) => setAgentTagline(e.target.value)}
              maxLength={160}
              disabled={profilePending}
              placeholder="Hỗ trợ chat và duyệt bài nộp cho cộng đồng này"
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex" }}>
            <button
              type="button"
              onClick={submitProfile}
              disabled={profilePending || !agentName.trim()}
              style={{
                ...btnPrimary,
                marginLeft: "auto",
                opacity: profilePending || !agentName.trim() ? 0.6 : 1,
              }}
            >
              {profilePending ? "Đang lưu..." : "Lưu danh tính"}
            </button>
          </div>
          <ErrorBox msg={formatAgentSettingsError(profileErr)} />
          <SuccessBox shown={profileSaved} />
        </div>
      </div>

      <Divider />

      <SectionHeader
        title="Nhà cung cấp AI"
        subtitle="Lưu khóa API một lần. OpenAI Compatible hỗ trợ Base URL riêng và Model ID nhập tay."
      />

      {providers.length === 0 ? (
        <div style={emptyStateStyle}>
          Chưa có nhà cung cấp nào.
          {initial.hasApiKey ? " Khóa Agent cũ vẫn còn và đang hoạt động như dự phòng." : ""}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {providers.map((provider) => (
            <div key={provider.id} style={providerRowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>
                  {provider.displayName}
                  {!provider.enabled && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> đã tắt</span>
                  )}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  {provider.providerLabel}
                  {provider.baseUrl ? ` · ${provider.baseUrl}` : ""}
                  {provider.maskedKey ? ` · ${provider.maskedKey}` : ""}
                  {provider.createdByName ? ` · 👤 ${provider.createdByName}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => setProviderForm(formFromProvider(provider))} style={btnSecondary}>
                Sửa
              </button>
              <button type="button" onClick={() => deleteProvider(provider)} style={btnDanger}>
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={formCardStyle}>
        <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>
          {providerForm.id ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={labelStyle}>
            Tên hiển thị
            <input
              value={providerForm.displayName}
              onChange={(e) => updateProviderForm({ displayName: e.target.value })}
              placeholder="Main Anthropic"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Tên nội bộ
            <input
              value={providerForm.name}
              onChange={(e) => updateProviderForm({ name: e.target.value })}
              placeholder="main-anthropic"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Loại nhà cung cấp
            <select
              value={providerForm.providerType}
              onChange={(e) =>
                updateProviderForm({ providerType: e.target.value as AIProviderType })
              }
              style={selectStyle}
            >
              {AI_PROVIDER_TYPE_KEYS.map((type) => (
                <option key={type} value={type}>
                  {AI_PROVIDER_TYPES[type].label}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Khóa API
            <input
              type="password"
              value={providerForm.apiKey}
              onChange={(e) => updateProviderForm({ apiKey: e.target.value })}
              placeholder={providerForm.id ? "Để trống để giữ khóa hiện tại" : "sk-..."}
              style={inputStyle}
            />
          </label>
          {providerForm.providerType === "openaiCompatible" && (
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Base URL
              <input
                value={providerForm.baseUrl}
                onChange={(e) => updateProviderForm({ baseUrl: e.target.value })}
                placeholder="https://llm.chiasegpu.vn/v1"
                style={inputStyle}
              />
            </label>
          )}
          <label style={labelStyle}>
            Model ID để kiểm tra
            <ModelInput
              providerType={providerForm.providerType}
              value={providerForm.testModelId}
              onChange={(value) => updateProviderForm({ testModelId: value })}
            />
          </label>
          <label style={{ ...labelStyle, justifyContent: "end" }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 22 }}>
              <input
                type="checkbox"
                checked={providerForm.enabled}
                onChange={(e) => updateProviderForm({ enabled: e.target.checked })}
              />
              Bật
            </span>
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {providerForm.id && (
            <button type="button" onClick={() => setProviderForm(emptyProviderForm())} style={btnSecondary}>
              Nhà cung cấp mới
            </button>
          )}
          <button
            type="button"
            onClick={testProvider}
            disabled={testStatus === "checking" || !providerForm.testModelId.trim()}
            style={btnSecondary}
          >
            {testStatus === "checking" ? "Đang kiểm tra..." : testStatus === "valid" ? "Hợp lệ" : "Kiểm tra"}
          </button>
          <button
            type="button"
            onClick={saveProvider}
            disabled={
              providerPending ||
              !providerForm.displayName.trim() ||
              (!providerForm.id && !providerForm.apiKey.trim())
            }
            style={{
              ...btnPrimary,
              opacity:
                providerPending ||
                !providerForm.displayName.trim() ||
                (!providerForm.id && !providerForm.apiKey.trim())
                  ? 0.6
                  : 1,
            }}
          >
            {providerPending ? "Đang lưu..." : "Lưu nhà cung cấp"}
          </button>
        </div>
        <ErrorBox msg={formatAgentSettingsError(testStatus === "error" ? testErr : null)} />
        <ErrorBox msg={formatAgentSettingsError(providerErr)} />
        <SuccessBox shown={providerSaved} />
      </div>

      <Divider />

      <SectionHeader
        title="Bộ não của Agent"
        subtitle="Chat và duyệt bài nộp có thể dùng nhà cung cấp/model khác nhau."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <BrainPicker
          title="Bộ não chat"
          providers={enabledProviders}
          selectedProviderId={chatProviderId}
          model={chatModel}
          fallbackText={
            initial.hasApiKey
              ? `Dự phòng cũ: ${AI_PROVIDER_TYPES[initial.provider].label} / ${initial.model ?? "mặc định"}`
              : "Chưa chọn nhà cung cấp"
          }
          onProviderChange={(id) => {
            setChatProviderId(id);
            const provider = providers.find((item) => item.id === id);
            if (provider) setChatModel(defaultModelForProvider(provider.providerType) ?? "");
          }}
          onModelChange={setChatModel}
          provider={chatProvider}
        />
        <BrainPicker
          title="Bộ não duyệt bài mặc định"
          providers={enabledProviders}
          selectedProviderId={reviewProviderId}
          model={reviewModel}
          fallbackText={
            chatProvider
              ? `Để trống sẽ dùng bộ não chat: ${chatProvider.displayName}`
              : "Để trống sẽ dùng dự phòng cũ/bộ não chat"
          }
          onProviderChange={(id) => {
            setReviewProviderId(id);
            const provider = providers.find((item) => item.id === id);
            if (provider) setReviewModel(defaultModelForProvider(provider.providerType) ?? "");
          }}
          onModelChange={setReviewModel}
          provider={reviewProvider}
        />
      </div>
      <div style={{ display: "flex", marginTop: 12 }}>
        <button
          type="button"
          onClick={submitBrains}
          disabled={brainPending}
          style={{ ...btnPrimary, marginLeft: "auto", opacity: brainPending ? 0.6 : 1 }}
        >
          {brainPending ? "Đang lưu..." : "Lưu bộ não"}
        </button>
      </div>
      <ErrorBox msg={formatAgentSettingsError(brainErr)} />
      <SuccessBox shown={brainSaved} />

      <Divider />

      <SectionHeader
        title="Chỉ dẫn"
        subtitle="Để trống nếu muốn dùng prompt mặc định của Agent."
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        maxLength={4000}
        disabled={promptPending}
        placeholder="Bạn là AI Agent của cộng đồng..."
        style={{
          ...inputStyle,
          resize: "vertical",
          fontFamily: "inherit",
          minHeight: 160,
        }}
      />
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 6 }}>
        {prompt.length}/4000
      </div>
      <div style={{ display: "flex", marginTop: 12 }}>
        <button
          type="button"
          onClick={submitPrompt}
          disabled={promptPending}
          style={{ ...btnPrimary, marginLeft: "auto", opacity: promptPending ? 0.6 : 1 }}
        >
          {promptPending ? "Đang lưu..." : "Lưu prompt"}
        </button>
      </div>
      <ErrorBox msg={formatAgentSettingsError(promptErr)} />
      <SuccessBox shown={promptSaved} />
    </section>
  );
}

function BrainPicker({
  title,
  providers,
  selectedProviderId,
  provider,
  model,
  fallbackText,
  onProviderChange,
  onModelChange,
}: {
  title: string;
  providers: AIProviderClient[];
  selectedProviderId: string;
  provider: AIProviderClient | undefined;
  model: string;
  fallbackText: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (model: string) => void;
}) {
  return (
    <div style={formCardStyle}>
      <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>{title}</div>
      <label style={labelStyle}>
        Nhà cung cấp
        <select
          value={selectedProviderId}
          onChange={(e) => onProviderChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">{fallbackText}</option>
          {providers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.displayName} ({item.providerLabel})
            </option>
          ))}
        </select>
      </label>
      {provider && (
        <label style={labelStyle}>
          Model ID
          <ModelInput
            providerType={provider.providerType}
            value={model}
            onChange={onModelChange}
          />
        </label>
      )}
    </div>
  );
}

function ModelInput({
  providerType,
  value,
  onChange,
}: {
  providerType: AIProviderType;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = modelOptionsFor(providerType);
  if (providerType === "openaiCompatible") {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="krr/claude-haiku-4-5-20251001"
        style={inputStyle}
      />
    );
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      {options.map((model) => (
        <option key={model.value} value={model.value}>
          {model.label}
        </option>
      ))}
    </select>
  );
}

function Divider() {
  return (
    <div
      style={{
        borderTop: "1px solid var(--background-modifier-accent)",
        margin: "var(--space-5) 0",
      }}
    />
  );
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--header-primary)",
};

const emptyStateStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px dashed var(--border-subtle)",
  color: "var(--text-muted)",
  fontSize: "var(--text-sm)",
  marginBottom: 12,
};

const providerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-card)",
};

const formCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-card)",
};
