"use client";

import { useState, useTransition } from "react";
import { updateClassesAction } from "@/app/actions/community-settings";
import type { ClassConfig } from "@/lib/community-config";
import {
  inputStyle,
  btnDanger,
  ErrorBox,
  SuccessBox,
  SectionHeader,
  EditorToolbar,
} from "./editor-shared";

export function ClassesEditor({
  communityId,
  communitySlug,
  initial,
  disabled = false,
}: {
  communityId: string;
  communitySlug: string;
  initial: ClassConfig[];
  disabled?: boolean;
}) {
  const [items, setItems] = useState<ClassConfig[]>(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<ClassConfig>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }
  function remove(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function add() {
    setItems((arr) => [...arr, { key: "", label: "", emoji: "", description: "" }]);
    setSaved(false);
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateClassesAction({
        communityId,
        communitySlug,
        classes: items,
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
        title="Classes"
        subtitle="Các class/vai trò thành viên có thể chọn khi tham gia cộng đồng (vd: Hustler, Strategist…)."
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
          Chưa có class nào. Bấm “+ Thêm” để tạo class đầu tiên.
        </div>
      )}

      {items.map((c, i) => (
        <div
          key={i}
          className="settings-taxonomy-row settings-taxonomy-row--classes"
        >
          <div className="settings-taxonomy-row-head settings-taxonomy-row-head--classes">
            <input
              type="text"
              placeholder="key (vd: hustler)"
              value={c.key}
              onChange={(e) => update(i, { key: e.target.value.toLowerCase() })}
              className="settings-taxonomy-input settings-taxonomy-input--key"
              style={inputStyle}
              disabled={disabled || pending}
            />
            <input
              type="text"
              placeholder="Label hiển thị"
              value={c.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="settings-taxonomy-input settings-taxonomy-input--label"
              style={inputStyle}
              disabled={disabled || pending}
            />
            <input
              type="text"
              placeholder="Emoji"
              value={c.emoji ?? ""}
              onChange={(e) => update(i, { emoji: e.target.value })}
              className="settings-taxonomy-input settings-taxonomy-input--emoji"
              style={{ ...inputStyle, textAlign: "center" }}
              maxLength={4}
              disabled={disabled || pending}
            />
            <button
              className="settings-taxonomy-delete"
              type="button"
              onClick={() => remove(i)}
              style={btnDanger}
              disabled={disabled || pending}
            >
              Xoá
            </button>
          </div>
          <input
            type="text"
            placeholder="Mô tả ngắn (tuỳ chọn — hiển thị khi user chọn class)"
            value={c.description ?? ""}
            onChange={(e) => update(i, { description: e.target.value })}
            className="settings-taxonomy-input"
            style={inputStyle}
            disabled={disabled || pending}
          />
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
