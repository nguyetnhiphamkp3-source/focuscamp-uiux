"use client";

import { useState } from "react";
import { AffiliatePanel } from "@/components/affiliate/affiliate-panel";

export function InviteCopyButton({
  communityId,
  communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 0",
          margin: "4px 0",
          borderRadius: 8,
          border: "none",
          background: "var(--brand-green)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          cursor: "pointer",
          fontFamily: "var(--font-heading)",
        }}
      >
        🔗 Invite People
      </button>
      {open && (
        <AffiliatePanel
          communityId={communityId}
          communitySlug={communitySlug}
          initialCode={null}
        />
      )}
    </div>
  );
}
