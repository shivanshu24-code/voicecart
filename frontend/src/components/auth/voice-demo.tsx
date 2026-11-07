import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

const barHeights = [30, 55, 80, 45, 100, 65, 35, 85, 50, 95, 40, 70, 30, 60, 90, 45, 75, 35];

const order = (i: number) => ({ "--i": i }) as CSSProperties;

/** Decorative: a spoken sentence becoming shop details. CSS only, so no client JS. */
export async function VoiceDemo() {
  const t = await getTranslations("login.demo");

  const fields = [
    { label: t("shopLabel"), value: t("shopValue") },
    { label: t("hoursLabel"), value: t("hoursValue") },
    { label: t("productLabel"), value: t("productValue") },
  ];

  return (
    <figure aria-label={t("caption")} className="w-full max-w-md">
      <div aria-hidden className="voice-wave flex h-10 items-center gap-[5px]">
        {barHeights.map((height, i) => (
          <span
            key={i}
            className="voice-bar w-[2px] rounded-full bg-brand"
            style={{ ...order(i), height: `${height}%` }}
          />
        ))}
      </div>

      <p aria-hidden className="mt-8 font-display text-2xl leading-snug md:text-[1.7rem]">
        {t("spoken")
          .split(" ")
          .map((word, i) => (
            <span key={i} className="voice-word" style={order(i)}>
              {word}{" "}
            </span>
          ))}
      </p>

      <dl aria-hidden className="mt-10 border-t border-line">
        {fields.map(({ label, value }, i) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-6 border-b border-line py-3.5"
          >
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="voice-field text-right text-[0.95rem]" style={order(i)}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <figcaption className="mt-4 text-xs text-muted">{t("caption")}</figcaption>
    </figure>
  );
}
