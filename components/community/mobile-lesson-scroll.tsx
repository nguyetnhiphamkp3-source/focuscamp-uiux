"use client";

import { useEffect } from "react";

export function MobileLessonScroll() {
  useEffect(() => {
    const el = document.querySelector(".mobile-lesson-pill.active");
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  return null;
}
