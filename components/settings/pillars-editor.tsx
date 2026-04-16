"use client";

import { useState, useTransition } from "react";
import { updatePillarsAction } from "@/app/actions/community-settings";
import type { PillarConfig } from "@/lib/community-config";
import {
  inputStyle,
  btnDanger,
  rowCard,
  ErrorBox,
  SuccessBox,
  SectionHeader,
  EditorToolbar,
} from "./editor-shared";

export function PillarsEditor({
  communityId,
  communitySlug,
  initial,
  disabled = false,
}: {
  communityId: string;
  communitySlug: string;
  initial: PillarConfig[];
  disabled?: boolean;
}) {
  const [items, setItems] = useState<PillarConfig[]>(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<PillarConfig>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }
  function remove(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function add() {
    setItems((arr) => [...arr, { key: "", label: "", emoji: "" }]);
    setSaved(false);
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updatePillarsAction({
        communityId,
        communitySlug,
        pillars: items,
      });
      if (res.ok) setSaved(true);
      else setErr(res.reason);
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)", opacity: disabled ? 0.5 : 1 }}
    >
      <SectionHeader
        title="Pillars"
        subtitle="Các trụ cột / chủ đề chính mà thành viên có thể tag khi đăng bài (tối đa 20)."
      />

      {items.length === 0 && (
        <div
          style={{
            padding: 14,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: 8,
          }}
        >
          Chưa có pillar nào. Bấm “+ Thêm” để tạo pillar đầu tiên.
        </div>
      )}

      {items.map((p, i) => (
        <div key={i} style={rowCard}>
          <input
            type="text"
            placeholder="key (vd: offer)"
            value={p.key}
            onChange={(e) => update(i, { key: e.target.value.toLowerCase() })}
            style={{ ...inputStyle, flex: "0 0 140px" }}
            disabled={disabled || pending}
          />
          <input
            type="text"
            placeholder="Label hiển thị"
            value={p.label}
            onChange={(e) => update(i, { label: e.target.value })}
            style={{ ...inputStyle, flex: "1 1 160px" }}
            disabled={disabled || pending}
          />
          <input
            type="text"
            placeholder="Emoji"
            value={p.emoji ?? ""}
            onChange={(e) => update(i, { emoji: e.target.value })}
            style={{ ...inputStyle, flex: "0 0 70px", textAlign: "center" }}
            maxLength={4}
            disabled={disabled || pending}
          />
          <input
            type="text"
            placeholder="CSS class (tuỳ chọn)"
            value={p.cssClass ?? ""}
            onChange={(e) => update(i, { cssClass: e.target.value })}
            style={{ ...inputStyle, flex: "0 0 180px" }}
            disabled={disabled || pending}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            style={btnDanger}
            disabled={disabled || pending}
          >
            Xoá
          </button>
        </div>
      ))}

      {!disabled && (
        <EditorToolbar
          canSave={items.length > 0 || initial.length > 0}
          pending={pending}
          onAdd={add}
          onSubmit={submit}
        />
      )}

      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
