"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createShop } from "@/app/actions";

const categories = ["grocery", "clothing", "electronics", "bakery", "other"] as const;

const fieldClass = "mt-1 w-full rounded-md border border-line bg-card px-3 py-2";

export function CreateShopForm({ disabled }: { disabled: boolean }) {
  const t = useTranslations("dashboard.create");
  const category = useTranslations("categories");
  const [state, action, pending] = useActionState(createShop, { failed: false });

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">
        {t("name")}
        <input
          name="name"
          required
          maxLength={120}
          placeholder={t("namePlaceholder")}
          className={`${fieldClass} font-normal`}
        />
      </label>
      <label className="block text-sm font-medium">
        {t("category")}
        <select name="category" defaultValue="grocery" className={`${fieldClass} font-normal`}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {category(value)}
            </option>
          ))}
        </select>
      </label>

      {state.failed && (
        <p role="alert" className="text-sm text-accent">
          {t("failed")}
        </p>
      )}
      {disabled && <p className="text-sm text-muted">{t("previewDisabled")}</p>}

      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-paper transition-colors hover:bg-brand-dark disabled:opacity-40"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
