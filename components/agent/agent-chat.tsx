"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { renderMarkdown } from "@/lib/markdown";

interface InitialMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export function AgentChat({
  communityId,
  conversationId: initialConvId,
  initialMessages,
}: {
  communityId: string;
  conversationId: string | null;
  initialMessages: InitialMessage[];
}) {
  const [conversationId, setConversationId] = useState<string | null>(initialConvId);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
        body: () => ({ communityId, conversationId }),
      }),
    [communityId, conversationId],
  );

  const initialUiMessages = useMemo(
    () =>
      initialMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        })),
    [initialMessages],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialUiMessages,
    onFinish: ({ message }) => {
      // Pick up server-assigned conversation id if first round
      const headers = (
        message as unknown as { headers?: Headers }
      ).headers;
      if (!conversationId && headers) {
        const id = headers.get("x-conversation-id");
        if (id) setConversationId(id);
      }
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--bg-chat)",
      }}
    >
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              maxWidth: 460,
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
            <div style={{ color: "var(--header-primary)", fontWeight: 700, marginBottom: 4 }}>
              Bắt đầu chat với AI Agent của cộng đồng
            </div>
            <div>Hỏi về challenge, kế hoạch, hoặc bất kỳ điều gì cần hỗ trợ.</div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 12,
                background: isUser ? "var(--brand-green)" : "var(--bg-card)",
                color: isUser ? "#fff" : "var(--text-normal)",
                fontSize: "var(--text-base)",
                lineHeight: 1.5,
                boxShadow: isUser
                  ? "0 1px 4px rgba(27,158,117,0.2)"
                  : "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {isUser ? (
                <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
              ) : text ? (
                <AgentMarkdown content={text} />
              ) : (
                isStreaming ? "▍" : ""
              )}
            </div>
          );
        })}

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(218,55,60,0.08)",
              color: "var(--danger)",
              borderRadius: 8,
              fontSize: "var(--text-sm)",
            }}
          >
            ⚠ {error.message || "Có lỗi xảy ra"}
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        style={{
          padding: "12px var(--space-4)",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder="Nhập câu hỏi cho Agent…"
          style={{
            flex: 1,
            padding: "11px 14px",
            borderRadius: 10,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-chat)",
            color: "var(--text-normal)",
            fontSize: "var(--text-base)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          style={{
            padding: "11px 20px",
            borderRadius: 10,
            border: "none",
            background: input.trim() && !isStreaming
              ? "var(--brand-green)"
              : "var(--bg-modifier-hover)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isStreaming ? "…" : "Gửi"}
        </button>
      </form>
    </div>
  );
}

function AgentMarkdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className="md-content agent-md"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
