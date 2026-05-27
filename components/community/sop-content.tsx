import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function SopContent({
  content,
  className = "ch-task-sop-content",
}: {
  content: string;
  className?: string;
}) {
  const html = marked.parse(content) as string;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
