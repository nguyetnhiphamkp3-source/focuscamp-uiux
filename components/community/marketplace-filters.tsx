"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useRef } from "react";
import { useLocale } from "@/components/locale-provider";

export function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("type") ?? "";
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const { t } = useLocale();

  const FILTERS = [
    { label: t("mkAll"), value: "" },
    { label: t("mkTemplate"), value: "TEMPLATE" },
    { label: t("mkSop"), value: "SOP" },
    { label: t("mkTool"), value: "TOOL" },
    { label: t("mkPrompt"), value: "PROMPT" },
    { label: t("mkBundle"), value: "BUNDLE" },
    { label: t("mkFree"), value: "FREE" },
  ];

  function handleFilter(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set("type", value);
    else sp.delete("type");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchRef.current?.value.trim() ?? "";
    const sp = new URLSearchParams(params.toString());
    if (q) sp.set("q", q);
    else sp.delete("q");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "var(--space-4)" }}>
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          ref={searchRef}
          defaultValue={params.get("q") ?? ""}
          placeholder={t("mkSearchPlaceholder")}
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            color: "var(--text-normal)",
            fontSize: "var(--text-sm)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          🔍
        </button>
      </form>

      {/* Type filters */}
      <div className="mk-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`mk-filter${current === f.value ? " active" : ""}`}
            onClick={() => handleFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
