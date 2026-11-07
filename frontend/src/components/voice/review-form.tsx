"use client";

import { Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { completeSetup } from "@/app/voice-actions";
import { ProductFields } from "@/components/products/product-fields";
import { blankDraft, draftFromProduct, payloadFromDraft, type ProductDraft } from "@/lib/product-draft";
import type { Hour, Profile } from "@/lib/voice-types";

const categories = ["grocery", "clothing", "electronics", "bakery", "other"] as const;
const PHONE = "\\+?[0-9]{10,15}";
const input = "w-full rounded-md border border-line bg-card px-3 py-2";

const blankToNull = (value: string) => value.trim() || null;

type Props = { sessionId: string; profile: Profile; onBack: () => void };

/** Nothing is saved to the shop until the owner confirms it here. */
export function ReviewForm({ sessionId, profile, onBack }: Props) {
  const t = useTranslations("setup");
  const category = useTranslations("categories");
  const locale = useLocale();
  const router = useRouter();

  const [shop, setShop] = useState(profile);
  const [products, setProducts] = useState(() => profile.products.map(draftFromProduct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayName = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
      Date.UTC(2023, 0, 1 + day),
    );

  const setText = (field: "name" | "description" | "phone" | "whatsapp" | "address", value: string) =>
    setShop((current) => ({ ...current, [field]: value }));

  const setProduct = (index: number, update: (current: ProductDraft) => ProductDraft) =>
    setProducts((current) => current.map((product, i) => (i === index ? update(product) : product)));

  const groups = [...new Set(products.flatMap((product) => product.category.trim() || []))];

  const setHour = (index: number, patch: Partial<Hour>) =>
    setShop((current) => ({
      ...current,
      hours: current.hours.map((hour, i) => (i === index ? { ...hour, ...patch } : hour)),
    }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shop.phone?.trim() && !shop.whatsapp?.trim()) {
      setError("contact");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await completeSetup(sessionId, {
      ...shop,
      description: blankToNull(shop.description ?? ""),
      phone: blankToNull(shop.phone ?? ""),
      whatsapp: blankToNull(shop.whatsapp ?? ""),
      address: blankToNull(shop.address ?? ""),
      products: products.map(payloadFromDraft),
      hours: shop.hours.map((hour) =>
        hour.is_closed ? { ...hour, open_time: null, close_time: null } : hour,
      ),
    });

    if (result.ok) {
      router.push(`/dashboard/shops/${result.data.shopId}/publish`);
    } else {
      setSaving(false);
      setError("failed");
    }
  }

  const label = "block text-sm text-muted";
  const field = "mt-1.5 text-base text-ink";

  return (
    <form onSubmit={submit} className="mt-8 max-w-3xl space-y-10 border-t border-line pt-8">
      <div>
        <h2 className="font-display text-2xl">{t("reviewTitle")}</h2>
        <p className="mt-2 text-muted">{t("reviewBody")}</p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          {t("fields.name")}
          <input required maxLength={120} value={shop.name ?? ""} onChange={(e) => setText("name", e.target.value)} className={`${input} ${field}`} />
        </label>
        <label className={label}>
          {t("fields.category")}
          <select
            required
            value={shop.category ?? ""}
            onChange={(e) => setShop({ ...shop, category: e.target.value as Profile["category"] })}
            className={`${input} ${field}`}
          >
            <option value="" disabled />
            {categories.map((value) => (
              <option key={value} value={value}>
                {category(value)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("fields.phone")}
          <input type="tel" pattern={PHONE} value={shop.phone ?? ""} onChange={(e) => setText("phone", e.target.value)} className={`${input} ${field}`} />
        </label>
        <label className={label}>
          {t("fields.whatsapp")}
          <input type="tel" pattern={PHONE} value={shop.whatsapp ?? ""} onChange={(e) => setText("whatsapp", e.target.value)} className={`${input} ${field}`} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("fields.address")}
          <input maxLength={500} value={shop.address ?? ""} onChange={(e) => setText("address", e.target.value)} className={`${input} ${field}`} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("fields.description")}
          <textarea rows={3} maxLength={2000} value={shop.description ?? ""} onChange={(e) => setText("description", e.target.value)} className={`${input} ${field}`} />
        </label>
      </section>

      <section>
        <h3 className="font-medium">{t("fields.products")}</h3>
        <ul className="mt-3 space-y-4">
          {products.map((product, i) => (
            <li key={i} className="relative rounded-md border border-line bg-card p-4">
              <button
                type="button"
                aria-label={t("remove")}
                onClick={() => setProducts(products.filter((_, index) => index !== i))}
                className="absolute top-2 right-2 p-1.5 text-muted hover:text-ink"
              >
                <X aria-hidden size={16} strokeWidth={1.5} />
              </button>
              <ProductFields
                value={product}
                onChange={(update) => setProduct(i, update)}
                shopKind={shop.category ?? "other"}
                groups={groups}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setProducts([...products, blankDraft])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand underline-offset-4 hover:underline"
        >
          <Plus aria-hidden size={15} strokeWidth={1.5} />
          {t("addProduct")}
        </button>
      </section>

      <section>
        <h3 className="font-medium">{t("fields.hours")}</h3>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {shop.hours.map((hour, i) => (
            <li key={`${hour.day_of_week}-${hour.slot}`} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-28 text-sm">{dayName(hour.day_of_week)}</span>
              <input aria-label={t("opens")} type="time" required={!hour.is_closed} disabled={hour.is_closed} value={hour.open_time ?? ""} onChange={(e) => setHour(i, { open_time: e.target.value })} className="rounded-md border border-line bg-card px-2 py-1.5 disabled:opacity-40" />
              <input aria-label={t("closes")} type="time" required={!hour.is_closed} disabled={hour.is_closed} value={hour.close_time ?? ""} onChange={(e) => setHour(i, { close_time: e.target.value })} className="rounded-md border border-line bg-card px-2 py-1.5 disabled:opacity-40" />
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={hour.is_closed} onChange={(e) => setHour(i, { is_closed: e.target.checked })} />
                {t("closed")}
              </label>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {t(`errors.${error}`)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2.5 font-medium text-paper transition-colors hover:bg-brand-dark disabled:opacity-40">
          {saving ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={onBack} className="px-3 py-2.5 text-sm text-muted hover:text-ink">
          {t("keepTalking")}
        </button>
      </div>
    </form>
  );
}
