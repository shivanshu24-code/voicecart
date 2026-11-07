export type PublishBlocker = "contact" | "contact_unconfirmed" | "address" | "hours" | "products";

type ShopForPublish = {
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  confirmed_fields: Record<string, unknown>;
};

/** What stops a shop going live. Empty means it's ready. */
export function publishBlockers(shop: ShopForPublish, productCount: number, hourCount: number) {
  const blockers: PublishBlocker[] = [];
  const confirmed = (field: string) => shop.confirmed_fields[field] === true;

  if (!shop.phone && !shop.whatsapp) blockers.push("contact");
  else if (!(shop.phone && confirmed("phone")) && !(shop.whatsapp && confirmed("whatsapp"))) {
    blockers.push("contact_unconfirmed");
  }
  if (!shop.address) blockers.push("address");
  if (hourCount === 0) blockers.push("hours");
  if (productCount === 0) blockers.push("products");

  return blockers;
}

const editableFields = ["name", "category", "description", "phone", "whatsapp", "address"] as const;

type EditedFields = Record<(typeof editableFields)[number], string | null>;

/** Saving the details form is the owner confirming what's in it, and nothing they cleared. */
export function confirmedAfterEdit(confirmed: Record<string, unknown>, edited: EditedFields) {
  const kept = Object.entries(confirmed).filter(
    ([field]) => !editableFields.some((editable) => editable === field),
  );
  const saved = editableFields.filter((field) => edited[field]).map((field) => [field, true]);
  return Object.fromEntries([...kept, ["hours", true], ...saved]);
}

const kinds = ["grocery", "clothing", "electronics", "bakery", "generic"];
const layouts = ["storefront", "shelves", "menucard", "lookbook"];

/** Five original designs, plus every newer layout in each shop kind's own colours. */
export const templates = [
  ...kinds,
  ...layouts.flatMap((layout) => kinds.map((kind) => `${layout}-${kind}`)),
] as [string, ...string[]];

/** New shops start on the shop-style layout. Owners can change it. */
export const templateForCategory = (category: string) =>
  `storefront-${kinds.includes(category) ? category : "generic"}`;
