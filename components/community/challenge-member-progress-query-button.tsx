"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

export function ChallengeMemberProgressQueryButton({
  memberId,
  children,
  selected = false,
  ariaLabel,
  variant = "row",
}: {
  memberId: string | null;
  children: ReactNode;
  selected?: boolean;
  ariaLabel?: string;
  variant?: "row" | "close";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateMemberParam() {
    const params = new URLSearchParams(searchParams.toString());
    if (memberId) params.set("member", memberId);
    else params.delete("member");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={variant === "row" ? selected : undefined}
      onClick={updateMemberParam}
      style={variant === "close" ? closeButtonStyle : rowButtonStyle(selected)}
    >
      {children}
    </button>
  );
}

const closeButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-card)",
  color: "var(--text-muted)",
  cursor: "pointer",
};

function rowButtonStyle(selected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    padding: "0 var(--space-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--r-md)",
    background: selected ? "var(--brand-green)" : "var(--bg-card)",
    color: selected ? "#fff" : "var(--text-heading)",
    fontSize: "var(--text-xs)",
    fontWeight: "var(--fw-bold)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
