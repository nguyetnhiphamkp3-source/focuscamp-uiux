import type { ReactNode } from "react";

/**
 * Renders plain user text with bare URLs turned into clickable links.
 *
 * XSS-safe by construction: the text is split into segments and rendered as
 * React nodes (text + <a>), so React escapes everything — we never use
 * dangerouslySetInnerHTML. Whitespace/newlines are preserved by the parent
 * container (which sets `white-space: pre-wrap`); this component only renders
 * inline nodes.
 *
 * Detects `http(s)://…` and bare `www.…` URLs. Trailing sentence punctuation
 * is peeled back into the text so "see https://x.com." doesn't swallow the dot,
 * while balanced parens/brackets are kept (e.g. Wikipedia links).
 */

// Matches http(s):// URLs and bare www. URLs, stopping at whitespace or '<'.
const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/** Split a matched URL into [url, trailing] by peeling punctuation that is
 *  almost never part of a real URL, keeping balanced parens/brackets. */
function peelTrailing(raw: string): [string, string] {
  let url = raw;
  let trailing = "";
  while (url.length > 0) {
    const ch = url[url.length - 1];
    const isPunct = ".,;:!?\"'".includes(ch);
    const isUnbalancedParen = ch === ")" && !url.includes("(");
    const isUnbalancedBracket = ch === "]" && !url.includes("[");
    if (!isPunct && !isUnbalancedParen && !isUnbalancedBracket) break;
    trailing = ch + trailing;
    url = url.slice(0, -1);
  }
  return [url, trailing];
}

export function LinkifiedText({ children }: { children: string }) {
  const text = children ?? "";
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const [url, trailing] = peelTrailing(raw);

    // Text before this URL
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const href = url.startsWith("www.") ? `https://${url}` : url;
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        style={{
          color: "var(--text-link)",
          textDecoration: "underline",
          wordBreak: "break-word",
        }}
      >
        {url}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <>{nodes}</>;
}
