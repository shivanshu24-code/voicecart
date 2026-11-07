import { z } from "zod";
import { productSchema } from "./onboarding.schema.js";

export const productInputSchema = productSchema.extend({
  is_available: z.boolean().default(true),
});

export const productParamsSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
});

export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

export const extractProductsSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  language: z.enum(["en", "hi"]),
});
