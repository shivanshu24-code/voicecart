import type { Product } from "../schemas/onboarding.schema.js";

const toPaise = (rupees: number) => Math.round(rupees * 100);

/**
 * Turns an owner's product into database columns. Options win over any other
 * price, and price_paise keeps the lowest so sorting and filtering still work.
 */
export function productRow<T extends Product>(product: T) {
  const { price_rupees, price_max_rupees, price_from, options, ...fields } = product;
  // The first photo stays in image_url, so a product has one cover to show.
  const rest = { ...fields, image_url: fields.images[0] ?? null };
  const unpriced = { price_paise: null, price_max_paise: null, price_from: false };

  if (options.length > 0) {
    const priced = options.map(({ price_rupees: rupees, ...option }) => ({
      ...option,
      price_paise: toPaise(rupees),
    }));
    const lowest = Math.min(...priced.map((option) => option.price_paise));
    return { ...rest, ...unpriced, options: priced, price_paise: lowest };
  }

  if (price_rupees === null) return { ...rest, ...unpriced, options: [] };

  // Owners may say the higher number first, so the order isn't trusted.
  const high = Math.max(price_rupees, price_max_rupees ?? price_rupees);
  const low = Math.min(price_rupees, price_max_rupees ?? price_rupees);
  const isRange = high > low;

  return {
    ...rest,
    options: [],
    price_paise: toPaise(low),
    price_max_paise: isRange ? toPaise(high) : null,
    price_from: !isRange && price_from,
  };
}
