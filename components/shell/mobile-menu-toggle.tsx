"use client";

import { useEffect, useState } from "react";

/**
 * Hamburger button for mobile (<768px). Adds class
 * `mobile-drawer-open` to document.documentElement → CSS reveals
 * the .left-section as an overlay drawer.
 */
export function MobileMenuToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("mobile-drawer-open", open);
    return () => {
      document.documentElement.classList.remove("mobile-drawer-open");
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        className="mobile-menu-btn"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
