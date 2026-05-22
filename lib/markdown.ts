/**
 * Server-side markdown renderer for admin-authored long-form content
 * (challenge pitch, course descriptions, etc.).
 *
 * Uses `marked` for parsing + `isomorphic-dompurify` to defang any HTML
 * that sneaks through. Outputs a string suitable for `dangerouslySetInnerHTML`.
 */
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(input: string | null | undefined): string {
  if (!input) return "";
  const rawHtml = marked.parse(input, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt"],
  });
}
