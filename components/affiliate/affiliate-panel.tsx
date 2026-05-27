"use client";

import { useState, useTransition } from "react";
import { getOrCreateAffiliateLinkAction } from "@/app/actions/affiliate";

export function AffiliatePanel({
  communityId,
  communitySlug,
  initialCode,
}: {
  communityId: string;
  communitySlug: string;
  initialCode: string | null;
}) {
  const [code, setCode] = useState<string | null>(initialCode);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/api/affiliate/track?ref=${code}&to=/c/${communitySlug}`
      : code
        ? `https://focus.camp/api/affiliate/track?ref=${code}&to=/c/${communitySlug}`
        : null;

  function generate() {
    setErr(null);
    start(async () => {
      const res = await getOrCreateAffiliateLinkAction({ communityId });
      if (res.ok && res.data) {
        setCode(res.data.code);
      } else if (!res.ok) {
        setErr(res.reason);
      }
    });
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <h3
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--header-primary)",
          marginBottom: 4,
        }}
      >
        🔗 Affiliate link của bạn
      </h3>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>
        Share link này. Người dùng signup + mua product, bump, cart item hoặc paid challenge của community này → bạn nhận hoa hồng.
      </p>

      {url ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            padding: "8px 10px",
            background: "var(--bg-chat)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            fontFamily: "monospace",
            fontSize: "var(--text-sm)",
          }}
        >
          <code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url}
          </code>
          <button
            type="button"
            onClick={copy}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--interactive-normal)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ Đã copy" : "Copy"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          style={{
            padding: "10px 18px",
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
          {pending ? "Đang tạo…" : "Tạo affiliate link"}
        </button>
      )}
      {err && (
        <div style={{ marginTop: 6, color: "var(--danger)", fontSize: "var(--text-xs)" }}>{err}</div>
      )}
    </section>
  );
}
