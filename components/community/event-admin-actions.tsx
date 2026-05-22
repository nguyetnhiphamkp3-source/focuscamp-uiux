"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEventAction, deleteEventAction } from "@/app/actions/event";

type EventData = {
  id: string;
  type: "ONE_ON_ONE" | "GROUP_LIVE" | "WORKSHOP";
  title: string;
  description: string | null;
  startsAt: string; // ISO
  durationMin: number;
  capacity: number;
  priceVnd: number;
  meetingUrl: string | null;
  bannerUrl: string | null;
};

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventAdminActions({
  event,
  communitySlug,
}: {
  event: EventData;
  communitySlug: string;
}) {
  const router = useRouter();
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [type, setType] = useState(event.type);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [startsAt, setStartsAt] = useState(toLocalDatetimeInput(event.startsAt));
  const [durationMin, setDurationMin] = useState(String(event.durationMin));
  const [capacity, setCapacity] = useState(String(event.capacity));
  const [priceVnd, setPriceVnd] = useState(String(event.priceVnd));
  const [meetingUrl, setMeetingUrl] = useState(event.meetingUrl ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    if (!title.trim() || !startsAt) {
      setErr("Cần tên + thời gian bắt đầu");
      return;
    }
    start(async () => {
      const res = await updateEventAction({
        eventId: event.id,
        communitySlug,
        type,
        title: title.trim(),
        description: description.trim(),
        startsAt: new Date(startsAt).toISOString(),
        durationMin: parseInt(durationMin, 10) || 60,
        capacity: parseInt(capacity, 10) || 1,
        priceVnd: parseInt(priceVnd, 10) || 0,
        meetingUrl: meetingUrl.trim(),
      });
      if (res.ok) {
        setOpenEdit(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function confirmDelete() {
    setErr(null);
    start(async () => {
      const res = await deleteEventAction({ eventId: event.id, communitySlug });
      if (res.ok) {
        router.push(`/c/${communitySlug}/events`);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setOpenEdit(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            color: "var(--interactive-normal)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          ✏️ Sửa
        </button>
        <button
          type="button"
          onClick={() => setOpenDelete(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--danger)",
            background: "transparent",
            color: "var(--danger)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          🗑 Xóa
        </button>
      </div>

      {openEdit && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpenEdit(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 540,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--header-primary)",
              }}
            >
              Sửa Event
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Loại">
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)} disabled={pending} style={inputStyle}>
                  <option value="GROUP_LIVE">🎤 Group live (nhiều người)</option>
                  <option value="ONE_ON_ONE">👤 1-on-1 (capacity = 1)</option>
                  <option value="WORKSHOP">🎓 Workshop</option>
                </select>
              </Field>
              <Field label="Tiêu đề *">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={pending} style={inputStyle} />
              </Field>
              <Field label="Mô tả (tuỳ chọn)">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} disabled={pending} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Thời gian bắt đầu *">
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={pending} style={inputStyle} />
                </Field>
                <Field label="Thời lượng (phút)">
                  <input type="number" min={5} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} disabled={pending} style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Capacity">
                  <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} disabled={pending} style={inputStyle} />
                </Field>
                <Field label="Giá (VND, 0=free)">
                  <input type="number" min={0} step={1000} value={priceVnd} onChange={(e) => setPriceVnd(e.target.value)} disabled={pending} style={inputStyle} />
                </Field>
              </div>
              <Field label="Meeting URL (Zoom / Meet — tuỳ chọn)">
                <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} disabled={pending} placeholder="https://zoom.us/j/..." style={inputStyle} />
              </Field>
            </div>
            {err && (
              <div style={{ padding: "0 24px 8px", color: "var(--danger)", fontSize: "var(--text-sm)" }}>{err}</div>
            )}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
              <button type="button" onClick={() => !pending && setOpenEdit(false)} disabled={pending} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--interactive-normal)", cursor: "pointer" }}>
                Huỷ
              </button>
              <button type="button" onClick={submit} disabled={pending} style={{ marginLeft: "auto", padding: "10px 22px", borderRadius: 8, border: "none", background: "var(--brand-green)", color: "#fff", fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}>
                {pending ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {openDelete && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpenDelete(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--bg-floating)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle)",
              maxWidth: 440,
              width: "100%",
              padding: 24,
            }}
          >
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--header-primary)", marginBottom: 8 }}>
              Xóa event này?
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Tất cả booking liên quan cũng sẽ bị xóa. Hành động không thể hoàn tác.
            </div>
            {err && (
              <div style={{ color: "var(--danger)", fontSize: "var(--text-sm)", marginBottom: 12 }}>{err}</div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => !pending && setOpenDelete(false)} disabled={pending} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--interactive-normal)", cursor: "pointer" }}>
                Huỷ
              </button>
              <button type="button" onClick={confirmDelete} disabled={pending} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}>
                {pending ? "Đang xóa…" : "Xóa event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
};
