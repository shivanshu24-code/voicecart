"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  blankChoice,
  blankOption,
  priceKinds,
  splitValues,
  type PriceKind,
  type ProductDraft,
} from "@/lib/product-draft";
import { PhotoList, PhotoSlot } from "./photo-upload";

export type ShopKind = "grocery" | "clothing" | "electronics" | "bakery" | "other";

const input = "h-11 w-full min-w-0 rounded-md border border-line bg-card px-3 text-base text-ink";
const label = "block text-sm text-muted";
const addButton = "inline-flex items-center gap-1.5 text-sm text-brand underline-offset-4 hover:underline";

type Props = {
  value: ProductDraft;
  /** Takes an update, because a photo can finish uploading after other edits. */
  onChange: (update: (current: ProductDraft) => ProductDraft) => void;
  shopKind: ShopKind;
  groups: string[];
  /** Photos need a saved shop, so the voice review leaves this out. */
  shopId?: string;
};

/** The whole product form, shared by the voice review and the product editor. */
export function ProductFields({ value, onChange, shopKind, groups, shopId }: Props) {
  const t = useTranslations("products");
  const listId = useId();
  const hint = (name: "group" | "unit" | "option" | "choiceName" | "choiceValues") =>
    t(`hints.${shopKind}.${name}`);

  const set = (patch: Partial<ProductDraft>) => onChange((current) => ({ ...current, ...patch }));

  const setKind = (kind: PriceKind) =>
    onChange((current) => ({
      ...current,
      kind,
      options: kind === "options" && current.options.length === 0 ? [blankOption, blankOption] : current.options,
    }));

  const setOption = (index: number, patch: Partial<ProductDraft["options"][number]>) =>
    onChange((current) => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    }));

  const updateChoice = (
    index: number,
    update: (choice: ProductDraft["choices"][number]) => ProductDraft["choices"][number],
  ) =>
    onChange((current) => ({
      ...current,
      choices: current.choices.map((choice, i) => (i === index ? update(choice) : choice)),
    }));

  const setChoice = (index: number, patch: Partial<ProductDraft["choices"][number]>) =>
    updateChoice(index, (choice) => ({ ...choice, ...patch }));

  const setChoicePhoto = (index: number, name: string, url: string | null) =>
    updateChoice(index, (choice) => {
      const others = Object.entries(choice.images).filter(([value]) => value !== name);
      return { ...choice, images: Object.fromEntries(url ? [...others, [name, url]] : others) };
    });

  const priceInput = (field: "price" | "priceMax", name: string) => (
    <label className={label}>
      {name}
      <input
        type="number"
        required
        min={0}
        max={10000000}
        step="0.01"
        inputMode="decimal"
        value={value[field]}
        onChange={(event) => set({ [field]: event.target.value })}
        className={`${input} mt-1.5`}
      />
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className={label}>
          {t("name")}
          <input required maxLength={160} value={value.name} onChange={(event) => set({ name: event.target.value })} className={`${input} mt-1.5`} />
        </label>
        <label className={label}>
          {t("group")}
          <input
            list={listId}
            maxLength={60}
            placeholder={hint("group")}
            value={value.category}
            onChange={(event) => set({ category: event.target.value })}
            className={`${input} mt-1.5`}
          />
          <datalist id={listId}>
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </label>
      </div>

      <label className={label}>
        {t("description")}
        <input maxLength={2000} value={value.description} onChange={(event) => set({ description: event.target.value })} className={`${input} mt-1.5`} />
      </label>

      {shopId && (
        <div>
          <p className="mb-2 text-sm text-muted">{t("photos")}</p>
          <PhotoList shopId={shopId} value={value.images} onChange={(update) => onChange((current) => ({ ...current, images: update(current.images) }))} max={8} />
        </div>
      )}

      <div className="grid items-end gap-4 sm:grid-cols-3">
        <label className={label}>
          {t("priceType")}
          <select value={value.kind} onChange={(event) => setKind(event.target.value as PriceKind)} className={`${input} mt-1.5`}>
            {priceKinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`kinds.${kind}`)}
              </option>
            ))}
          </select>
        </label>

        {(value.kind === "fixed" || value.kind === "from") && priceInput("price", t("price"))}
        {value.kind === "range" && priceInput("price", t("priceLow"))}
        {value.kind === "range" && priceInput("priceMax", t("priceHigh"))}
        {(value.kind === "fixed" || value.kind === "from") && (
          <label className={label}>
            {t("unit")}
            <input maxLength={40} placeholder={hint("unit")} value={value.unit} onChange={(event) => set({ unit: event.target.value })} className={`${input} mt-1.5`} />
          </label>
        )}
      </div>

      {value.kind === "options" && (
        <fieldset>
          <legend className="text-sm text-muted">{t("optionsTitle")}</legend>
          <ul className="mt-2 space-y-2">
            {value.options.map((option, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                {shopId && (
                  <PhotoSlot
                    shopId={shopId}
                    value={option.image_url}
                    onChange={(image_url) => setOption(i, { image_url })}
                    label={option.label || t("optionName")}
                  />
                )}
                <input aria-label={t("optionName")} required maxLength={60} placeholder={hint("option")} value={option.label} onChange={(event) => setOption(i, { label: event.target.value })} className={`${input} flex-1 basis-32`} />
                <input aria-label={t("price")} type="number" required min={0} max={10000000} step="0.01" inputMode="decimal" placeholder="₹" value={option.price} onChange={(event) => setOption(i, { price: event.target.value })} className={`${input} w-28! shrink-0`} />
                <label className="flex items-center gap-1.5 text-sm text-muted">
                  <input type="checkbox" checked={option.is_available} onChange={(event) => setOption(i, { is_available: event.target.checked })} />
                  {t("inStock")}
                </label>
                <button
                  type="button"
                  aria-label={t("removeOption")}
                  disabled={value.options.length === 1}
                  onClick={() => onChange((current) => ({ ...current, options: current.options.filter((_, index) => index !== i) }))}
                  className="p-1.5 text-muted hover:text-ink disabled:opacity-30"
                >
                  <X aria-hidden size={16} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
          {value.options.length < 30 && (
            <button type="button" onClick={() => onChange((current) => ({ ...current, options: [...current.options, blankOption] }))} className={`${addButton} mt-2`}>
              <Plus aria-hidden size={15} strokeWidth={1.5} />
              {t("addOption")}
            </button>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend className="text-sm text-muted">{t("choicesTitle")}</legend>
        {value.choices.length > 0 && (
          <ul className="mt-2 space-y-2">
            {value.choices.map((choice, i) => (
              <li key={i}>
                <div className="grid grid-cols-[8rem_1fr_auto] items-center gap-2">
                <input aria-label={t("choiceName")} required maxLength={60} placeholder={hint("choiceName")} value={choice.name} onChange={(event) => setChoice(i, { name: event.target.value })} className={input} />
                <input aria-label={t("choiceValues")} required placeholder={hint("choiceValues")} value={choice.values} onChange={(event) => setChoice(i, { values: event.target.value })} className={input} />
                <button
                  type="button"
                  aria-label={t("removeChoice")}
                  onClick={() => onChange((current) => ({ ...current, choices: current.choices.filter((_, index) => index !== i) }))}
                  className="p-1.5 text-muted hover:text-ink"
                >
                  <X aria-hidden size={16} strokeWidth={1.5} />
                </button>
                </div>
                {shopId && splitValues(choice.values).length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-3">
                    {splitValues(choice.values).map((name) => (
                      <li key={name} className="flex items-center gap-1.5 text-sm text-muted">
                        <PhotoSlot
                          shopId={shopId}
                          value={choice.images[name] ?? null}
                          onChange={(url) => setChoicePhoto(i, name, url)}
                          label={name}
                        />
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        {value.choices.length < 5 && (
          <button type="button" onClick={() => onChange((current) => ({ ...current, choices: [...current.choices, blankChoice] }))} className={`${addButton} mt-2`}>
            <Plus aria-hidden size={15} strokeWidth={1.5} />
            {t("addChoice")}
          </button>
        )}
      </fieldset>
    </div>
  );
}
