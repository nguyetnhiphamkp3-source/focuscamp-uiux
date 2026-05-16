"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateChallengeSettingsAction } from "@/app/actions/challenge-review";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { ChallengePricingEditor } from "@/components/community/challenge-pricing-editor";
import type { PricingConfig } from "@/lib/services/pricing";

type FreezeWindow = { label: string; startsAt: string; endsAt: string };

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
    requiresApproval: boolean;
    freezeWindows?: Array<{ label?: string; startsAt: string; endsAt: string }> | null;
    bannerUrl: string | null;
    featuredOnGlobal: boolean;
    pricingConfig: PricingConfig | null;
    tiers: { key: string; label: string }[];
    hideFutureTasks: boolean;
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
  const [requiresApproval, setRequiresApproval] = useState(initial.requiresApproval);
  const [hideFutureTasks, setHideFutureTasks] = useState(initial.hideFutureTasks);
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial.bannerUrl);
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
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateChallengeSettingsAction({
        challengeId,
        title: title.trim(),
        description: description.trim(),
        pitch: pitch || null,
        requiresApproval,
        hideFutureTasks,
        bannerUrl: bannerUrl ?? "",
        featuredOnGlobal,
        pricingConfig: pricingConfig as Record<string, unknown> | null,
        freezeWindows: freezeWindows.length > 0 ? freezeWindows : null,
        bumpProductId: bumpProductId || null,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        setSaved(true);
      } else {
        setErr(res.reason);
      }
    });
  }

  useEffect(() => {
    if (saved) router.refresh();
  }, [saved]);

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
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <section
        id="challenge-settings"
        className="ui-card ui-card-lg"
        style={{
          width: "min(600px, 90vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--header-primary)" }}>
            ⚙️ Cài đặt challenge
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "var(--text-xs)",
              color: requiresApproval ? "var(--warning)" : "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {requiresApproval ? "Yêu cầu duyệt" : "Tự động ACTIVE"}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
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
              Hiển thị cho người chưa tham gia. Hỗ trợ xuống dòng.
            </div>
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
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
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
                Yêu cầu admin duyệt
              </div>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Khi bật: người tham gia phải chờ admin duyệt trước khi được vào challenge.
                Khi tắt (mặc định): tự động vào challenge, thành viên tự nhấn Bắt đầu khi sẵn sàng.
              </div>
            </div>
          </label>

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
              checked={hideFutureTasks}
              onChange={(e) => setHideFutureTasks(e.target.checked)}
              disabled={pending}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)" }}>
                Ẩn nhiệm vụ tương lai
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                Khi bật: thành viên chỉ thấy task đến ngày hiện tại của họ — task tiếp theo ẩn đi đến khi đến ngày.
              </div>
            </div>
          </label>

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
              value={pricingConfig}
              onChange={setPricingConfig}
              tiers={initial.tiers}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={save}
              disabled={pending || !title.trim()}
              style={{
                marginLeft: "auto",
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
          {saved && (
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
      </section>
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

/** Date → `YYYY-MM-DDTHH:MM` for <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
