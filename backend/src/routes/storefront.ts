import { createClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ApiError, ok } from "../lib/errors.js";

const PRODUCT_COLUMNS =
  "name, description, category, price_paise, price_max_paise, price_from, unit, image_url, attributes, options, choices, images, is_available";
const HOUR_COLUMNS = "day_of_week, slot, open_time, close_time, is_closed";
const SLUG = /^[a-zA-Z0-9-]{1,60}$/;

/** Public and unauthenticated: reads only the published-shop views, never the base tables. */
export async function storefrontRoutes(app: FastifyInstance) {
  app.get("/api/storefront/:slug", async (request) => {
    const { supabaseUrl, supabaseKey } = config;
    if (!supabaseUrl || !supabaseKey) {
      throw new ApiError(503, "storefront_unavailable", "The storefront is unavailable.");
    }

    const { slug } = request.params as { slug: string };
    if (!SLUG.test(slug)) throw new ApiError(404, "shop_not_found", "Shop not found.");

    const db = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: shop, error } = await db
      .from("public_shops")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!shop) throw new ApiError(404, "shop_not_found", "Shop not found.");

    const [products, hours] = await Promise.all([
      db.from("public_products").select(PRODUCT_COLUMNS).eq("shop_id", shop.id).order("sort_order"),
      db.from("public_shop_hours").select(HOUR_COLUMNS).eq("shop_id", shop.id),
    ]);
    if (products.error) throw products.error;
    if (hours.error) throw hours.error;

    const { id: _id, ...publicShop } = shop;
    return ok({ shop: publicShop, products: products.data, hours: hours.data });
  });
}
