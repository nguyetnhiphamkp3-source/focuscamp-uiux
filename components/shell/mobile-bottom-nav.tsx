"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotifBadge } from "./notif-badge";

export function MobileBottomNav({
  notifUnread = 0,
  profileHref = "/settings",
}: {
  notifUnread?: number;
  profileHref?: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const swipeStartX = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("mobile-drawer-open", drawerOpen);
    return () => {
      document.documentElement.classList.remove("mobile-drawer-open");
    };
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Swipe-left anywhere on screen closes the drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onStart = (e: TouchEvent) => { swipeStartX.current = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      if (swipeStartX.current - e.changedTouches[0].clientX > 48) setDrawerOpen(false);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [drawerOpen]);

  return (
    <>
      {drawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav className="mobile-bottom-nav" aria-label="Navigation chính">
        <Link
          href="/"
          className={`mobile-nav-item${pathname === "/" ? " active" : ""}`}
        >
          <span className="mobile-nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 2C10 6 6 9 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-1.7-.6-3.2-1.6-4.4C15 11.5 13 12 12 12c0-3 1-7 0-10z" />
            </svg>
          </span>
          <span className="mobile-nav-label">Home</span>
        </Link>

        <Link
          href="/discovery"
          className={`mobile-nav-item${pathname.startsWith("/discovery") ? " active" : ""}`}
        >
          <span className="mobile-nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </span>
          <span className="mobile-nav-label">Khám phá</span>
        </Link>

        <Link
          href="/inbox"
          className={`mobile-nav-item${pathname.startsWith("/inbox") ? " active" : ""}`}
        >
          <span className="mobile-nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <NotifBadge initial={notifUnread} />
          </span>
          <span className="mobile-nav-label">Thông báo</span>
        </Link>

        <Link
          href={profileHref}
          className={`mobile-nav-item${pathname.startsWith("/u/") || pathname === "/settings" ? " active" : ""}`}
        >
          <span className="mobile-nav-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </span>
          <span className="mobile-nav-label">Profile</span>
        </Link>

        <button
          type="button"
          className={`mobile-nav-item${drawerOpen ? " active" : ""}`}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? "Đóng menu" : "Mở menu"}
        >
          <span className="mobile-nav-icon">
            {drawerOpen ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            )}
          </span>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </nav>
    </>
  );
}
