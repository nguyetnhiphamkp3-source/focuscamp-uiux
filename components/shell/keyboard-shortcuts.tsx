"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts. Mount once in the root shell layout.
 *
 * Registered keys:
 *   ⌘K / Ctrl+K    → /search
 *   g then h       → / (home)
 *   g then i       → /inbox
 *   g then d       → /discovery
 *   ?              → placeholder for future shortcut cheat-sheet
 *
 * Bindings are skipped when the user is typing in an input/textarea so
 * typing 'g' in a comment never triggers nav.
 */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gMode = false;
    let gModeTimer: number | null = null;

    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e.target)) return;

      // ⌘K / Ctrl+K — open search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
        return;
      }

      // Two-key sequences starting with 'g'
      if (gMode) {
        gMode = false;
        if (gModeTimer) window.clearTimeout(gModeTimer);
        if (e.key === "h") {
          e.preventDefault();
          router.push("/");
          return;
        }
        if (e.key === "i") {
          e.preventDefault();
          router.push("/inbox");
          return;
        }
        if (e.key === "d") {
          e.preventDefault();
          router.push("/discovery");
          return;
        }
        return;
      }
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gMode = true;
        // Expire the 'g' mode after 900ms so stray presses don't pile up
        if (gModeTimer) window.clearTimeout(gModeTimer);
        gModeTimer = window.setTimeout(() => {
          gMode = false;
          gModeTimer = null;
        }, 900);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (gModeTimer) window.clearTimeout(gModeTimer);
    };
  }, [router]);

  return null;
}
