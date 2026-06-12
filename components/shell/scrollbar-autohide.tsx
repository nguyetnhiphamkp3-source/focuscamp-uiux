"use client";

import { useEffect } from "react";

/**
 * Reveals a scrollbar only on the element actually being scrolled: adds
 * `is-scrolling` to that element while it scrolls and removes it shortly after
 * it stops. Other elements keep their scrollbars hidden (see globals.css).
 */
export function ScrollbarAutohide() {
  useEffect(() => {
    const timers = new WeakMap<Element, number>();

    const onScroll = (e: Event) => {
      // For document/window scrolls the target is `document`; use the root element.
      const node: Element | null =
        e.target instanceof Element
          ? e.target
          : document.scrollingElement || document.documentElement;
      if (!node) return;

      node.classList.add("is-scrolling");
      const prev = timers.get(node);
      if (prev) window.clearTimeout(prev);
      timers.set(
        node,
        window.setTimeout(() => node.classList.remove("is-scrolling"), 700)
      );
    };

    // capture: true so it catches scrolls on any nested scroll container.
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () =>
      window.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  return null;
}
