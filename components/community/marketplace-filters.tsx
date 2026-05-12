"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const FILTERS: { label: string; value: string }[] = [
  { label: "Tất cả", value: "" },
  { label: "Templates", value: "TEMPLATE" },
  { label: "SOP", value: "SOP" },
  { label: "Tools", value: "TOOL" },
  { label: "Prompts", value: "PROMPT" },
  { label: "Bundles", value: "BUNDLE" },
  { label: "Miễn phí", value: "FREE" },
];

export function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("type") ?? "";
  const [, startTransition] = useTransition();

  function handleFilter(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) {
      sp.set("type", value);
    } else {
      sp.delete("type");
    }
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  return (
    <div className="mk-filters">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          className={`mk-filter${current === f.value ? " active" : ""}`}
          onClick={() => handleFilter(f.value)}
          style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
