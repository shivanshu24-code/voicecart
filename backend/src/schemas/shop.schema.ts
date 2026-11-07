import { z } from "zod";
import { templates } from "../services/publish.js";

export const shopCategories = ["grocery", "clothing", "electronics", "bakery", "other"] as const;

const phone = z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number");

export const createShopSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(shopCategories).default("other"),
});

export const updateShopSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    category: z.enum(shopCategories),
    description: z.string().trim().max(2000).nullable(),
    phone: phone.nullable(),
    whatsapp: phone.nullable(),
    address: z.string().trim().max(500).nullable(),
    locale: z.enum(["en", "hi"]),
    template: z.enum(templates),
    logo_url: z.string().url().nullable(),
    banner_url: z.string().url().nullable(),
  })
  .partial()
  .strict();

export const shopIdSchema = z.object({ id: z.string().uuid() });

export const publishSchema = z.object({
  slug: z.string().trim().toLowerCase().max(60),
  template: z.enum(templates),
});

export const slugQuerySchema = z.object({ value: z.string().trim().toLowerCase().max(60) });
