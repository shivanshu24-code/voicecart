"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

const arrow =
  "absolute top-1/3 z-[3] hidden size-10 items-center justify-center rounded-full border border-(--t-line) bg-(--t-surface) shadow-sm md:flex";

/** A sideways row of products. Phones swipe; computers also get arrows. */
export function ShelfRow({ count, children }: { count: number; children: ReactNode }) {
  const t = useTranslations("storefront");
  const row = useRef<HTMLUListElement>(null);
  // Four cards fit across a computer screen, so fewer never need arrows.
  const hasArrows = count > 4;
  const move = (direction: number) =>
    row.current?.scrollBy({ left: direction * row.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      {hasArrows && (
        <button type="button" aria-label={t("previous")} onClick={() => move(-1)} className={`${arrow} -left-4`}>
          <ChevronLeft aria-hidden size={18} strokeWidth={1.5} />
        </button>
      )}
      <ul ref={row} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
        {children}
      </ul>
      {hasArrows && (
        <button type="button" aria-label={t("next")} onClick={() => move(1)} className={`${arrow} -right-4`}>
          <ChevronRight aria-hidden size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
