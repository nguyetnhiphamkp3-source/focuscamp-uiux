"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction } from "@/app/actions/chat";

interface Props {
  channelId: string;
  communitySlug: string;
  channelSlug: string;
  placeholder?: string;
}

export function ChatInput({ channelId, communitySlug, channelSlug, placeholder }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const content = inputRef.current?.value?.trim();
    if (!content || pending) return;

    const formData = new FormData(form);
    startTransition(async () => {
      await sendMessageAction(formData);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="chat-input-wrapper" data-view-part="chat">
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="channelId" value={channelId} />
        <input type="hidden" name="communitySlug" value={communitySlug} />
        <input type="hidden" name="channelSlug" value={channelSlug} />
        <div className="chat-input">
          <div className="plus-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            name="content"
            placeholder={placeholder}
            required
            autoComplete="off"
            disabled={pending}
            style={{
              flex: 1,
              background: "transparent",
              outline: "none",
              border: "none",
              fontSize: "var(--text-base)",
              color: "var(--text-normal)",
              fontFamily: "inherit",
              opacity: pending ? 0.6 : 1,
            }}
          />
          <button
            type="submit"
            className="ui-btn ui-btn-primary ui-btn-sm"
            disabled={pending}
          >
            {pending ? "..." : "Gửi"}
          </button>
        </div>
      </form>
    </div>
  );
}
