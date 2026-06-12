"use client";

import { useState, useTransition } from "react";
import { joinCommunityAction, subscribeCommunityTierAction } from "@/app/actions/community";
import type { ClassConfig } from "@/lib/community-config";
import type { TierConfigItem } from "@/lib/services/subscription";

export function JoinButton({
  communityId,
  communitySlug,
  classes,
  tiers = [],
  currentClassKey = null,
  label = "Tham gia cộng đồng",
  variant = "primary",
}: {
  communityId: string;
  communitySlug: string;
  classes: ClassConfig[];
  tiers?: TierConfigItem[];
  currentClassKey?: string | null;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string>(currentClassKey ?? "");
  const [pickedTier, setPickedTier] = useState<string>("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const hasTiers = tiers.length > 0;
  const hasClasses = classes.length > 0;

  function directJoin() {
    setErr(null);
    start(async () => {
      const res = await joinCommunityAction({ communityId, communitySlug });
      if (res.ok) window.location.reload();
      else setErr(res.reason);
    });
  }

  function joinWithClass() {
    setErr(null);
    if (!picked) { setErr("Hãy chọn một class trước khi tham gia"); return; }
    start(async () => {
      const res = await joinCommunityAction({ communityId, communitySlug, className: picked });
      if (res.ok) window.location.reload();
      else setErr(res.reason);
    });
  }

  function joinWithTier() {
    if (!pickedTier) { setErr("Hãy chọn một gói"); return; }
    const tier = tiers.find((t) => t.key === pickedTier);
    if (!tier) return;
    if (tier.isFree) {
      setOpen(false);
      directJoin();
      return;
    }
    const priceVnd = tier.priceVndMonthly ?? 0;
    setErr(null);
    start(async () => {
      const res = await subscribeCommunityTierAction({
        communityId,
        communitySlug,
        tierKey: tier.key,
        priceVnd,
        durationDays: 30,
      });
      if (res.ok) {
        setOpen(false);
        window.location.href = `/pay/${res.paymentCode}?return=${encodeURIComponent(`/c/${communitySlug}`)}`;
      } else {
        setErr(res.reason);
      }
    });
  }

  function onClickMain() {
    if (hasTiers) setOpen(true);
    else if (hasClasses) setOpen(true);
    else directJoin();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClickMain}
        disabled={pending}
        className={`rs-join-btn ${variant}`}
        style={{ margin: "4px 0", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Đang xử lý…" : label}
      </button>
      {err && !open && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            marginTop: 4,
          }}
        >
          {err}
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget && !pending) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div style={{ background: "var(--bg-floating)", borderRadius: 14, border: "none", maxWidth: 520, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--header-primary)", marginBottom: 4 }}>
                {hasTiers ? "Chọn gói tham gia" : "Chọn class của bạn"}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {hasTiers
                  ? "Mỗi gói mở ra quyền truy cập khác nhau. Có thể nâng cấp sau."
                  : "Cộng đồng này phân thành viên theo class — có thể đổi lại sau."}
              </div>
            </div>

            <div style={{ padding: "14px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {hasTiers
                ? tiers.map((t) => {
                    const sel = pickedTier === t.key;
                    const price = t.isFree ? null : t.priceVndMonthly;
                    return (
                      <button key={t.key} type="button" onClick={() => setPickedTier(t.key)} disabled={pending}
                        style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 10, border: "none", background: sel ? "rgba(27,158,117,0.12)" : "var(--bg-card)", color: "var(--text-normal)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                      >
                        {t.emoji && <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{t.emoji}</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--header-primary)" }}>{t.label}</div>
                          {t.description && <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{t.description}</div>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {price ? (
                            <>
                              <div style={{ fontSize: "var(--text-md)", fontWeight: 800, color: "var(--brand-green)" }}>{price.toLocaleString("vi-VN")}đ</div>
                              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>/tháng</div>
                            </>
                          ) : (
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-muted)" }}>Miễn phí</div>
                          )}
                        </div>
                        {sel && <div style={{ color: "var(--brand-green)", fontWeight: 700, flexShrink: 0 }}>✓</div>}
                      </button>
                    );
                  })
                : classes.map((c) => {
                    const sel = picked === c.key;
                    return (
                      <button key={c.key} type="button" onClick={() => setPicked(c.key)} disabled={pending}
                        style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 10, border: "none", background: sel ? "rgba(27,158,117,0.12)" : "var(--bg-card)", color: "var(--text-normal)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                      >
                        {c.emoji && <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji}</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--header-primary)" }}>{c.label}</div>
                          {c.description && <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>{c.description}</div>}
                        </div>
                        {sel && <div style={{ color: "var(--brand-green)", fontWeight: 700 }}>✓</div>}
                      </button>
                    );
                  })}
            </div>

            {err && <div style={{ padding: "0 20px 8px", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{err}</div>}

            <div style={{ padding: "14px 20px", display: "flex", gap: 8 }}>
              <button type="button" onClick={() => !pending && setOpen(false)} disabled={pending}
                style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--bg-modifier-hover)", color: "var(--interactive-normal)", cursor: "pointer", fontSize: "var(--text-sm)" }}
              >
                Huỷ
              </button>
              <button type="button"
                onClick={hasTiers ? joinWithTier : joinWithClass}
                disabled={pending || (hasTiers ? !pickedTier : !picked)}
                style={{ marginLeft: "auto", padding: "10px 22px", borderRadius: 8, border: "none", background: (hasTiers ? pickedTier : picked) ? "var(--brand-green)" : "var(--bg-modifier-hover)", color: "#fff", fontWeight: 600, fontSize: "var(--text-sm)", cursor: (hasTiers ? pickedTier : picked) ? "pointer" : "not-allowed", opacity: pending ? 0.6 : 1 }}
              >
                {pending ? "Đang xử lý…" : hasTiers
                  ? (tiers.find((t) => t.key === pickedTier)?.isFree ? "Tham gia miễn phí" : pickedTier ? `Thanh toán →` : "Chọn gói")
                  : (currentClassKey ? "Đổi class" : "Tham gia")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
