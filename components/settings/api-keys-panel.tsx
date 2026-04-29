"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createApiKeyAction,
  revokeApiKeyAction,
} from "@/app/actions/api-keys";
import {
  inputStyle,
  btnPrimary,
  btnSecondary,
  btnDanger,
  ErrorBox,
  SectionHeader,
} from "./editor-shared";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export function ApiKeysPanel({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: ApiKeyRow[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [revealedPlain, setRevealedPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setErr(null);
    setRevealedPlain(null);
    start(async () => {
      const res = await createApiKeyAction({
        communityId,
        communitySlug,
        name: name.trim(),
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : null,
      });
      if (res.ok && res.data) {
        setRevealedPlain(res.data.plain);
        setName("");
        setExpiresInDays("");
        router.refresh();
      } else if (!res.ok) {
        setErr(res.reason);
      }
    });
  }

  function revoke(id: string) {
    if (!confirm("Revoke key này? Hành động không thể undo.")) return;
    start(async () => {
      const res = await revokeApiKeyAction({
        communityId,
        communitySlug,
        apiKeyId: id,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function copy() {
    if (!revealedPlain) return;
    navigator.clipboard.writeText(revealedPlain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="API Keys (MCP)"
        subtitle="Key cho phép agent ngoài (vd goclaw.sh) đọc + thực thi action trên cộng đồng này. Plaintext chỉ hiện 1 lần — nhớ copy lưu chỗ an toàn."
      />

      {revealedPlain && (
        <div
          style={{
            padding: 14,
            background: "rgba(27,158,117,0.08)",
            border: "1px solid var(--brand-green)",
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--brand-green)",
              marginBottom: 6,
            }}
          >
            🔑 Key vừa tạo — copy ngay, không hiện lại được
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: "var(--bg-chat)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: "var(--text-sm)",
              wordBreak: "break-all",
            }}
          >
            <code style={{ flex: 1 }}>{revealedPlain}</code>
            <button type="button" onClick={copy} style={btnSecondary}>
              {copied ? "✓ Đã copy" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {!showCreate && !revealedPlain && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={btnPrimary}
        >
          + Tạo API key mới
        </button>
      )}

      {showCreate && !revealedPlain && (
        <div
          style={{
            padding: 14,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            marginBottom: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Tên key (để bạn nhớ)
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={pending}
              placeholder="vd: Goclaw production"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Hết hạn (ngày, để trống = vĩnh viễn)
            </span>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min={1}
              max={365 * 5}
              disabled={pending}
              placeholder="365"
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setName("");
                setExpiresInDays("");
                setErr(null);
              }}
              disabled={pending}
              style={btnSecondary}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={pending || !name.trim()}
              style={{
                ...btnPrimary,
                marginLeft: "auto",
                opacity: pending || !name.trim() ? 0.6 : 1,
              }}
            >
              {pending ? "Đang tạo…" : "Tạo key"}
            </button>
          </div>
        </div>
      )}

      <ErrorBox msg={err} />

      {initial.length === 0 ? (
        <div
          style={{
            padding: 16,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            textAlign: "center",
            border: "1px dashed var(--border-subtle)",
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          Chưa có API key nào.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {initial.map((k) => {
            const revoked = !!k.revokedAt;
            const expired = k.expiresAt && k.expiresAt < new Date();
            return (
              <div
                key={k.id}
                style={{
                  padding: "10px 12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: revoked || expired ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--header-primary)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {k.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {k.keyPrefix}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Tạo {k.createdAt.toLocaleDateString("vi-VN")}
                    {k.lastUsedAt && (
                      <> · Last used {k.lastUsedAt.toLocaleString("vi-VN")}</>
                    )}
                    {k.expiresAt && (
                      <> · Hết hạn {k.expiresAt.toLocaleDateString("vi-VN")}</>
                    )}
                    {revoked && (
                      <span style={{ color: "var(--danger)" }}> · Revoked</span>
                    )}
                  </div>
                </div>
                {!revoked && (
                  <button
                    type="button"
                    onClick={() => revoke(k.id)}
                    disabled={pending}
                    style={btnDanger}
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
