"use client";

import { useEffect } from "react";

/**
 * Fades products in as they scroll into view. Only items below the fold are
 * ever hidden, and only once this has run, so nothing can get stuck invisible.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.remove("reveal-wait");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );

    for (const item of document.querySelectorAll(".reveal")) {
      if (item.getBoundingClientRect().top < window.innerHeight) continue;
      item.classList.add("reveal-wait");
      observer.observe(item);
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
