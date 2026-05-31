"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type SearchResults = {
  posts: { id: string; title: string | null; body: string; type: string }[];
  courses: { id: string; slug: string; title: string; description: string | null }[];
  challenges: { id: string; slug: string; title: string; description: string | null; difficulty: string }[];
};

export function CommunitySearchBar({ name, slug }: { name: string; slug: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults(null);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/community/${slug}/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value.trim()), 300);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    results && (results.posts.length > 0 || results.courses.length > 0 || results.challenges.length > 0);

  return (
    <div ref={containerRef} style={{ padding: "var(--space-2) var(--space-3)", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-elevated)",
          height: 36,
        }}
      >
        <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results && query.length >= 2) setOpen(true); }}
          placeholder={`Tìm trong ${name.split(" ").slice(0, 2).join(" ")}…`}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "var(--text-xs)",
            color: "var(--text-normal)",
            fontFamily: "inherit",
          }}
        />
        {loading && (
          <div
            style={{
              width: 12,
              height: 12,
              border: "2px solid var(--border-subtle)",
              borderTopColor: "var(--brand-green)",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "var(--space-3)",
            right: "var(--space-3)",
            marginTop: 4,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            maxHeight: 360,
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          {!hasResults && !loading && (
            <div style={{ padding: "12px 16px", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Không tìm thấy kết quả
            </div>
          )}

          {results && results.posts.length > 0 && (
            <SearchGroup label="Bài viết">
              {results.posts.map((p) => (
                <SearchItem
                  key={p.id}
                  href={`/c/${slug}/posts/${p.id}`}
                  title={p.title || p.body.slice(0, 60)}
                  subtitle={p.type === "QNA" ? "Hỏi đáp" : "Bảng tin"}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </SearchGroup>
          )}

          {results && results.courses.length > 0 && (
            <SearchGroup label="Khóa học">
              {results.courses.map((c) => (
                <SearchItem
                  key={c.id}
                  href={`/c/${slug}/courses/${c.slug}`}
                  title={c.title}
                  subtitle={c.description?.slice(0, 50) || ""}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </SearchGroup>
          )}

          {results && results.challenges.length > 0 && (
            <SearchGroup label="Challenge">
              {results.challenges.map((ch) => (
                <SearchItem
                  key={ch.id}
                  href={`/c/${slug}/challenges/${ch.slug}`}
                  title={ch.title}
                  subtitle={ch.difficulty}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          padding: "8px 16px 4px",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function SearchItem({
  href,
  title,
  subtitle,
  onNavigate,
}: {
  href: string;
  title: string;
  subtitle: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{
        display: "block",
        padding: "8px 16px",
        textDecoration: "none",
        transition: "background 100ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-modifier-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--header-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </div>
      )}
    </Link>
  );
}
