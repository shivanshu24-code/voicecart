import type { ProductRow } from "@/lib/storefront";
import type { Product } from "@/lib/voice-types";

export const priceKinds = ["fixed", "from", "range", "options", "request"] as const;
export type PriceKind = (typeof priceKinds)[number];

/** What a form edits. Everything stays text until saved, so typing is never interrupted. */
export type ProductDraft = {
  name: string;
  description: string;
  category: string;
  kind: PriceKind;
  price: string;
  priceMax: string;
  unit: string;
  options: { label: string; price: string; is_available: boolean; image_url: string | null }[];
  choices: { name: string; values: string; images: Record<string, string> }[];
  images: string[];
  is_available: boolean;
};

export type ProductPayload = Product & { is_available: boolean };

export const blankOption = { label: "", price: "", is_available: true, image_url: null };
export const blankChoice = { name: "", values: "", images: {} };

export const blankDraft: ProductDraft = {
  name: "",
  description: "",
  category: "",
  kind: "fixed",
  price: "",
  priceMax: "",
  unit: "",
  options: [],
  choices: [],
  images: [],
  is_available: true,
};

const numberText = (value: number | null) => (value === null ? "" : String(value));

function kindOf(product: {
  price: number | null;
  priceMax: number | null;
  from: boolean;
  optionCount: number;
}): PriceKind {
  if (product.optionCount > 0) return "options";
  if (product.price === null) return "request";
  if (product.priceMax !== null && product.priceMax !== product.price) return "range";
  return product.from ? "from" : "fixed";
}

/** From a voice answer, which uses rupees. */
export function draftFromProduct(product: Product): ProductDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category ?? "",
    kind: kindOf({
      price: product.price_rupees,
      priceMax: product.price_max_rupees,
      from: product.price_from,
      optionCount: product.options.length,
    }),
    price: numberText(product.price_rupees),
    priceMax: numberText(product.price_max_rupees),
    unit: product.unit ?? "",
    options: product.options.map((option) => ({
      label: option.label,
      price: numberText(option.price_rupees),
      is_available: option.is_available,
      image_url: option.image_url,
    })),
    choices: product.choices.map((choice) => ({
      name: choice.name,
      values: choice.values.join(", "),
      images: choice.images,
    })),
    images: product.images,
    is_available: true,
  };
}

const toRupees = (paise: number | null) => (paise === null ? null : paise / 100);

/** From the database, which uses paise. */
export function draftFromRow(row: ProductRow): ProductDraft {
  return {
    ...draftFromProduct({
      name: row.name,
      description: row.description,
      category: row.category,
      price_rupees: toRupees(row.price_paise),
      price_max_rupees: toRupees(row.price_max_paise),
      price_from: row.price_from,
      unit: row.unit,
      options: row.options.map((option) => ({
        label: option.label,
        price_rupees: option.price_paise / 100,
        is_available: option.is_available,
        image_url: option.image_url ?? null,
      })),
      choices: row.choices.map((choice) => ({ ...choice, images: choice.images ?? {} })),
      images: row.images,
    }),
    is_available: row.is_available,
  };
}

const blankToNull = (value: string) => value.trim() || null;
const textToNumber = (value: string) => (value.trim() === "" ? null : Number(value));

/** "Red, Blue" as a list, for saving and for showing a photo slot per value. */
export const splitValues = (values: string) =>
  values
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

/** Sends only what the chosen price type uses, so a hidden old value can't come back. */
export function payloadFromDraft(draft: ProductDraft): ProductPayload {
  const { kind } = draft;
  const hasPrice = kind === "fixed" || kind === "from" || kind === "range";

  return {
    name: draft.name.trim(),
    description: blankToNull(draft.description),
    category: blankToNull(draft.category),
    price_rupees: hasPrice ? textToNumber(draft.price) : null,
    price_max_rupees: kind === "range" ? textToNumber(draft.priceMax) : null,
    price_from: kind === "from",
    unit: hasPrice ? blankToNull(draft.unit) : null,
    options:
      kind === "options"
        ? draft.options.map((option) => ({
            label: option.label.trim(),
            price_rupees: Number(option.price),
            is_available: option.is_available,
            image_url: option.image_url,
          }))
        : [],
    choices: draft.choices
      .map((choice) => {
        const values = splitValues(choice.values);
        // A value that was renamed or removed takes its photo with it.
        const images = Object.entries(choice.images).filter(([value]) => values.includes(value));
        return { name: choice.name.trim(), values, images: Object.fromEntries(images) };
      })
      .filter((choice) => choice.name && choice.values.length > 0),
    images: draft.images,
    is_available: draft.is_available,
  };
}
