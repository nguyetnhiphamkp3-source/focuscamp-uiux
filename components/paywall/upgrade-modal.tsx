"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Reusable upgrade paywall — shows when a member tries to access content
 * gated by `requiredTier`. Prompts them to upgrade Subscription tier.
 *
 * v1: simple modal with link to community settings tiers + CTA. Real upgrade
 * flow ships when Subscription purchase route is wired (TODO).
 */
export function UpgradeModal({
  requiredTier,
  contentTitle,
  communitySlug,
  onClose,
}: {
  requiredTier: string;
  contentTitle: string;
  communitySlug: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg-floating)",
          borderRadius: 14,
          border: "1px solid var(--border-subtle)",
          maxWidth: 460,
          width: "100%",
          padding: 28,
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h2
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 800,
            color: "var(--header-primary)",
            marginBottom: 8,
          }}
        >
          Cần gói {requiredTier}
        </h2>
        <p
          style={{
            fontSize: "var(--text-base)",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          <strong>{contentTitle}</strong> chỉ mở cho thành viên gói{" "}
          <strong style={{ color: "var(--brand-green)" }}>{requiredTier}</strong>.
          Nâng cấp để truy cập toàn bộ.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "11px 20px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--interactive-normal)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
            }}
          >
            Để sau
          </button>
          <Link
            href={`/c/${communitySlug}/settings`}
            style={{
              padding: "11px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--brand-green)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "var(--text-base)",
              textDecoration: "none",
            }}
          >
            Xem các gói →
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Click handler wrapper — render any element + intercept click to show modal
 * if `requiredTier` is set and user doesn't meet it.
 */
export function PaywallGate({
  requiredTier,
  userTier,
  contentTitle,
  communitySlug,
  href,
  children,
  className,
  style,
}: {
  requiredTier: string | null;
  userTier: string | null;
  contentTitle: string;
  communitySlug: string;
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const blocked = !!requiredTier && userTier !== requiredTier && userTier !== "OWNER";

  if (!blocked) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <a
        href="#"
        className={className}
        style={style}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {open && (
        <UpgradeModal
          requiredTier={requiredTier!}
          contentTitle={contentTitle}
          communitySlug={communitySlug}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
