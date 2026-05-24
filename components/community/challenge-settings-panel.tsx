"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  resolveChallengeVideoThumbnailAction,
  updateChallengeSettingsAction,
} from "@/app/actions/challenge-review";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { ChallengePricingEditor } from "@/components/community/challenge-pricing-editor";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import type { PricingConfig } from "@/lib/services/pricing";
import { parseChallengeVideoUrl, type ChallengeBannerMediaType } from "@/lib/challenge-video";

type UnlockMode = "ALL" | "DAILY" | "SEQUENTIAL" | "MANUAL";

/**
 * Whether switching from `from` to `to` is a "restrictive" change —
 * i.e. tasks that are currently visible to members may become locked again.
 */
function isRestrictiveModeChange(from: string, to: string): boolean {
  // MANUAL is the most restrictive — switching TO it from anything else is restrictive
  if (to === "MANUAL" && from !== "MANUAL") return true;
  // SEQUENTIAL is more restrictive than DAILY or ALL
  if (to === "SEQUENTIAL" && (from === "DAILY" || from === "ALL")) return true;
  // DAILY is more restrictive than ALL
  if (to === "DAILY" && from === "ALL") return true;
  return false;
}

const MODE_LABELS: Record<string, string> = {
  ALL: "Mở tất cả",
  DAILY: "Theo thời gian",
  SEQUENTIAL: "Tuần tự",
  MANUAL: "Thủ công",
};

type FreezeWindow = { label: string; startsAt: string; endsAt: string };
type BenefitItem = { icon: string; text: string };
const BENEFIT_MAX_ITEMS = 6;
const BENEFIT_TEXT_MAX = 150;
const BENEFIT_ICON_MAX = 8;

export function ChallengeSettingsPanel({
  challengeId,
  communitySlug,
  challengeSlug,
  initial,
  communityProducts = [],
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  initial: {
    title: string;
    description: string | null;
    pitch?: string | null;
    benefits?: Array<{ icon?: string; text: string }> | null;
    difficulty: string;
    autoStartAfterHours: number | null;
    freezeWindows?: Array<{ label?: string; startsAt: string; endsAt: string }> | null;
    bannerUrl: string | null;
    bannerMediaType?: string | null;
    bannerVideoUrl?: string | null;
    featuredOnGlobal: boolean;
    pricingConfig: PricingConfig | null;
    tiers: { key: string; label: string }[];
    taskUnlockMode: string;
    unlockIntervalHours: number;
    bumpProductId?: string | null;
  };
  communityProducts?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("open-challenge-settings", handleOpen);
    return () => window.removeEventListener("open-challenge-settings", handleOpen);
  }, []);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [pitch, setPitch] = useState(initial.pitch ?? "");
  const [benefits, setBenefits] = useState<BenefitItem[]>(
    initial.benefits
      ? initial.benefits.map((b) => ({ icon: b.icon ?? "", text: b.text }))
      : []
  );
  const [difficulty, setDifficulty] = useState<"NORMAL" | "HARD" | "CHAOS">(
    (initial.difficulty as "NORMAL" | "HARD" | "CHAOS") || "NORMAL"
  );
  const [autoStartMode, setAutoStartMode] = useState<"manual" | "auto">(
    initial.autoStartAfterHours == null ? "manual" : "auto"
  );
  const [autoStartHours, setAutoStartHours] = useState<string>(
    String(initial.autoStartAfterHours ?? 24)
  );
  const [taskUnlockMode, setTaskUnlockMode] = useState(initial.taskUnlockMode);
  const [unlockIntervalHours, setUnlockIntervalHours] = useState(String(initial.unlockIntervalHours));
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial.bannerUrl);
  const [bannerMediaType, setBannerMediaType] = useState<ChallengeBannerMediaType>(
    initial.bannerMediaType === "VIDEO" ? "VIDEO" : "IMAGE"
  );
  const [bannerVideoUrl, setBannerVideoUrl] = useState(initial.bannerVideoUrl ?? "");
  const [thumbnailPending, setThumbnailPending] = useState(false);
  const [featuredOnGlobal, setFeaturedOnGlobal] = useState(initial.featuredOnGlobal);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(initial.pricingConfig);
  const [freezeWindows, setFreezeWindows] = useState<FreezeWindow[]>(
    initial.freezeWindows
      ? initial.freezeWindows.map((w) => ({
          label: w.label ?? "",
          startsAt: w.startsAt,
          endsAt: w.endsAt,
        }))
      : []
  );
  const [bumpProductId, setBumpProductId] = useState<string>(initial.bumpProductId ?? "");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Bumped on reset to force-remount nested editors (which keep their own state).
  const [editorKey, setEditorKey] = useState(0);
  // Mode-change confirmation
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const isRestrictive = taskUnlockMode !== initial.taskUnlockMode && isRestrictiveModeChange(initial.taskUnlockMode, taskUnlockMode);

  const handleModeChange = useCallback((newMode: string) => {
    if (isRestrictiveModeChange(initial.taskUnlockMode, newMode)) {
      setPendingMode(newMode);
    } else {
      setTaskUnlockMode(newMode);
    }
  }, [initial.taskUnlockMode]);

  // Discard any in-flight edits and snap state back to the props from the server.
  // Called when the modal closes without an explicit Save click.
  function resetToInitial() {
    setTitle(initial.title);
    setDescription(initial.description ?? "");
    setPitch(initial.pitch ?? "");
    setBenefits(
      initial.benefits
        ? initial.benefits.map((b) => ({ icon: b.icon ?? "", text: b.text }))
        : []
    );
    setDifficulty((initial.difficulty as "NORMAL" | "HARD" | "CHAOS") || "NORMAL");
    setAutoStartMode(initial.autoStartAfterHours == null ? "manual" : "auto");
    setAutoStartHours(String(initial.autoStartAfterHours ?? 24));
    setTaskUnlockMode(initial.taskUnlockMode);
    setUnlockIntervalHours(String(initial.unlockIntervalHours));
    setBannerUrl(initial.bannerUrl);
    setBannerMediaType(initial.bannerMediaType === "VIDEO" ? "VIDEO" : "IMAGE");
    setBannerVideoUrl(initial.bannerVideoUrl ?? "");
    setThumbnailPending(false);
    setFeaturedOnGlobal(initial.featuredOnGlobal);
    setPricingConfig(initial.pricingConfig);
    setFreezeWindows(
      initial.freezeWindows
        ? initial.freezeWindows.map((w) => ({
            label: w.label ?? "",
            startsAt: w.startsAt,
            endsAt: w.endsAt,
          }))
        : []
    );
    setBumpProductId(initial.bumpProductId ?? "");
    setErr(null);
    setSaved(false);
    setEditorKey((k) => k + 1);
  }

  function closeWithoutSave() {
    resetToInitial();
    setOpen(false);
  }

  async function fetchVideoThumbnail() {
    const rawUrl = bannerVideoUrl.trim();
    if (!rawUrl) {
      setErr("Nhập URL YouTube/Vimeo/Wistia trước khi lấy thumbnail.");
      return;
    }
    setErr(null);
    setSaved(false);
    setThumbnailPending(true);
    const res = await resolveChallengeVideoThumbnailAction({
      challengeId,
      url: rawUrl,
    });
    setThumbnailPending(false);
    if (!res.ok) {
      setErr(res.reason);
      return;
    }
    setBannerVideoUrl(res.embedUrl);
    if (res.thumbnailUrl) {
      setBannerUrl(res.thumbnailUrl);
    } else {
      setErr("Không lấy được thumbnail tự động. Bạn có thể upload poster thủ công.");
    }
  }

  async function save() {
    setErr(null);
    setSaved(false);
    setPending(true);
    const parsedHours = parseInt(autoStartHours, 10);
    const autoStartAfterHours =
      autoStartMode === "auto" && Number.isFinite(parsedHours) && parsedHours >= 1
        ? Math.min(parsedHours, 8760)
        : null;
    // Trim + drop empty rows; empty array → null (renders fallback defaults)
    const cleanedBenefits = benefits
      .map((b) => ({ icon: b.icon.trim(), text: b.text.trim() }))
      .filter((b) => b.text.length > 0);
    const res = await updateChallengeSettingsAction({
      challengeId,
      title: title.trim(),
      description: description.trim(),
      pitch: pitch || null,
      benefits: cleanedBenefits.length > 0 ? cleanedBenefits : null,
      difficulty,
      autoStartAfterHours,
      taskUnlockMode: taskUnlockMode as "ALL" | "DAILY" | "SEQUENTIAL" | "MANUAL",
      unlockIntervalHours: parseInt(unlockIntervalHours, 10) || 24,
      bannerUrl: bannerUrl ?? "",
      bannerMediaType,
      bannerVideoUrl: bannerMediaType === "VIDEO" ? bannerVideoUrl.trim() : null,
      featuredOnGlobal,
      pricingConfig: pricingConfig as Record<string, unknown> | null,
      freezeWindows: freezeWindows.length > 0 ? freezeWindows : null,
      bumpProductId: bumpProductId || null,
      communitySlug,
      challengeSlug,
    });
    setPending(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      // Close so next open re-derives state from fresh server props (prevents drift after Reset/edit).
      setOpen(false);
    } else {
      setErr(res.reason);
    }
  }

  const videoPreview =
    bannerMediaType === "VIDEO" ? parseChallengeVideoUrl(bannerVideoUrl) : null;

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      {/* Backdrop click intentionally does NOT close — too easy to lose edits by accident. */}
      <section
        id="challenge-settings"
        className="ui-card ui-card-lg"
        style={{
          width: "min(600px, 90vw)",
          maxHeight: "85vh",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--header-primary)" }}>
            ⚙️ Cài đặt challenge
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "var(--text-xs)",
              color: autoStartMode === "auto" ? "var(--brand-green)" : "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {autoStartMode === "auto"
              ? `Tự bắt đầu sau ${autoStartHours}h`
              : "Bắt đầu thủ công"}
          </span>
          <button
            type="button"
            onClick={closeWithoutSave}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--text-muted)",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflowY: "auto",
            padding: 14,
            flex: 1,
            minHeight: 0,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Tiêu đề
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={pending}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Mô tả
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              disabled={pending}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              📝 Pitch (Sales page)
            </label>
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={6}
              disabled={pending}
              placeholder="Mô tả chi tiết cho trang giới thiệu challenge — ai nên tham gia, họ sẽ đạt được gì, tại sao thách thức này đáng giá…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 3 }}>
              Hiển thị cho người chưa tham gia. Hỗ trợ markdown: <code>### tiêu đề</code>, <code>**đậm**</code>, <code>*nghiêng*</code>, <code>- danh sách</code>, <code>[link](url)</code>.
            </div>
          </div>

          {/* Benefits — overrides default "Bạn sẽ có được gì?" bullets on sales view */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                🎯 Bạn sẽ có được gì? <span style={{ color: "var(--text-faint)" }}>(tuỳ chỉnh bullets cho sales view)</span>
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {benefits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBenefits([])}
                    disabled={pending}
                    style={{
                      fontSize: "var(--text-xs)",
                      padding: "3px 10px",
                      borderRadius: 5,
                      border: "1px solid var(--border-subtle)",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                    }}
                  >
                    Reset về mặc định
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBenefits((prev) => [...prev, { icon: "", text: "" }])}
                  disabled={pending || benefits.length >= BENEFIT_MAX_ITEMS}
                  style={{
                    fontSize: "var(--text-xs)",
                    padding: "3px 10px",
                    borderRadius: 5,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)",
                    cursor: benefits.length >= BENEFIT_MAX_ITEMS ? "not-allowed" : "pointer",
                    color: "var(--text-normal)",
                    opacity: benefits.length >= BENEFIT_MAX_ITEMS ? 0.5 : 1,
                  }}
                >
                  + Thêm
                </button>
              </div>
            </div>
            {benefits.length === 0 ? (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "8px 0", lineHeight: 1.5 }}>
                Đang dùng bullets mặc định (số tasks, cộng đồng, leaderboard, v.v.). Nhấn <strong>+ Thêm</strong> để viết bullets riêng — tối đa {BENEFIT_MAX_ITEMS} dòng.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {benefits.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="text"
                      value={b.icon}
                      onChange={(e) => {
                        const next = [...benefits];
                        next[i] = { ...next[i], icon: e.target.value };
                        setBenefits(next);
                      }}
                      maxLength={BENEFIT_ICON_MAX}
                      disabled={pending}
                      placeholder="🎯"
                      style={{ ...inputStyle, width: 56, textAlign: "center", padding: "8px 4px" }}
                    />
                    <input
                      type="text"
                      value={b.text}
                      onChange={(e) => {
                        const next = [...benefits];
                        next[i] = { ...next[i], text: e.target.value };
                        setBenefits(next);
                      }}
                      maxLength={BENEFIT_TEXT_MAX}
                      disabled={pending}
                      placeholder="Vd: 7 video AI Automation thực chiến (3 triệu)"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <div style={{ display: "flex", gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (i === 0) return;
                          const next = [...benefits];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          setBenefits(next);
                        }}
                        disabled={pending || i === 0}
                        title="Lên"
                        style={iconBtnStyle(i === 0 || pending)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (i === benefits.length - 1) return;
                          const next = [...benefits];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          setBenefits(next);
                        }}
                        disabled={pending || i === benefits.length - 1}
                        title="Xuống"
                        style={iconBtnStyle(i === benefits.length - 1 || pending)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setBenefits((prev) => prev.filter((_, j) => j !== i))}
                        disabled={pending}
                        title="Xoá dòng"
                        style={{ ...iconBtnStyle(pending), color: "var(--danger)" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {communityProducts.length > 0 && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                ⚡ Bump offer (hiện trên trang thanh toán)
              </span>
              <select
                value={bumpProductId}
                onChange={(e) => setBumpProductId(e.target.value)}
                disabled={pending}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "var(--text-normal)", fontSize: "var(--text-sm)" }}
              >
                <option value="">— Không có —</option>
                {communityProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Media chính
              </span>
              <select
                value={bannerMediaType}
                onChange={(e) => setBannerMediaType(e.target.value as ChallengeBannerMediaType)}
                disabled={pending}
                style={inputStyle}
              >
                <option value="IMAGE">Ảnh banner</option>
                <option value="VIDEO">Video YouTube/Vimeo/Wistia</option>
              </select>
            </label>

            {bannerMediaType === "VIDEO" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    URL video
                  </span>
                  <input
                    type="url"
                    value={bannerVideoUrl}
                    onChange={(e) => setBannerVideoUrl(e.target.value)}
                    disabled={pending}
                    placeholder="https://www.youtube.com/watch?v=... hoặc https://vimeo.com/... hoặc https://team.wistia.com/medias/..."
                    style={inputStyle}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={fetchVideoThumbnail}
                    disabled={pending || thumbnailPending || !bannerVideoUrl.trim()}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--interactive-normal)",
                      fontSize: "var(--text-sm)",
                      cursor: thumbnailPending ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {thumbnailPending ? "Đang lấy thumbnail…" : "Tự lấy thumbnail"}
                  </button>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Hỗ trợ YouTube, Vimeo và Wistia media/iframe URL.
                  </span>
                </div>
                {videoPreview && (
                  <div
                    style={{
                      aspectRatio: "16 / 9",
                      width: "100%",
                      maxWidth: 280,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--border-subtle)",
                      background: "#000",
                    }}
                  >
                    <iframe
                      src={videoPreview.embedUrl}
                      title="Video preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ width: "100%", height: "100%", border: 0 }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Thumbnail/poster video
                  </span>
                  <ImageUploadField
                    value={bannerUrl}
                    onChange={setBannerUrl}
                    context="community"
                    shape="banner"
                    disabled={pending || thumbnailPending}
                    maxSizeNote="Tối đa 5MB"
                    placeholder="Tự lấy từ video hoặc upload poster"
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Banner
                </span>
                <ImageUploadField
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  context="community"
                  shape="banner"
                  disabled={pending}
                  maxSizeNote="Tối đa 5MB"
                  placeholder="Chưa có banner — dùng gradient"
                />
              </div>
            )}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Độ khó
            </span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "NORMAL" | "HARD" | "CHAOS")}
              disabled={pending}
              style={inputStyle}
            >
              <option value="NORMAL">🛡️ Normal</option>
              <option value="HARD">⚔️ Hard</option>
              <option value="CHAOS">🔥 Chaos</option>
            </select>
          </label>

          {/* Cách bắt đầu — manual vs auto-start grace period */}
          <div
            style={{
              padding: "12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)" }}>
              ⏱ Cách bắt đầu challenge
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Quyết định khi nào đồng hồ &quot;Ngày 1&quot; chạy cho mỗi thành viên sau khi join/mua.
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="radio"
                name="autoStartMode"
                value="manual"
                checked={autoStartMode === "manual"}
                onChange={() => setAutoStartMode("manual")}
                disabled={pending}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)" }}>
                  Thủ công — thành viên tự nhấn &quot;🚀 Bắt đầu ngay&quot;
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  Mặc định. Nếu không nhấn, challenge sẽ không chạy.
                </div>
              </div>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="radio"
                name="autoStartMode"
                value="auto"
                checked={autoStartMode === "auto"}
                onChange={() => setAutoStartMode("auto")}
                disabled={pending}
                style={{ marginTop: 3 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--header-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  Tự động bắt đầu sau
                  <input
                    type="number"
                    min={1}
                    max={8760}
                    value={autoStartHours}
                    onChange={(e) => setAutoStartHours(e.target.value)}
                    onFocus={() => setAutoStartMode("auto")}
                    disabled={pending}
                    style={{ ...inputStyle, width: 80, padding: "4px 8px" }}
                  />
                  giờ kể từ lúc join
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  Member bấm &quot;Bắt đầu&quot; trong grace → đồng hồ chạy từ lúc bấm. Hết grace mà chưa bấm → tự bắt đầu lúc <code>joinedAt + N giờ</code>.
                </div>
              </div>
            </label>
          </div>

          {/* Task Unlock Mode */}
          <div
            style={{
              padding: "12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)" }}>
              🔓 Chế độ mở khóa task
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Quy định cách thành viên mở khóa task tiếp theo trong challenge.
            </div>
            <select
              value={taskUnlockMode}
              onChange={(e) => handleModeChange(e.target.value)}
              disabled={pending}
              style={inputStyle}
            >
              <option value="ALL">Mở tất cả — Thành viên thấy toàn bộ task ngay</option>
              <option value="DAILY">Theo thời gian — Mở khóa sau N giờ kể từ ngày bắt đầu</option>
              <option value="SEQUENTIAL">Tuần tự — Hoàn thành task trước mới mở task sau</option>
              <option value="MANUAL">Thủ công — Admin mở khóa từng task</option>
            </select>
            {isRestrictive && (
              <div style={{
                padding: "10px 12px",
                background: "rgba(218,55,60,0.08)",
                border: "1px solid rgba(218,55,60,0.3)",
                borderRadius: 8,
                fontSize: "var(--text-sm)",
                color: "#b91c1c",
                lineHeight: 1.5,
              }}>
                ⚠️ <strong>Cảnh báo:</strong> Chuyển từ "{MODE_LABELS[initial.taskUnlockMode]}" sang "{MODE_LABELS[taskUnlockMode]}" sẽ khóa lại các task mà thành viên đang xem được. Những người đang tham gia có thể bị mất quyền truy cập task đã mở. Hành động này áp dụng ngay lập tức cho tất cả thành viên.
              </div>
            )}
            {taskUnlockMode === "DAILY" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  Mỗi task mở sau:
                </span>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={unlockIntervalHours}
                  onChange={(e) => setUnlockIntervalHours(e.target.value)}
                  disabled={pending}
                  style={{ ...inputStyle, width: 80 }}
                />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>giờ</span>
              </div>
            )}
          </div>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              cursor: "pointer",
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
            }}
          >
            <input
              type="checkbox"
              checked={featuredOnGlobal}
              onChange={(e) => setFeaturedOnGlobal(e.target.checked)}
              disabled={pending}
              style={{ marginTop: 3 }}
            />
            <div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--header-primary)",
                }}
              >
                🌐 Hiện trên Marketplace/Discovery chung
              </div>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Cho phép challenge này xuất hiện ở /marketplace và /discovery public — user
                ngoài cộng đồng có thể khám phá và join.
              </div>
            </div>
          </label>

          {/* Freeze Windows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>⏸ Freeze Windows</label>
              <button
                type="button"
                onClick={() => setFreezeWindows((prev) => [...prev, { label: "", startsAt: "", endsAt: "" }])}
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "3px 10px",
                  borderRadius: 5,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)",
                  cursor: "pointer",
                  color: "var(--text-normal)",
                }}
              >
                + Thêm window
              </button>
            </div>
            {freezeWindows.length === 0 && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "8px 0" }}>
                Chưa có freeze window nào. Nhấn "+ Thêm" để tạo.
              </div>
            )}
            {freezeWindows.map((w, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <input
                    value={w.label}
                    onChange={(e) => {
                      const next = [...freezeWindows];
                      next[i] = { ...next[i], label: e.target.value };
                      setFreezeWindows(next);
                    }}
                    placeholder="Tên (vd: Nghỉ lễ 30/4)"
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      borderRadius: 5,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-input)",
                      color: "var(--text-normal)",
                      fontSize: "var(--text-xs)",
                      marginRight: 8,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFreezeWindows((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      fontSize: 12,
                      color: "var(--danger)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 3 }}>Bắt đầu</div>
                    <input
                      type="datetime-local"
                      value={w.startsAt}
                      onChange={(e) => {
                        const next = [...freezeWindows];
                        next[i] = { ...next[i], startsAt: e.target.value };
                        setFreezeWindows(next);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: 5,
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-input)",
                        color: "var(--text-normal)",
                        fontSize: "var(--text-xs)",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 3 }}>Kết thúc</div>
                    <input
                      type="datetime-local"
                      value={w.endsAt}
                      onChange={(e) => {
                        const next = [...freezeWindows];
                        next[i] = { ...next[i], endsAt: e.target.value };
                        setFreezeWindows(next);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: 5,
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-input)",
                        color: "var(--text-normal)",
                        fontSize: "var(--text-xs)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
              Trong lúc freeze, không ai bị tính là miss ngày. Bạn có thể thêm nhiều window cho các kỳ nghỉ khác nhau.
            </div>
          </div>

          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Giá tham gia
            </div>
            <ChallengePricingEditor
              key={editorKey}
              value={pricingConfig}
              onChange={setPricingConfig}
              tiers={initial.tiers}
            />
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--border-subtle)",
            padding: "12px 16px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {err && (
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                  padding: "6px 10px",
                  background: "rgba(218,55,60,0.08)",
                  borderRadius: 6,
                }}
              >
                {err}
              </div>
            )}
            {saved && !err && (
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--success)",
                  padding: "6px 10px",
                  background: "rgba(36,128,70,0.08)",
                  borderRadius: 6,
                }}
              >
                ✓ Đã lưu
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={closeWithoutSave}
            disabled={pending}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--interactive-normal)",
              fontSize: "var(--text-sm)",
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            Huỷ
          </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || thumbnailPending || !title.trim() || (bannerMediaType === "VIDEO" && !bannerVideoUrl.trim())}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--brand-green)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
        </div>
      </section>

      {/* Mode-change confirmation modal */}
      <ConfirmModal
        open={!!pendingMode}
        title="Xác nhận đổi chế độ mở khóa"
        message={`Chuyển từ "${MODE_LABELS[initial.taskUnlockMode]}" sang "${MODE_LABELS[pendingMode ?? ""]}" sẽ khóa lại các task mà thành viên đang xem được. Những người đang tham gia có thể bị mất quyền truy cập task đã mở.\n\nHành động này áp dụng ngay lập tức cho tất cả thành viên khi bạn nhấn Lưu.`}
        confirmLabel="Đồng ý, đổi chế độ"
        cancelLabel="Giữ nguyên"
        danger
        onConfirm={() => {
          if (pendingMode) setTaskUnlockMode(pendingMode);
          setPendingMode(null);
        }}
        onCancel={() => setPendingMode(null)}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-elevated)",
    color: "var(--text-normal)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "var(--text-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.4 : 1,
  };
}

/** Date → `YYYY-MM-DDTHH:MM` for <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
