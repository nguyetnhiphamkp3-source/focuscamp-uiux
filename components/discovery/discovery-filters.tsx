"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";

export function DiscoveryFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const sectionParam = params.get("section");
  const section =
    sectionParam === "communities" || sectionParam === "challenges"
      ? sectionParam
      : "";
  const [draftQ, setDraftQ] = useState(q);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  function push(nextQ: string) {
    const sp = new URLSearchParams();
    const trimmedQ = nextQ.trim();
    if (trimmedQ) sp.set("q", trimmedQ);
    if (section) sp.set("section", section);
    startTransition(() => {
      const qs = sp.toString();
      router.push(qs ? `/discovery?${qs}` : "/discovery");
    });
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    push(draftQ);
  }

  return (
    <form className="dc-search" onSubmit={submitSearch}>
      <Search size={18} style={{ color: "var(--text-muted)" }} />
      <input
        type="text"
        placeholder="Tìm communities, challenges, products…"
        value={draftQ}
        onChange={(e) => setDraftQ(e.target.value)}
      />
    </form>
  );
}
