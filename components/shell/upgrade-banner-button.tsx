"use client";

import { useState } from "react";
import { Star, ChevronRight, X } from "lucide-react";
import { createPortal } from "react-dom";
import { UpgradeModalContent } from "./upgrade-modal-content";
import type { TierConfigItem } from "@/lib/services/subscription";

export function UpgradeBannerButton({
  communityId,
  communitySlug,
  tiers,
  currentTierKey,
  currentTierLabel,
}: {
  communityId: string;
  communitySlug: string;
  tiers: TierConfigItem[];
  currentTierKey: string;
  currentTierLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          margin: "8px 12px", padding: "10px 14px",
          background: "linear-gradient(135deg, #1B9E75 0%, #0d7a5a 100%)",
          borderRadius: 10, border: "none", cursor: "pointer",
          width: "calc(100% - 24px)", textAlign: "left",
        }}
      >
        <Star size={18} color="gold" strokeWidth={1.5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
            Nâng cấp gói
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
            Mở khoá tính năng premium
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.7)", flexShrink: 0 }} />
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, overflowY: "auto",
          }}
        >
          <div style={{
            background: "var(--bg-floating)", borderRadius: 16,
            maxWidth: 680, width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            maxHeight: "90vh", display: "flex", flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}>
              <div>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--header-primary)" }}>
                  ⭐ Nâng cấp gói thành viên
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "var(--bg-elevated)", border: "none", borderRadius: 6,
                  width: 28, height: 28, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", color: "var(--text-muted)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "18px 20px", overflowY: "auto" }}>
              <UpgradeModalContent
                tiers={tiers}
                currentTierKey={currentTierKey}
                currentTierLabel={currentTierLabel}
                communityId={communityId}
                communitySlug={communitySlug}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
