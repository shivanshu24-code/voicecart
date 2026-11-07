import { shopCategories } from "../schemas/shop.schema.js";
import {
  MAX_CHOICES,
  MAX_LABEL,
  MAX_OPTIONS,
  MAX_RUPEES,
  type BusinessProfile,
  type Extraction,
  type Product,
} from "../schemas/onboarding.schema.js";

const MAX_PRODUCTS = 200;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lowercases and strips punctuation, keeping Devanagari vowel signs intact. */
const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();

const isSupported = (evidence: string, text: string) => {
  const quote = normalise(evidence);
  return quote.length > 0 && normalise(text).includes(quote);
};

/** For options and choices, where models reorder words: "450 for half kg" becomes "half kg 450". */
const wordsWereSaid = (evidence: string, text: string) => {
  const said = new Set(normalise(text).split(" "));
  const quoted = normalise(evidence).split(" ").filter(Boolean);
  return quoted.length > 0 && quoted.every((word) => said.has(word));
};

/** Accepts Hindi digits and spacing; returns null when it isn't a real number. */
export function normalisePhone(value: string): string | null {
  const digits = value
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    .replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

const validPrice = (price: number | null) =>
  price !== null && price >= 0 && price <= MAX_RUPEES ? price : null;

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const cleanText = (value: string) => value.trim().slice(0, MAX_LABEL);

/** Speech comes back in lowercase, which looks careless on a shop's website. */
const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type ExtractedProduct = Extraction["products"][number];

/** Keeps the priced options the owner actually said; a repeated label updates its price. */
function mergeOptions(current: Product["options"], incoming: ExtractedProduct["options"], text: string) {
  const merged = [...current];
  for (const option of incoming) {
    const label = capitalise(cleanText(option.label));
    const price = validPrice(option.price_rupees);
    if (!label || price === null || !wordsWereSaid(option.evidence, text)) continue;

    const index = merged.findIndex((existing) => sameText(existing.label, label));
    const existing = merged[index];
    if (existing) merged[index] = { ...existing, price_rupees: price };
    else merged.push({ label, price_rupees: price, is_available: true, image_url: null });
  }
  return merged.slice(0, MAX_OPTIONS);
}

/** Adds to a group of same-price choices, such as more colours for a kurta. */
function mergeChoices(current: Product["choices"], incoming: ExtractedProduct["choices"], text: string) {
  const merged = [...current];
  for (const choice of incoming) {
    const name = capitalise(cleanText(choice.name));
    const values = choice.values.map((value) => capitalise(cleanText(value))).filter(Boolean);
    if (!name || values.length === 0 || !wordsWereSaid(choice.evidence, text)) continue;

    const index = merged.findIndex((existing) => sameText(existing.name, name));
    const existing = merged[index];
    const combined = [...(existing?.values ?? [])];
    for (const value of values) {
      if (!combined.some((other) => sameText(other, value))) combined.push(value);
    }

    const group = {
      name: existing?.name ?? name,
      values: combined.slice(0, MAX_OPTIONS),
      images: existing?.images ?? {},
    };
    if (existing) merged[index] = group;
    else merged.push(group);
  }
  return merged.slice(0, MAX_CHOICES);
}

/**
 * Applies a model's output to the draft. Only values quoted from the owner's
 * latest message survive, so the model can't add details nobody said.
 */
export function mergeExtraction(profile: BusinessProfile, extraction: Extraction, text: string) {
  const merged: BusinessProfile = {
    ...profile,
    hours: [...profile.hours],
    products: [...profile.products],
  };
  const rejected: string[] = [];

  for (const { field, value, evidence } of extraction.fields) {
    const trimmed = value.trim();
    if (!trimmed || !isSupported(evidence, text)) {
      rejected.push(field);
    } else if (field === "category") {
      const category = shopCategories.find((option) => option === trimmed.toLowerCase());
      if (category) merged.category = category;
      else rejected.push(field);
    } else if (field === "phone" || field === "whatsapp") {
      const phone = normalisePhone(trimmed);
      if (phone) merged[field] = phone;
      else rejected.push(field);
    } else {
      merged[field] = field === "description" ? capitalise(trimmed) : trimmed;
    }
  }

  for (const { evidence, ...product } of extraction.products) {
    const name = product.name.trim();
    if (!name || !isSupported(evidence, text)) {
      rejected.push("product");
      continue;
    }

    const price = validPrice(product.price_rupees);
    const priceMax = price === null ? null : validPrice(product.price_max_rupees);
    const category = product.category ? capitalise(cleanText(product.category)) : null;
    const index = merged.products.findIndex((p) => sameText(p.name, name));
    const existing = merged.products[index];

    if (existing) {
      // A later mention updates what it states and keeps everything else.
      merged.products[index] = {
        name: existing.name,
        description: product.description ?? existing.description,
        category: category ?? existing.category,
        // A price is one idea, so a new one replaces the old range or "from" too.
        price_rupees: price ?? existing.price_rupees,
        price_max_rupees: price === null ? existing.price_max_rupees : priceMax,
        price_from: price === null ? existing.price_from : product.price_from,
        unit: product.unit ?? existing.unit,
        options: mergeOptions(existing.options, product.options, text),
        choices: mergeChoices(existing.choices, product.choices, text),
        images: existing.images,
      };
    } else if (merged.products.length < MAX_PRODUCTS) {
      merged.products.push({
        name: capitalise(name),
        description: product.description,
        category,
        price_rupees: price,
        price_max_rupees: priceMax,
        price_from: product.price_from,
        unit: product.unit,
        options: mergeOptions([], product.options, text),
        choices: mergeChoices([], product.choices, text),
        images: [],
      });
    }
  }

  const accepted = extraction.hours.filter((hour) => {
    const validTimes =
      hour.is_closed || (TIME.test(hour.open_time ?? "") && TIME.test(hour.close_time ?? ""));
    const valid =
      Number.isInteger(hour.day_of_week) &&
      hour.day_of_week >= 0 &&
      hour.day_of_week <= 6 &&
      validTimes &&
      isSupported(hour.evidence, text);
    if (!valid) rejected.push("hours");
    return valid;
  });

  // A day mentioned now replaces that day; several slots allow afternoon closures.
  const days = new Set(accepted.map((hour) => hour.day_of_week));
  merged.hours = merged.hours.filter((hour) => !days.has(hour.day_of_week));
  const slots = new Map<number, number>();
  for (const hour of accepted) {
    const slot = slots.get(hour.day_of_week) ?? 0;
    slots.set(hour.day_of_week, slot + 1);
    if (slot > 3) continue;
    merged.hours.push({
      day_of_week: hour.day_of_week,
      slot,
      open_time: hour.is_closed ? null : hour.open_time,
      close_time: hour.is_closed ? null : hour.close_time,
      is_closed: hour.is_closed,
    });
  }
  merged.hours.sort((a, b) => a.day_of_week - b.day_of_week || a.slot - b.slot);

  return { profile: merged, rejected };
}
