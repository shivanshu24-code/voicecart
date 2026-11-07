"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { openStatus } from "@/lib/opening";
import { formatTime, type StorefrontHour } from "@/lib/storefront";

const REFRESH_MS = 30_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, REFRESH_MS);
  return () => clearInterval(timer);
}

const currentMinute = () => Math.floor(Date.now() / 60_000);

type Props = { hours: StorefrontHour[]; timeZone: string; className?: string };

/** Worked out in the browser, so a cached or long-open page still tells the truth. */
export function OpenStatusLabel({ hours, timeZone, className = "" }: Props) {
  const t = useTranslations("storefront");
  const locale = useLocale();
  const minute = useSyncExternalStore(subscribe, currentMinute, () => null);
  if (minute === null) return null;

  const status = openStatus(hours, new Date(minute * 60_000), timeZone);
  if (!status) return null;

  const dayName = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
      Date.UTC(2023, 0, 1 + day),
    );

  const text = status.open
    ? t("openUntil", { time: formatTime(status.until) })
    : status.opensIn === "today"
      ? t("opensToday", { time: formatTime(status.opensAt) })
      : status.opensIn === "tomorrow"
        ? t("opensTomorrow", { time: formatTime(status.opensAt) })
        : t("opensOn", { day: dayName(status.day), time: formatTime(status.opensAt) });

  return (
    <p className={`flex items-center gap-2 text-sm ${className}`}>
      <span aria-hidden className={`size-2 rounded-full ${status.open ? "bg-[#4caf7a]" : "bg-[#d9a441]"}`} />
      <span>
        <span className="font-medium">{status.open ? t("openNow") : t("closedNow")}</span>
        <span className="opacity-75"> · {text}</span>
      </span>
    </p>
  );
}
