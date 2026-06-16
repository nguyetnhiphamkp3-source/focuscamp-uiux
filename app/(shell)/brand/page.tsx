export const metadata = {
  title: "Brand Guidelines — focus.camp",
};

const FONT_SIZES = [
  { name: "3xl", value: 36, use: "Landing hero mega" },
  { name: "2xl", value: 28, use: "h1, hero secondary" },
  { name: "xl", value: 22, use: "h2, section header" },
  { name: "lg", value: 18, use: "h3, card title, sidebar active item" },
  { name: "md", value: 16, use: "Button default, leading paragraph, h4" },
  { name: "base", value: 15, use: "UI default, body standard, button sm" },
  { name: "sm", value: 14, use: "Body small, captions, secondary info" },
  { name: "xs", value: 12, use: "Labels, meta, timestamps, chip badges" },
];

const WEIGHTS = [
  { n: 400, name: "Regular" },
  { n: 500, name: "Medium" },
  { n: 600, name: "Semibold" },
  { n: 700, name: "Bold" },
  { n: 800, name: "Extrabold" },
];

const COLORS: { name: string; var: string; note: string }[] = [
  { name: "Brand green", var: "--brand-green", note: "Primary CTA, accents" },
  { name: "Brand green dark", var: "--brand-green-dark", note: "Hover/active" },
  { name: "Fire orange", var: "", note: "#ff7043 — Manifesto / fire accent only" },
  { name: "Text heading", var: "--text-heading", note: "h1-h6, strong text" },
  { name: "Text normal", var: "--text-normal", note: "Body default" },
  { name: "Text muted", var: "--text-muted", note: "Labels, hints, meta" },
  { name: "BG body", var: "--bg-body", note: "Page background" },
  { name: "BG card", var: "--bg-card", note: "Card/surface" },
  { name: "BG elevated", var: "--bg-elevated", note: "Input, chip, sublayer" },
  { name: "Danger", var: "--danger", note: "Error, destructive" },
  { name: "Success", var: "--success", note: "Join / completed" },
  { name: "Warning", var: "--warning", note: "Alert, pending" },
];

const SPACING = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];

const RADIUS = [
  { name: "sm", v: 4 },
  { name: "md", v: 8 },
  { name: "lg", v: 10 },
  { name: "xl", v: 14 },
  { name: "2xl", v: 20 },
  { name: "full", v: 9999 },
];

export default function BrandPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "var(--space-16) var(--space-6)",
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: "var(--space-16)" }}>
          <Label>Brand Guidelines</Label>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: "var(--fw-regular)",
              marginBottom: "var(--space-3)",
            }}
          >
            Bộ nguyên tắc thiết kế
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              lineHeight: "var(--lh-relaxed)",
            }}
          >
            Mọi UI trong focus.camp đều dựng trên một bộ token cố định bên dưới.
            Không dùng inline pixel ngoài scale này.
          </p>
        </header>

        {/* TYPOGRAPHY */}
        <Section label="Typography — 3 fonts">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--space-5)",
            }}
          >
            <FontSample
              name="Roboto"
              role="Heading"
              style={{ fontFamily: "var(--font-heading)" }}
              example="h1 · Tiêu đề trang"
            />
            <FontSample
              name="Arial"
              role="Body"
              style={{ fontFamily: "var(--font-body)" }}
              example="Body · Nội dung đoạn văn"
            />
            <FontSample
              name="Playfair Display"
              role="Display / Quotes"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
              }}
              example="Trích dẫn đặc biệt — lửa kéo người đến."
            />
          </div>
        </Section>

        {/* FONT SIZES */}
        <Section
          label={`Font sizes — 8 kích cỡ duy nhất`}
          description="Chỉ dùng các size bên dưới cho mọi text. Không inline pixel khác."
        >
          <div className="ui-card ui-card-lg" style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <Th>Token</Th>
                  <Th align="right">Px</Th>
                  <Th>Dùng cho</Th>
                  <Th>Ví dụ</Th>
                </tr>
              </thead>
              <tbody>
                {FONT_SIZES.map((s) => (
                  <tr
                    key={s.name}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <Td>
                      <code
                        style={{
                          fontFamily: "monospace",
                          fontSize: "var(--text-sm)",
                          color: "var(--brand-green-dark)",
                        }}
                      >
                        --text-{s.name}
                      </code>
                    </Td>
                    <Td align="right">
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {s.value}px
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-normal)",
                        }}
                      >
                        {s.use}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: `var(--text-${s.name})`,
                          color: "var(--text-heading)",
                          lineHeight: 1.2,
                        }}
                      >
                        Aa Bb Cc
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* WEIGHTS */}
        <Section label="Font weights — 5 cấp">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {WEIGHTS.map((w) => (
              <div key={w.n} className="ui-card ui-card-sm" style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: w.n,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Aa
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {w.name} · {w.n}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* COLORS */}
        <Section label="Colors — palette">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {COLORS.map((c) => (
              <div key={c.name} className="ui-card ui-card-sm">
                <div
                  style={{
                    height: 40,
                    borderRadius: "var(--r-md)",
                    background: c.var ? `var(${c.var})` : "#ff7043",
                    marginBottom: "var(--space-2)",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--fw-bold)",
                    color: "var(--text-heading)",
                  }}
                >
                  {c.name}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {c.var ? (
                    <code style={{ fontFamily: "monospace" }}>var({c.var})</code>
                  ) : (
                    ""
                  )}
                  {c.var && " · "}
                  {c.note}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* SPACING */}
        <Section label="Spacing — 4px base">
          <div
            className="ui-card ui-card-lg"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
          >
            {SPACING.map((n) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <code
                  style={{
                    fontFamily: "monospace",
                    fontSize: "var(--text-sm)",
                    color: "var(--brand-green-dark)",
                    width: 90,
                  }}
                >
                  --space-{n}
                </code>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    width: 50,
                  }}
                >
                  {n * 4}px
                </span>
                <div
                  style={{
                    height: 14,
                    width: n * 4,
                    background: "var(--brand-green)",
                    borderRadius: 2,
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* RADIUS */}
        <Section label="Border radius">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {RADIUS.map((r) => (
              <div key={r.name} className="ui-card ui-card-sm" style={{ textAlign: "center" }}>
                <div
                  style={{
                    height: 60,
                    background: "var(--brand-green-soft)",
                    border: "1px solid var(--brand-green)",
                    borderRadius: r.v > 100 ? "50%" : r.v,
                    marginBottom: "var(--space-2)",
                  }}
                />
                <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-bold)" }}>
                  --r-{r.name}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {r.v > 100 ? "full" : `${r.v}px`}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* USAGE RULES */}
        <Section label="Nguyên tắc sử dụng">
          <div
            className="ui-card ui-card-lg"
            style={{
              lineHeight: "var(--lh-relaxed)",
              fontSize: "var(--text-base)",
              color: "var(--text-normal)",
            }}
          >
            <Rule icon="✅">Mọi text phải dùng 1 trong 8 size token ở trên.</Rule>
            <Rule icon="✅">
              Heading dùng Roboto, body dùng Arial, quote/manifesto dùng Playfair
              italic.
            </Rule>
            <Rule icon="✅">
              Chỉ 1 accent: <strong>brand-green</strong> cho mọi CTA. Fire
              orange CHỈ dùng trong Manifesto.
            </Rule>
            <Rule icon="✅">
              Spacing theo scale 4px (space-1..space-20). Không dùng số lẻ
              (13px, 17px, 22px…).
            </Rule>
            <Rule icon="❌">
              KHÔNG dùng inline <code>fontSize: 15</code> hay <code>padding: 22px</code>.
            </Rule>
            <Rule icon="❌">
              KHÔNG pick màu tuỳ tiện — tham chiếu palette trên.
            </Rule>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "var(--text-xs)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: "var(--fw-semibold)",
        marginBottom: "var(--space-4)",
      }}
    >
      {children}
    </div>
  );
}

function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--space-16)" }}>
      <Label>{label}</Label>
      {description && (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            marginBottom: "var(--space-5)",
            lineHeight: "var(--lh-relaxed)",
            marginTop: "calc(-1 * var(--space-2))",
          }}
        >
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

function FontSample({
  name,
  role,
  style,
  example,
}: {
  name: string;
  role: string;
  style?: React.CSSProperties;
  example: string;
}) {
  return (
    <div className="ui-card ui-card-lg">
      <div
        style={{
          fontSize: "var(--text-xs)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--text-muted)",
          fontWeight: "var(--fw-semibold)",
          marginBottom: "var(--space-2)",
        }}
      >
        {role}
      </div>
      <div
        style={{
          fontSize: "var(--text-xl)",
          color: "var(--text-heading)",
          marginBottom: "var(--space-2)",
          ...style,
        }}
      >
        {example}
      </div>
      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {name}
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "var(--space-3) var(--space-4)",
        fontSize: "var(--text-xs)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--text-muted)",
        fontWeight: "var(--fw-semibold)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "var(--space-3) var(--space-4)",
      }}
    >
      {children}
    </td>
  );
}

function Rule({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-3)",
        marginBottom: "var(--space-3)",
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
