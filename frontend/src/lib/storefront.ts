export const shopKinds = ["grocery", "bakery", "clothing", "electronics", "generic"] as const;
export type ShopKind = (typeof shopKinds)[number];

export const layouts = ["storefront", "shelves", "menucard", "lookbook"] as const;
export type Layout = (typeof layouts)[number];

/** A shop kind alone is one of the original designs; the rest are a layout in that kind's colours. */
export type Template = ShopKind | `${Layout}-${ShopKind}`;

export const templatesFor = (kind: ShopKind): Template[] => [
  ...layouts.map((layout): Template => `${layout}-${kind}`),
  kind,
];

export const templates: Template[] = shopKinds.flatMap(templatesFor);

export function parseTemplate(template: Template) {
  const [first, second] = template.split("-");
  return second
    ? { layout: first as Layout, kind: second as ShopKind }
    : { layout: null, kind: first as ShopKind };
}

export const kindOfCategory = (category: string): ShopKind =>
  shopKinds.find((kind) => kind === category) ?? "generic";

export const isTemplate = (value: unknown): value is Template =>
  templates.includes(value as Template);

export type StorefrontShop = {
  name: string;
  slug: string | null;
  timezone: string;
  category: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  template: string;
  primary_color: string | null;
};

/** Changes the price, such as a cake's weight. */
export type ProductOption = {
  label: string;
  price_paise: number;
  is_available: boolean;
  /** Missing on options saved before photos existed. */
  image_url?: string | null;
};

/** Keeps the price, such as a kurta's colour. */
export type ProductChoice = {
  name: string;
  values: string[];
  /** Missing on choices saved before photos existed. */
  images?: Record<string, string>;
};

export type StorefrontProduct = {
  name: string;
  description: string | null;
  category: string | null;
  price_paise: number | null;
  price_max_paise: number | null;
  price_from: boolean;
  unit: string | null;
  image_url: string | null;
  attributes: Record<string, unknown>;
  options: ProductOption[];
  choices: ProductChoice[];
  images: string[];
  is_available: boolean;
};

export type ProductRow = StorefrontProduct & { id: string };

export type StorefrontHour = {
  day_of_week: number;
  slot: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type StorefrontData = {
  shop: StorefrontShop;
  products: StorefrontProduct[];
  hours: StorefrontHour[];
};

export function formatPrice(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

/** Every photo of a product: its own first, then those of its options and choices. */
export function photosOf(product: StorefrontProduct) {
  const all = [
    ...(product.image_url ? [product.image_url] : []),
    ...product.images,
    ...product.options.flatMap((option) => option.image_url ?? []),
    ...product.choices.flatMap((choice) => Object.values(choice.images ?? {})),
  ];
  return [...new Set(all)];
}

export const coverOf = (product: StorefrontProduct) => photosOf(product)[0] ?? null;

/** What to show as a product's price; low is null when the owner gave none. */
export function priceOf(product: StorefrontProduct) {
  const inStock = product.options.filter((option) => option.is_available);
  const options = inStock.length > 0 ? inStock : product.options;

  if (options.length > 0) {
    const prices = options.map((option) => option.price_paise);
    const low = Math.min(...prices);
    return { low, high: null, from: Math.max(...prices) > low, unit: null };
  }
  return {
    low: product.price_paise,
    high: product.price_max_paise,
    from: product.price_from,
    unit: product.unit,
  };
}

export function formatTime(time: string) {
  const [hourText = "0", minutes = "00"] = time.split(":");
  const hour = Number(hourText);
  const clock = hour % 12 || 12;
  return `${clock}${minutes === "00" ? "" : `:${minutes}`} ${hour < 12 ? "am" : "pm"}`;
}

export type HourRow = { from: number; to: number; closed: boolean; times: string };

/**
 * Merges neighbouring days with the same hours, from Monday to Sunday.
 * A day the owner never mentioned is left out rather than shown as closed.
 */
export function groupHours(hours: StorefrontHour[]) {
  const rows: HourRow[] = [];

  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const slots = hours
      .filter((hour) => hour.day_of_week === day)
      .sort((a, b) => a.slot - b.slot);
    if (slots.length === 0) continue;

    const closed = slots.every((slot) => slot.is_closed);
    const times = closed
      ? ""
      : slots
          .filter((slot) => slot.open_time && slot.close_time)
          .map((slot) => `${formatTime(slot.open_time!)} – ${formatTime(slot.close_time!)}`)
          .join(", ");

    const last = rows.at(-1);
    const isNextDay = last && (last.to + 1) % 7 === day;
    if (last && isNextDay && last.closed === closed && last.times === times) last.to = day;
    else rows.push({ from: day, to: day, closed, times });
  }

  return rows;
}

/** Groups keep the owner's order, except that ungrouped items always come last. */
export function groupByCategory(products: StorefrontProduct[]) {
  const groups = new Map<string, StorefrontProduct[]>();
  for (const product of products) {
    const key = product.category?.trim() ?? "";
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  return [...groups]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => Number(a.category === "") - Number(b.category === ""));
}

/** Every word must appear somewhere the customer might remember it from. */
export function matchesSearch(product: StorefrontProduct, query: string) {
  const text = [
    product.name,
    product.description,
    product.category,
    ...product.options.map((option) => option.label),
    ...product.choices.flatMap((choice) => [choice.name, ...choice.values]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
}

export const groupId = (index: number) => `group-${index}`;

export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, "");
  const international = digits.length === 10 ? `91${digits}` : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${international}${text}`;
}

export const mapLink = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const specs = (product: StorefrontProduct) =>
  Object.entries(product.attributes).filter(
    (entry): entry is [string, string | number] =>
      typeof entry[1] === "string" || typeof entry[1] === "number",
  );

/** The last part of an address, which is usually the town or city. */
export const cityOf = (address: string | null) =>
  address?.split(",").at(-1)?.trim() || null;
