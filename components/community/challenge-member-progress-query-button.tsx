"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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

export function ChallengeMemberProgressSearchForm({
  initialSearch,
}: {
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialSearch);

  useEffect(() => {
    setValue(initialSearch);
  }, [initialSearch]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = value.trim();
    if (nextSearch) params.set("memberSearch", nextSearch);
    else params.delete("memberSearch");
    params.delete("memberPage");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearSearch() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("memberSearch");
    params.delete("memberPage");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <form onSubmit={submitSearch} style={searchFormStyle}>
      <div style={searchInputWrapStyle}>
        <Search size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tìm theo tên, email hoặc handle"
          aria-label="Tìm thành viên"
          style={searchInputStyle}
        />
        {initialSearch && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Xóa tìm kiếm thành viên"
            style={clearSearchButtonStyle}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <button type="submit" style={searchButtonStyle}>
        Tìm
      </button>
    </form>
  );
}

export function ChallengeMemberProgressPageButton({
  page,
  disabled,
  direction,
  children,
}: {
  page: number;
  disabled?: boolean;
  direction: "prev" | "next";
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage() {
    if (disabled) return;
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("memberPage");
    else params.set("memberPage", String(page));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={goToPage}
      disabled={disabled}
      style={pagerButtonStyle(disabled)}
    >
      {direction === "prev" && <ChevronLeft size={15} aria-hidden="true" />}
      {children}
      {direction === "next" && <ChevronRight size={15} aria-hidden="true" />}
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

const searchFormStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  borderTop: "1px solid var(--border-subtle)",
};

const searchInputWrapStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 36,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "0 var(--space-3)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-secondary)",
  color: "var(--text-muted)",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  border: 0,
  outline: "none",
  background: "transparent",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
};

const clearSearchButtonStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  borderRadius: "var(--r-sm)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  flexShrink: 0,
};

const searchButtonStyle: CSSProperties = {
  minHeight: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 var(--space-4)",
  border: "1px solid var(--brand-green)",
  borderRadius: "var(--r-md)",
  background: "var(--brand-green)",
  color: "#fff",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--fw-bold)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function pagerButtonStyle(disabled?: boolean): CSSProperties {
  return {
    minHeight: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-1)",
    padding: "0 var(--space-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--r-md)",
    background: disabled ? "var(--bg-secondary)" : "var(--bg-card)",
    color: disabled ? "var(--text-muted)" : "var(--text-heading)",
    fontSize: "var(--text-xs)",
    fontWeight: "var(--fw-bold)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    whiteSpace: "nowrap",
  };
}
