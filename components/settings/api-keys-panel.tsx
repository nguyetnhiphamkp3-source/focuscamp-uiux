"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createApiKeyAction,
  revokeApiKeyAction,
} from "@/app/actions/api-keys";
import { ConfirmModal } from "@/components/shared/confirm-modal";
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
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  owner: { id: string; name: string | null; handle: string | null; email: string | null } | null;
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
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [revealedPlain, setRevealedPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  function generate() {
    setErr(null);
    setRevealedPlain(null);
    start(async () => {
      const res = await createApiKeyAction({
        communityId,
        communitySlug,
        name: name.trim(),
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : null,
        scopes,
      });
      if (res.ok && res.data) {
        setRevealedPlain(res.data.plain);
        setName("");
        setExpiresInDays("");
        setScopes(["read"]);
        router.refresh();
      } else if (!res.ok) {
        setErr(res.reason);
      }
    });
  }

  function revoke(id: string) {
    setRevokeTargetId(id);
  }

  function toggleScope(scope: "write" | "admin", checked: boolean) {
    setScopes((current) => {
      const next = new Set(current);
      next.add("read");
      if (checked) {
        if (scope === "admin") next.add("write");
        next.add(scope);
      } else {
        next.delete(scope);
        if (scope === "write") next.delete("admin");
      }
      return Array.from(next);
    });
  }

  function confirmRevoke() {
    if (!revokeTargetId) return;
    const id = revokeTargetId;
    setRevokeTargetId(null);
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
      <ConfirmModal
        open={revokeTargetId !== null}
        title="Revoke API Key"
        message="Revoke key này? Hành động không thể undo."
        confirmLabel="Revoke"
        danger
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTargetId(null)}
      />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Quyền của key
            </span>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked disabled />
              <span>
                <strong>Read</strong> — xem community, posts, challenges, members, XP
              </span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "var(--text-sm)" }}>
              <input
                type="checkbox"
                checked={scopes.includes("write")}
                disabled={pending}
                onChange={(e) => toggleScope("write", e.target.checked)}
              />
              <span>
                <strong>Write</strong> — tạo/sửa content, duyệt submission, gửi notification
              </span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "var(--text-sm)" }}>
              <input
                type="checkbox"
                checked={scopes.includes("admin")}
                disabled={pending}
                onChange={(e) => toggleScope("admin", e.target.checked)}
              />
              <span>
                <strong>Admin</strong> — xoá post, quản lý member, course, community info
              </span>
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setName("");
                setExpiresInDays("");
                setScopes(["read"]);
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
            const ownerLabel = k.owner?.name || k.owner?.handle || k.owner?.email;
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
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {k.scopes.map((scope) => (
                      <span
                        key={scope}
                        style={{
                          padding: "2px 6px",
                          borderRadius: 6,
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-muted)",
                          fontSize: "var(--text-xs)",
                          textTransform: "uppercase",
                        }}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Tạo {k.createdAt.toLocaleDateString("vi-VN")}
                    {ownerLabel && <> · bởi {ownerLabel}</>}
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
