"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotifBadge } from "./notif-badge";
import { Flame, Globe, Bell, User, ArrowLeft, Menu } from "lucide-react";

export function MobileBottomNav({
  notifUnread = 0,
  profileHref = "/settings",
}: {
  notifUnread?: number;
  profileHref?: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const swipeStart = useRef({ x: 0, y: 0 });

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

  // Swipe-right anywhere on screen closes the drawer (drawer opens from right)
  useEffect(() => {
    if (!drawerOpen) return;
    const onStart = (e: TouchEvent) => {
      swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - swipeStart.current.x;
      const dy = Math.abs(swipeStart.current.y - e.changedTouches[0].clientY);
      // Close only on clear horizontal right-swipe, not vertical scrolling
      if (dx > 48 && dx > dy) setDrawerOpen(false);
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
          <span className="mobile-nav-icon"><Flame size={22} /></span>
          <span className="mobile-nav-label">Home</span>
        </Link>

        <Link
          href="/discovery"
          className={`mobile-nav-item${pathname.startsWith("/discovery") ? " active" : ""}`}
        >
          <span className="mobile-nav-icon"><Globe size={22} /></span>
          <span className="mobile-nav-label">Khám phá</span>
        </Link>

        <Link
          href="/inbox"
          className={`mobile-nav-item${pathname.startsWith("/inbox") ? " active" : ""}`}
        >
          <span className="mobile-nav-icon">
            <Bell size={22} />
            <NotifBadge initial={notifUnread} />
          </span>
          <span className="mobile-nav-label">Thông báo</span>
        </Link>

        <Link
          href={profileHref}
          className={`mobile-nav-item${pathname.startsWith("/u/") || pathname === "/settings" ? " active" : ""}`}
        >
          <span className="mobile-nav-icon"><User size={22} /></span>
          <span className="mobile-nav-label">Profile</span>
        </Link>

        <button
          type="button"
          className={`mobile-nav-item${drawerOpen ? " active" : ""}`}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? "Đóng menu" : "Mở menu"}
        >
          <span className="mobile-nav-icon">
            {drawerOpen ? <ArrowLeft size={22} /> : <Menu size={22} />}
          </span>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </nav>
    </>
  );
}
