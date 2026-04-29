import type { ReactNode } from "react";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="view-header">
        <span className="view-title">{title}</span>
        <span className="view-subtitle">Cập nhật {updatedAt}</span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-6) var(--space-8)",
        }}
      >
        <article
          style={{
            maxWidth: 760,
            margin: "0 auto",
            fontSize: "var(--text-base)",
            lineHeight: 1.65,
            color: "var(--text-normal)",
          }}
        >
          {children}
        </article>
      </div>
    </>
  );
}

export const legalStyles = {
  h2: {
    fontSize: "var(--text-xl)",
    fontWeight: 700,
    color: "var(--header-primary)",
    marginTop: "var(--space-6)",
    marginBottom: "var(--space-3)",
  } as React.CSSProperties,
  h3: {
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--header-primary)",
    marginTop: "var(--space-4)",
    marginBottom: "var(--space-2)",
  } as React.CSSProperties,
  p: {
    marginBottom: "var(--space-3)",
  } as React.CSSProperties,
  ul: {
    paddingLeft: 20,
    marginBottom: "var(--space-3)",
  } as React.CSSProperties,
};
