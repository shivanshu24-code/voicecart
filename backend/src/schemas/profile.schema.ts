import { z } from "zod";
import { shopCategories } from "./shop.schema.js";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const phone = z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number");

const hourSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    slot: z.number().int().min(0).max(3),
    open_time: time.nullable(),
    close_time: time.nullable(),
    is_closed: z.boolean(),
  })
  // Closing before opening is allowed, for shops that stay open past midnight.
  .refine(
    (hour) =>
      hour.is_closed ||
      (hour.open_time !== null && hour.close_time !== null && hour.open_time !== hour.close_time),
    { message: "Add an opening and a closing time" },
  )
  .transform((hour) =>
    hour.is_closed ? { ...hour, open_time: null, close_time: null } : hour,
  );

/** Everything an owner edits on the shop details page, saved together. */
export const shopProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(shopCategories),
  description: z.string().trim().max(2000).nullable(),
  phone: phone.nullable(),
  whatsapp: phone.nullable(),
  address: z.string().trim().max(500).nullable(),
  hours: z
    .array(hourSchema)
    .max(28)
    .refine(
      (hours) => new Set(hours.map((hour) => `${hour.day_of_week}-${hour.slot}`)).size === hours.length,
      { message: "A time slot appears twice" },
    ),
});

export type ShopProfile = z.infer<typeof shopProfileSchema>;
