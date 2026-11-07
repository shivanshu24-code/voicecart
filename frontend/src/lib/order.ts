import { formatPrice, type StorefrontProduct } from "./storefront";

export const MAX_QUANTITY = 99;
export const MAX_LINES = 30;

/** What's remembered in the browser. Prices are not, so an old list can't show an old price. */
export type OrderLine = {
  name: string;
  option: string | null;
  picks: string[];
  quantity: number;
};

export type ResolvedLine = OrderLine & {
  key: string;
  product: StorefrontProduct;
  unitPaise: number | null;
  totalPaise: number | null;
};

export const lineKey = ({ name, option, picks }: Pick<OrderLine, "name" | "option" | "picks">) =>
  JSON.stringify([name, option, picks]);

/** A single known price, or null for a range, a "from" price or price on request. */
export function fixedPaise(product: StorefrontProduct) {
  const isFixed = product.price_max_paise === null && !product.price_from;
  return product.options.length === 0 && isFixed ? product.price_paise : null;
}

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));

export function addLine(lines: OrderLine[], line: OrderLine) {
  const key = lineKey(line);
  const existing = lines.find((item) => lineKey(item) === key);
  if (existing) {
    return lines.map((item) =>
      item === existing ? { ...item, quantity: clamp(item.quantity + line.quantity) } : item,
    );
  }
  return lines.length < MAX_LINES ? [...lines, { ...line, quantity: clamp(line.quantity) }] : lines;
}

export function setLineQuantity(lines: OrderLine[], key: string, quantity: number) {
  if (quantity < 1) return lines.filter((item) => lineKey(item) !== key);
  return lines.map((item) => (lineKey(item) === key ? { ...item, quantity: clamp(quantity) } : item));
}

/** Reads a saved list, ignoring anything damaged. */
export function parseLines(saved: string): OrderLine[] {
  let value: unknown;
  try {
    value = JSON.parse(saved);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: Partial<OrderLine> | null) => {
    if (typeof item?.name !== "string" || typeof item.quantity !== "number") return [];
    const option = typeof item.option === "string" ? item.option : null;
    const picks = Array.isArray(item.picks) ? item.picks.filter((pick) => typeof pick === "string") : [];
    return [{ name: item.name, option, picks, quantity: clamp(item.quantity) }];
  });
}

/** Matches a list to today's catalogue, dropping what's sold out or no longer sold. */
export function resolveLines(lines: OrderLine[], products: StorefrontProduct[]): ResolvedLine[] {
  return lines.flatMap((line) => {
    const product = products.find((item) => item.name === line.name && item.is_available);
    if (!product) return [];

    const option = product.options.find((item) => item.label === line.option);
    const needsOption = product.options.length > 0;
    if (needsOption && !option?.is_available) return [];

    const unitPaise = option ? option.price_paise : fixedPaise(product);
    return [
      {
        ...line,
        option: option ? line.option : null,
        key: lineKey(line),
        product,
        unitPaise,
        totalPaise: unitPaise === null ? null : unitPaise * line.quantity,
      },
    ];
  });
}

export const orderCount = (lines: ResolvedLine[]) =>
  lines.reduce((count, line) => count + line.quantity, 0);

export const orderTotal = (lines: ResolvedLine[]) =>
  lines.reduce((total, line) => total + (line.totalPaise ?? 0), 0);

type Labels = { intro: string; total: string; toConfirm: string };

/** The WhatsApp message: numbered, so the shop can reply about a line by its number. */
export function orderText(lines: ResolvedLine[], { intro, total, toConfirm }: Labels) {
  const rows = lines.map((line, index) => {
    const item = [line.name, line.option, ...line.picks].filter(Boolean).join(", ");
    const price = line.totalPaise === null ? toConfirm : formatPrice(line.totalPaise);
    return `${index + 1}. ${item} × ${line.quantity} — ${price}`;
  });
  return [intro, ...rows, "", total].join("\n");
}
