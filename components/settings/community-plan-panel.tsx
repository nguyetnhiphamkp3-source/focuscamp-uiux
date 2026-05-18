"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renewCommunityPlanAction } from "@/app/actions/community";
import { fmtVnd } from "@/lib/brand";
import {
  PLATFORM_PLANS,
  planLabel,
  type PlanState,
} from "@/lib/platform-plans";
import { btnPrimary, ErrorBox, SectionHeader } from "./editor-shared";

/**
 * Owner/admin panel showing current plan state + renew button.
 */
export function CommunityPlanPanel({
  communityId,
  state,
}: {
  communityId: string;
  state: PlanState;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function renew() {
    setErr(null);
    start(async () => {
      const res = await renewCommunityPlanAction({ communityId });
      if (res.ok) {
        router.push(`/pay/${res.paymentCode}`);
      } else {
        setErr(res.reason);
      }
    });
  }

  const isGrandfather = state.tier === "GRANDFATHER";
  const plan =
    state.tier === "SOLO" || state.tier === "PRO" || state.tier === "AGENCY"
      ? PLATFORM_PLANS[state.tier]
      : null;

  const statusLabel = {
    active: "Đang hoạt động",
    grace: "Hết hạn — đang grace",
    expired: "Hết hạn — read-only",
    pending: "Chưa thanh toán",
    grandfathered: "Lifetime free (grandfather)",
  }[state.status];

  const statusColor = {
    active: "var(--success)",
    grace: "var(--premium-gold)",
    expired: "var(--danger)",
    pending: "var(--danger)",
    grandfathered: "var(--brand-green)",
  }[state.status];

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="Gói của cộng đồng"
        subtitle="Plan platform-level — quyết định cộng đồng có hoạt động được không."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Field label="Gói hiện tại">
          <span style={{ fontWeight: 700, color: "var(--header-primary)" }}>
            {planLabel(state.tier)}
          </span>
        </Field>
        <Field label="Trạng thái">
          <span style={{ fontWeight: 700, color: statusColor }}>
            {statusLabel}
          </span>
        </Field>
        {plan && (
          <Field label="Phí hàng tháng">
            <span style={{ fontWeight: 700, color: "var(--header-primary)" }}>
              {fmtVnd(plan.priceVnd)}đ
            </span>
          </Field>
        )}
        {state.expiresAt && (
          <Field label="Hết hạn">
            <span style={{ color: "var(--text-normal)" }}>
              {state.expiresAt.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              {state.daysLeft !== null && (
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "var(--text-sm)",
                    marginLeft: 8,
                  }}
                >
                  ({state.daysLeft > 0 ? `còn ${state.daysLeft} ngày` : `quá hạn ${Math.abs(state.daysLeft)} ngày`})
                </span>
              )}
            </span>
          </Field>
        )}
      </div>

      {!isGrandfather && (
        <div style={{ display: "flex", marginTop: 4 }}>
          <button
            type="button"
            onClick={renew}
            disabled={pending}
            style={{
              ...btnPrimary,
              marginLeft: "auto",
              opacity: pending ? 0.6 : 1,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Đang xử lý…" : "Gia hạn 30 ngày →"}
          </button>
        </div>
      )}

      <ErrorBox msg={err} />
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "var(--text-base)" }}>{children}</span>
    </div>
  );
}
