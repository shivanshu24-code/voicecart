"use client";

import { Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { saveShopProfile } from "@/app/publish-actions";
import type { ShopKind } from "@/components/products/product-fields";
import type { Hour } from "@/lib/voice-types";

const categories = ["grocery", "clothing", "electronics", "bakery", "other"] as const;
const PHONE = "\\+?[0-9]{10,15}";
const MAX_SLOTS = 4;
// Monday first, as the storefront shows it.
const week = [1, 2, 3, 4, 5, 6, 0];

const input = "mt-1.5 h-11 w-full rounded-md border border-line bg-card px-3 text-base text-ink";
const label = "block text-sm text-muted";
const timeInput = "h-10 rounded-md border border-line bg-card px-2 text-ink";

type Slot = { open: string; close: string };
type Day = { day: number; closed: boolean; slots: Slot[] };

export type ShopDetails = {
  name: string;
  category: ShopKind;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
};

const blankSlot: Slot = { open: "09:00", close: "21:00" };
// The database stores 09:00:00, while time inputs use 09:00.
const shortTime = (time: string | null) => time?.slice(0, 5) ?? "";

/** A day nobody has set yet starts closed, and saving confirms what's shown. */
function toDays(hours: Hour[]): Day[] {
  return week.map((day) => {
    const rows = hours
      .filter((hour) => hour.day_of_week === day && !hour.is_closed)
      .sort((a, b) => a.slot - b.slot);
    return {
      day,
      closed: rows.length === 0,
      slots: rows.length
        ? rows.map((row) => ({ open: shortTime(row.open_time), close: shortTime(row.close_time) }))
        : [blankSlot],
    };
  });
}

function toHours(days: Day[]): Hour[] {
  return days.flatMap<Hour>(({ day, closed, slots }) =>
    closed
      ? [{ day_of_week: day, slot: 0, open_time: null, close_time: null, is_closed: true }]
      : slots.map((slot, index) => ({
          day_of_week: day,
          slot: index,
          open_time: slot.open,
          close_time: slot.close,
          is_closed: false,
        })),
  );
}

const blankToNull = (value: string) => value.trim() || null;

type Props = { shopId: string; shop: ShopDetails; hours: Hour[] };

export function ShopDetailsForm({ shopId, shop, hours }: Props) {
  const t = useTranslations("details");
  const category = useTranslations("categories");
  const locale = useLocale();

  const [fields, setFields] = useState({
    name: shop.name,
    category: shop.category,
    description: shop.description ?? "",
    phone: shop.phone ?? "",
    whatsapp: shop.whatsapp ?? "",
    address: shop.address ?? "",
  });
  const [days, setDays] = useState(() => toDays(hours));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "failed" | "incomplete" | "times" | null>(null);

  const dayName = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
      Date.UTC(2023, 0, 1 + day),
    );

  const edit = (patch: Partial<typeof fields>) => {
    setStatus(null);
    setFields((current) => ({ ...current, ...patch }));
  };

  const setDay = (day: number, patch: Partial<Day>) => {
    setStatus(null);
    setDays((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  };

  const setSlot = (item: Day, index: number, patch: Partial<Slot>) =>
    setDay(item.day, {
      slots: item.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    });

  function copyFirstDay() {
    const [first] = days;
    if (!first) return;
    setStatus(null);
    setDays((current) => current.map((item) => ({ ...item, closed: first.closed, slots: first.slots })));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sameTimes = days.some(
      (item) => !item.closed && item.slots.some((slot) => slot.open === slot.close),
    );
    if (sameTimes) {
      setStatus("times");
      return;
    }

    setSaving(true);
    setStatus(null);
    const result = await saveShopProfile(shopId, {
      name: fields.name,
      category: fields.category,
      description: blankToNull(fields.description),
      phone: blankToNull(fields.phone),
      whatsapp: blankToNull(fields.whatsapp),
      address: blankToNull(fields.address),
      hours: toHours(days),
    });
    setSaving(false);

    if (result.ok) setStatus("saved");
    else setStatus(result.code === "live_shop_incomplete" ? "incomplete" : "failed");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-10 border-t border-line pt-8">
      <section className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          {t("name")}
          <input required maxLength={120} value={fields.name} onChange={(e) => edit({ name: e.target.value })} className={input} />
        </label>
        <label className={label}>
          {t("category")}
          <select value={fields.category} onChange={(e) => edit({ category: e.target.value as ShopKind })} className={input}>
            {categories.map((value) => (
              <option key={value} value={value}>
                {category(value)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("phone")}
          <input type="tel" pattern={PHONE} value={fields.phone} onChange={(e) => edit({ phone: e.target.value })} className={input} />
        </label>
        <label className={label}>
          {t("whatsapp")}
          <input type="tel" pattern={PHONE} value={fields.whatsapp} onChange={(e) => edit({ whatsapp: e.target.value })} className={input} />
        </label>
        <p className="-mt-3 text-sm text-muted sm:col-span-2">{t("contactHint")}</p>
        <label className={`${label} sm:col-span-2`}>
          {t("address")}
          <input maxLength={500} value={fields.address} onChange={(e) => edit({ address: e.target.value })} className={input} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("description")}
          <textarea
            rows={3}
            maxLength={2000}
            value={fields.description}
            onChange={(e) => edit({ description: e.target.value })}
            className="mt-1.5 w-full rounded-md border border-line bg-card p-3 text-base text-ink"
          />
        </label>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl">{t("hours")}</h2>
          <button type="button" onClick={copyFirstDay} className="text-sm text-brand underline-offset-4 hover:underline">
            {t("copyFirst", { day: dayName(week[0] ?? 1) })}
          </button>
        </div>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {days.map((item) => (
            <li key={item.day} className="flex flex-wrap items-start gap-x-5 gap-y-2 py-3">
              <span className="w-28 pt-2 text-sm">{dayName(item.day)}</span>
              <label className="flex items-center gap-2 pt-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={!item.closed}
                  onChange={(e) => setDay(item.day, { closed: !e.target.checked })}
                />
                {item.closed ? t("closed") : t("open")}
              </label>
              {!item.closed && (
                <div className="space-y-2">
                  {item.slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input aria-label={`${dayName(item.day)} ${t("opens")}`} type="time" required value={slot.open} onChange={(e) => setSlot(item, index, { open: e.target.value })} className={timeInput} />
                      <span aria-hidden className="text-muted">–</span>
                      <input aria-label={`${dayName(item.day)} ${t("closes")}`} type="time" required value={slot.close} onChange={(e) => setSlot(item, index, { close: e.target.value })} className={timeInput} />
                      {item.slots.length > 1 && (
                        <button
                          type="button"
                          aria-label={t("removeSlot")}
                          onClick={() => setDay(item.day, { slots: item.slots.filter((_, i) => i !== index) })}
                          className="p-1.5 text-muted hover:text-ink"
                        >
                          <X aria-hidden size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                  {item.slots.length < MAX_SLOTS && (
                    <button
                      type="button"
                      onClick={() => setDay(item.day, { slots: [...item.slots, { open: "16:00", close: "21:00" }] })}
                      className="inline-flex items-center gap-1.5 text-sm text-brand underline-offset-4 hover:underline"
                    >
                      <Plus aria-hidden size={14} strokeWidth={1.5} />
                      {t("addBreak")}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2.5 font-medium text-paper transition-colors hover:bg-brand-dark disabled:opacity-40">
          {saving ? t("saving") : t("save")}
        </button>
        {status === "saved" && (
          <p role="status" className="text-sm text-brand">
            {t("saved")}
          </p>
        )}
        {status && status !== "saved" && (
          <p role="alert" className="text-sm text-accent">
            {t(`errors.${status}`)}
          </p>
        )}
      </div>
    </form>
  );
}
