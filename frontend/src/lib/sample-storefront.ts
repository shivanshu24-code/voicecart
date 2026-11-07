import {
  kindOfCategory,
  parseTemplate,
  type ShopKind,
  type StorefrontData,
  type StorefrontProduct,
  type Template,
} from "./storefront";

const item = (
  name: string,
  rupees: number | null,
  unit: string | null = null,
  extra: Partial<StorefrontProduct> = {},
): StorefrontProduct => ({
  name,
  description: null,
  category: null,
  price_paise: rupees === null ? null : rupees * 100,
  price_max_paise: null,
  price_from: false,
  unit,
  image_url: null,
  attributes: {},
  options: [],
  choices: [],
  images: [],
  is_available: true,
  ...extra,
});

const options = (...list: [string, number][]) =>
  list.map(([label, rupees]) => ({ label, price_paise: rupees * 100, is_available: true, image_url: null }));

const sizes = { name: "Size", values: ["S", "M", "L", "XL"], images: {} };

const samples: Record<ShopKind, StorefrontProduct[]> = {
  grocery: [
    item("Whole Wheat Atta", 42, "kg", {
      category: "Staples",
      options: options(["1 kg", 42], ["5 kg", 199], ["10 kg", 385]),
      price_paise: 4200,
    }),
    item("Basmati Rice", 95, "kg", { category: "Staples", price_max_paise: 16000 }),
    item("Toor Dal", 135, "kg", { category: "Staples" }),
    item("Mustard Oil", 95, null, {
      category: "Oils",
      options: options(["500 ml", 95], ["1 litre", 180], ["5 litre", 850]),
    }),
    item("Desi Ghee", 650, "litre", { category: "Oils" }),
  ],
  bakery: [
    item("Chocolate Truffle Cake", 450, null, {
      category: "Cakes",
      description: "Dark chocolate sponge with a rich ganache.",
      options: options(["Half kg", 450], ["1 kg", 850], ["2 kg", 1600]),
      choices: [{ name: "Type", values: ["With egg", "Eggless"], images: {} }],
    }),
    item("Pineapple Cake", 350, null, {
      category: "Cakes",
      options: options(["Half kg", 350], ["1 kg", 650]),
    }),
    item("Custom Theme Cake", 1200, null, { category: "Cakes", price_from: true }),
    item("Wedding Cake", null, null, { category: "Cakes" }),
    item("Pastry", 60, null, {
      category: "Pastries",
      choices: [{ name: "Flavour", values: ["Chocolate", "Vanilla", "Butterscotch"], images: {} }],
    }),
    item("Whole Wheat Bread", 55, "loaf", { category: "Breads" }),
    item("Butter Croissant", 70, null, { category: "Breads" }),
  ],
  clothing: [
    item("Block Print Saree", 2499, null, {
      category: "Sarees",
      price_max_paise: 4999 * 100,
      choices: [{ name: "Colour", values: ["Indigo", "Rust", "Olive"], images: {} }],
    }),
    item("Chanderi Saree", 3899, null, { category: "Sarees" }),
    item("Indigo Kurti", 1299, null, { category: "Kurtis", choices: [sizes] }),
    item("Cotton Kurta", 899, null, {
      category: "Kurtis",
      options: options(["Cotton", 899], ["Linen", 1299], ["Silk", 1899]),
      choices: [sizes],
    }),
    item("Linen Dupatta", 799, null, { category: "Accessories" }),
    item("Silk Stole", 1499, null, { category: "Accessories" }),
  ],
  electronics: [
    item("Smartphone", 12999, null, {
      category: "Phones",
      attributes: { Warranty: "1 year" },
      options: options(["6 GB / 128 GB", 12999], ["8 GB / 256 GB", 15999]),
      choices: [{ name: "Colour", values: ["Black", "Blue"], images: {} }],
    }),
    item("Phone Repair", 299, null, { category: "Phones", price_from: true }),
    item("Wireless Earbuds", 1499, null, { category: "Audio", attributes: { Battery: "40 hours" } }),
    item("Fast Charger", 799, null, {
      category: "Accessories",
      options: options(["33 W", 799], ["65 W", 1299]),
    }),
  ],
  generic: [
    item("Notebook Set", 240, null, {
      category: "Stationery",
      options: options(["Pack of 3", 240], ["Pack of 6", 450]),
    }),
    item("Photo Frame", 250, null, { category: "Gifts", price_max_paise: 90000 }),
    item("Gift Wrapping", 60, null, {
      category: "Gifts",
      choices: [{ name: "Paper", values: ["Kraft", "Floral", "Gold"], images: {} }],
    }),
  ],
};

const weekdays = [1, 2, 3, 4, 5, 6].map((day_of_week) => ({
  day_of_week,
  slot: 0,
  open_time: "09:00",
  close_time: "21:00",
  is_closed: false,
}));

/**
 * Fills a draft with example content so an owner can judge a design before
 * adding their own details. Used only in the private preview, never publicly.
 */
export function withSampleContent(data: StorefrontData, template: Template): StorefrontData {
  if (data.products.length > 0) return data;

  return {
    shop: {
      ...data.shop,
      address: data.shop.address ?? "MG Road, Indore",
      phone: data.shop.phone ?? "9876543210",
      whatsapp: data.shop.whatsapp ?? "9876543210",
    },
    // A bakery should see cakes in every design, not the design's own examples.
    products: samples[data.shop.category === "other" ? parseTemplate(template).kind : kindOfCategory(data.shop.category)],
    hours: data.hours.length > 0
      ? data.hours
      : [...weekdays, { day_of_week: 0, slot: 0, open_time: null, close_time: null, is_closed: true }],
  };
}
