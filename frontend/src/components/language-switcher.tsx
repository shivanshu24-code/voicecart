"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { localeLabels, locales } from "@/i18n/config";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("language")} className="inline-flex gap-4 text-sm">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() => startTransition(() => setLocale(locale))}
          className={`border-b pb-0.5 transition-colors ${
            locale === current
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
