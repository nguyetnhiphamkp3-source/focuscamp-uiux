import { prisma } from "@/lib/prisma";
import { fmtRelativeTime } from "@/lib/brand";
import { SectionHeader } from "./editor-shared";

export async function AgentActivityPanel({
  communityId,
}: {
  communityId: string;
}) {
  const calls = await prisma.agentToolCall.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      toolName: true,
      durationMs: true,
      errorMessage: true,
      createdAt: true,
      apiKeyId: true,
    },
  });

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="Hoạt động Agent"
        subtitle="50 lần gọi MCP tool gần nhất. Dùng để debug khi agent ở goclaw thực hiện hành động."
      />
      {calls.length === 0 ? (
        <div
          style={{
            padding: 16,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            textAlign: "center",
            border: "1px dashed var(--border-subtle)",
            borderRadius: 8,
          }}
        >
          Chưa có agent nào gọi tool.
        </div>
      ) : (
        <div
          style={{
            maxHeight: 360,
            overflowY: "auto",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--text-sm)",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "var(--bg-card)",
                zIndex: 1,
              }}
            >
              <tr>
                <Th>Tool</Th>
                <Th>Status</Th>
                <Th>Duration</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const isErr = !!c.errorMessage;
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderTop: "1px solid var(--border-subtle)",
                      background: isErr ? "rgba(218,55,60,0.04)" : "transparent",
                    }}
                  >
                    <Td>
                      <code style={{ fontSize: "var(--text-xs)" }}>{c.toolName}</code>
                    </Td>
                    <Td>
                      {isErr ? (
                        <span
                          style={{ color: "var(--danger)", fontWeight: 600 }}
                          title={c.errorMessage ?? ""}
                        >
                          ⚠ Error
                        </span>
                      ) : (
                        <span style={{ color: "var(--success)" }}>✓ OK</span>
                      )}
                    </Td>
                    <Td>{c.durationMs}ms</Td>
                    <Td style={{ color: "var(--text-muted)" }}>
                      {fmtRelativeTime(c.createdAt)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px 10px",
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td style={{ padding: "8px 10px", ...style }}>
      {children}
    </td>
  );
}
