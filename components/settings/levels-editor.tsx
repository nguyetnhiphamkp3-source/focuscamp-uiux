"use client";

import { useState, useTransition } from "react";
import { updateLevelsAction } from "@/app/actions/community-settings";
import type { LevelTier } from "@/lib/community-config";
import {
  inputStyle,
  btnDanger,
  rowCard,
  ErrorBox,
  SuccessBox,
  SectionHeader,
  EditorToolbar,
} from "./editor-shared";

export function LevelsEditor({
  communityId,
  communitySlug,
  initial,
  disabled = false,
}: {
  communityId: string;
  communitySlug: string;
  initial: LevelTier[];
  disabled?: boolean;
}) {
  const [items, setItems] = useState<LevelTier[]>(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<LevelTier>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }
  function remove(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function add() {
    const nextMin = items.length
      ? Math.max(...items.map((t) => t.minLevel)) + 1
      : 0;
    setItems((arr) => [...arr, { minLevel: nextMin, name: "", emoji: "" }]);
    setSaved(false);
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateLevelsAction({
        communityId,
        communitySlug,
        tiers: items,
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
        title="Level tiers"
        subtitle="Chia level thành các bậc có tên (vd: Novice 0-99, Apprentice 100-299…). User ở level X sẽ thuộc bậc có minLevel cao nhất ≤ X."
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
          Chưa có bậc nào. Bấm “+ Thêm” để tạo bậc đầu tiên.
        </div>
      )}

      {items.map((t, i) => (
        <div key={i} style={rowCard}>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={t.minLevel}
            onChange={(e) =>
              update(i, { minLevel: Math.max(0, parseInt(e.target.value) || 0) })
            }
            style={{ ...inputStyle, flex: "0 0 100px" }}
            disabled={disabled || pending}
          />
          <input
            type="text"
            placeholder="Tên bậc (vd: Novice)"
            value={t.name}
            onChange={(e) => update(i, { name: e.target.value })}
            style={{ ...inputStyle, flex: "1 1 160px" }}
            disabled={disabled || pending}
          />
          <input
            type="text"
            placeholder="Emoji"
            value={t.emoji ?? ""}
            onChange={(e) => update(i, { emoji: e.target.value })}
            style={{ ...inputStyle, flex: "0 0 70px", textAlign: "center" }}
            maxLength={4}
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
