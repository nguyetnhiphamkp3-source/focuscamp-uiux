"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

const CATEGORIES = [
  "Tất cả",
  "Business & Founder",
  "Marketing & Traffic",
  "Ecommerce",
  "Developer",
  "Content Creator",
  "Investing",
  "AI & Tech",
  "Fitness & Health",
];

export function DiscoveryFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const [, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(nextQ: string, nextCat: string) {
    const sp = new URLSearchParams();
    if (nextQ) sp.set("q", nextQ);
    if (nextCat && nextCat !== "Tất cả") sp.set("category", nextCat);
    startTransition(() => {
      router.push(`/discovery?${sp.toString()}`);
    });
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(val, category), 300);
  }

  function handleCategory(cat: string) {
    push(q, cat);
  }

  return (
    <>
      <div className="dc-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)" }}>
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm communities, challenges, products…"
          defaultValue={q}
          onChange={handleSearch}
        />
      </div>
      <div className="dc-categories">
        {CATEGORIES.map((c) => {
          const isActive = c === "Tất cả" ? !category || category === "Tất cả" : category === c;
          return (
            <button
              key={c}
              type="button"
              className={`dc-cat${isActive ? " active" : ""}`}
              onClick={() => handleCategory(c)}
              style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
            >
              {c}
            </button>
          );
        })}
      </div>
    </>
  );
}
