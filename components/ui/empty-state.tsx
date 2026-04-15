export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ui-empty">
      <div className="ui-empty-icon">{icon}</div>
      <div className="ui-empty-title">{title}</div>
      {description && (
        <div style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
