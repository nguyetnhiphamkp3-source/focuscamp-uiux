import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function SopContent({ content }: { content: string }) {
  const html = marked.parse(content) as string;
  return (
    <div
      className="ch-task-sop-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
