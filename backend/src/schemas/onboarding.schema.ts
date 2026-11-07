import { z } from "zod";
import { shopCategories } from "./shop.schema.js";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const phone = z.string().regex(/^\+?[0-9]{10,15}$/);

export const MAX_RUPEES = 10_000_000;
export const MAX_LABEL = 60;
export const MAX_OPTIONS = 30;
export const MAX_CHOICES = 5;
export const MAX_IMAGES = 8;

const hourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  slot: z.number().int().min(0).max(3),
  open_time: time.nullable(),
  close_time: time.nullable(),
  is_closed: z.boolean(),
});

const rupees = z.number().min(0).max(MAX_RUPEES);

/** A choice that changes the price, such as a cake's weight or a phone's storage. */
const optionSchema = z.object({
  label: z.string().trim().min(1).max(MAX_LABEL),
  price_rupees: rupees,
  is_available: z.boolean().default(true),
  image_url: z.string().url().nullable().default(null),
});

/** A choice that keeps the price, such as a kurta's size or a pastry's flavour. */
const choiceSchema = z.object({
  name: z.string().trim().min(1).max(MAX_LABEL),
  values: z.array(z.string().trim().min(1).max(MAX_LABEL)).min(1).max(MAX_OPTIONS),
  // A photo for some values, keyed by value, such as {"Blue": "https://..."}.
  images: z.record(z.string(), z.string().url()).default({}),
});

// New fields have defaults, so drafts saved before they existed still load.
export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable(),
  category: z.string().trim().max(MAX_LABEL).nullable().default(null),
  price_rupees: rupees.nullable(),
  price_max_rupees: rupees.nullable().default(null),
  price_from: z.boolean().default(false),
  unit: z.string().trim().max(40).nullable(),
  options: z.array(optionSchema).max(MAX_OPTIONS).default([]),
  choices: z.array(choiceSchema).max(MAX_CHOICES).default([]),
  images: z.array(z.string().url()).max(MAX_IMAGES).default([]),
});

export type Product = z.infer<typeof productSchema>;

/** The draft built up during a conversation. Anything unknown stays null. */
export const businessProfileSchema = z.object({
  name: z.string().nullable(),
  category: z.enum(shopCategories).nullable(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  address: z.string().nullable(),
  hours: z.array(hourSchema),
  products: z.array(productSchema),
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;

export const emptyProfile: BusinessProfile = {
  name: null,
  category: null,
  description: null,
  phone: null,
  whatsapp: null,
  address: null,
  hours: [],
  products: [],
};

const evidence = z
  .string()
  .describe("The exact words from the owner's latest message that support this value.");

/** What the model must return. Every value carries the words that justify it. */
export const extractionSchema = z.object({
  fields: z.array(
    z.object({
      field: z.enum(["name", "category", "description", "phone", "whatsapp", "address"]),
      value: z.string(),
      evidence,
    }),
  ),
  products: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      category: z
        .string()
        .nullable()
        .describe("The section of the shop this belongs to, such as Cakes or Phones. Null if unclear."),
      price_rupees: z.number().nullable().describe("The single price, or the lowest price of a range."),
      price_max_rupees: z.number().nullable().describe("The highest price of a range, otherwise null."),
      price_from: z.boolean().describe("True when the owner gave only a starting price."),
      unit: z.string().nullable(),
      options: z
        .array(z.object({ label: z.string(), price_rupees: z.number(), evidence }))
        .describe("Sizes, packs or models that each have their own price."),
      choices: z
        .array(z.object({ name: z.string(), values: z.array(z.string()), evidence }))
        .describe("Flavours, colours or sizes that all cost the same."),
      evidence,
    }),
  ),
  hours: z.array(
    z.object({
      day_of_week: z.number().int().describe("0 is Sunday, 6 is Saturday."),
      open_time: z.string().nullable().describe("24-hour HH:MM, or null when closed."),
      close_time: z.string().nullable().describe("24-hour HH:MM, or null when closed."),
      is_closed: z.boolean(),
      evidence,
    }),
  ),
  clarification: z
    .string()
    .nullable()
    .describe("One short question if something the owner said is ambiguous, otherwise null."),
});

export type Extraction = z.infer<typeof extractionSchema>;

export const startSessionSchema = z.object({
  shopId: z.string().uuid(),
  consent: z.literal(true),
  language: z.enum(["en", "hi"]),
});

export const sessionIdSchema = z.object({ id: z.string().uuid() });

export const messageSchema = z.object({ text: z.string().trim().min(1).max(2000) });

/** Reviewed data. Stricter than the draft, because this is what gets saved. */
export const completeSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    category: z.enum(shopCategories),
    description: z.string().trim().max(2000).nullable(),
    phone: phone.nullable(),
    whatsapp: phone.nullable(),
    address: z.string().trim().max(500).nullable(),
    hours: z.array(hourSchema).max(28),
    products: z.array(productSchema).max(200),
  })
  .refine((shop) => shop.phone || shop.whatsapp, { message: "A contact number is required" });
