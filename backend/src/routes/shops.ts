import type { FastifyInstance, FastifyRequest } from "fastify";
import { adminDb } from "../lib/admin.js";
import { requireUser } from "../lib/auth.js";
import { ApiError, ok } from "../lib/errors.js";
import {
  createShopSchema,
  publishSchema,
  shopIdSchema,
  slugQuerySchema,
  updateShopSchema,
} from "../schemas/shop.schema.js";
import { shopProfileSchema } from "../schemas/profile.schema.js";
import { assertShopImages, signUpload } from "../services/images.js";
import { confirmedAfterEdit, publishBlockers, templateForCategory } from "../services/publish.js";
import { isValidSlug, slugify } from "../services/slug.js";

type ShopDetails = {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  template: string;
  is_published: boolean;
  confirmed_fields: Record<string, unknown>;
};

const SHOP_COLUMNS =
  "id, name, slug, category, description, phone, whatsapp, address, logo_url, banner_url, locale, is_published, created_at, updated_at";
const DETAIL_COLUMNS = `${SHOP_COLUMNS}, template, primary_color, timezone, confirmed_fields`;

/** Reads through the caller's RLS client, so only the owner gets a result. */
async function getOwnShopDetails(request: FastifyRequest, id: string) {
  // Together in one trip. RLS returns nothing for another owner's shop.
  const [{ data: shop, error }, products, hours] = await Promise.all([
    request.db.from("shops").select(DETAIL_COLUMNS).eq("id", id).maybeSingle<ShopDetails>(),
    request.db.from("products").select("*").eq("shop_id", id).order("sort_order"),
    request.db.from("shop_hours").select("*").eq("shop_id", id),
  ]);
  if (error) throw error;
  if (!shop) throw new ApiError(404, "shop_not_found", "Shop not found.");
  if (products.error) throw products.error;
  if (hours.error) throw hours.error;

  return {
    shop,
    products: products.data,
    hours: hours.data,
    blockers: publishBlockers(
      shop,
      products.data.length,
      hours.data.filter((hour) => !hour.is_closed).length,
    ),
  };
}

async function isSlugTaken(slug: string, shopId: string) {
  const { data, error } = await adminDb()
    .from("shops")
    .select("id")
    .eq("slug", slug)
    .neq("id", shopId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** The name-based address, with a number added if another shop already has it. */
async function suggestSlug(name: string, shopId: string) {
  const base = slugify(name) || `shop-${shopId.slice(0, 6)}`;
  for (let suffix = 1; suffix < 50; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await isSlugTaken(candidate, shopId))) return candidate;
  }
  return `${base}-${shopId.slice(0, 6)}`;
}

export async function shopRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/api/shops", async (request) => {
    const { data, error } = await request.db
      .from("shops")
      .select(`${SHOP_COLUMNS}, products(count)`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return ok(
      data.map(({ products, ...shop }) => ({
        ...shop,
        product_count: products[0]?.count ?? 0,
      })),
    );
  });

  app.post("/api/shops", async (request, reply) => {
    const input = createShopSchema.parse(request.body);
    const { data, error } = await request.db
      .from("shops")
      .insert(input)
      .select("id")
      .single();
    if (error) throw error;

    // Start on the design that suits the category; the owner can change it.
    const { data: shop, error: templateError } = await request.db
      .from("shops")
      .update({ template: templateForCategory(input.category) })
      .eq("id", data.id)
      .select(SHOP_COLUMNS)
      .single();
    if (templateError) throw templateError;

    return reply.status(201).send(ok(shop));
  });

  app.get("/api/shops/:id", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const { data, error } = await request.db
      .from("shops")
      .select(SHOP_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "shop_not_found", "Shop not found.");

    return ok(data);
  });

  app.patch("/api/shops/:id", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const input = updateShopSchema.parse(request.body);
    assertShopImages([input.logo_url, input.banner_url], id);
    const { data, error } = await request.db
      .from("shops")
      .update(input)
      .eq("id", id)
      .select(SHOP_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "shop_not_found", "Shop not found.");

    return ok(data);
  });

  // Saves the details form. A live shop must stay complete, so customers never
  // land on a page with no way to reach it.
  app.put("/api/shops/:id/profile", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const { hours, ...fields } = shopProfileSchema.parse(request.body);
    const { shop, products, hours: currentHours } = await getOwnShopDetails(request, id);

    const confirmed_fields = confirmedAfterEdit(shop.confirmed_fields, fields);
    const openHours = hours.filter((hour) => !hour.is_closed).length;
    const blockers = publishBlockers({ ...fields, confirmed_fields }, products.length, openHours);
    if (shop.is_published && blockers.length > 0) {
      throw new ApiError(422, "live_shop_incomplete", "A live shop needs these details.", { blockers });
    }

    const rows = hours.map((hour) => ({ ...hour, shop_id: id }));
    if (rows.length > 0) {
      const { error } = await request.db
        .from("shop_hours")
        .upsert(rows, { onConflict: "shop_id,day_of_week,slot" });
      if (error) throw error;
    }

    const kept = new Set(hours.map((hour) => `${hour.day_of_week}-${hour.slot}`));
    const removed = currentHours
      .filter((hour) => !kept.has(`${hour.day_of_week}-${hour.slot}`))
      .map((hour) => hour.id);
    if (removed.length > 0) {
      const { error } = await request.db.from("shop_hours").delete().in("id", removed);
      if (error) throw error;
    }

    // confirmed_fields is closed to owners, and ownership was proved above.
    const { data, error } = await adminDb()
      .from("shops")
      .update({ ...fields, confirmed_fields })
      .eq("id", id)
      .select(SHOP_COLUMNS)
      .single();
    if (error) throw error;

    return ok(data);
  });

  // The browser sends the file straight to Cloudinary using this signature.
  app.post("/api/shops/:id/uploads/signature", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    await getOwnShopDetails(request, id);
    return ok(signUpload(id));
  });

  app.get("/api/shops/:id/details", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const details = await getOwnShopDetails(request, id);
    const { shop } = details;

    return ok({
      ...details,
      suggestedSlug: shop.slug ?? (await suggestSlug(shop.name, id)),
    });
  });

  app.get("/api/shops/:id/slug", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const { value } = slugQuerySchema.parse(request.query);
    await getOwnShopDetails(request, id);

    const valid = isValidSlug(value);
    return ok({ valid, available: valid && !(await isSlugTaken(value, id)) });
  });

  // Owners can't write is_published or slug themselves, so this is the only way live.
  app.post("/api/shops/:id/publish", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const { slug, template } = publishSchema.parse(request.body);
    const { blockers } = await getOwnShopDetails(request, id);

    if (blockers.length > 0) {
      throw new ApiError(422, "publish_blocked", "Some details are missing.", { blockers });
    }
    if (!isValidSlug(slug)) {
      throw new ApiError(400, "slug_invalid", "That web address can't be used.");
    }

    const { data, error } = await adminDb()
      .from("shops")
      .update({ slug, template, is_published: true })
      .eq("id", id)
      .select(SHOP_COLUMNS)
      .single();
    if (error?.code === "23505") {
      throw new ApiError(409, "slug_taken", "That web address is already taken.");
    }
    if (error) throw error;

    return ok(data);
  });

  // The slug stays reserved, so the same link works if the shop republishes.
  app.post("/api/shops/:id/unpublish", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    await getOwnShopDetails(request, id);

    const { data, error } = await adminDb()
      .from("shops")
      .update({ is_published: false })
      .eq("id", id)
      .select(SHOP_COLUMNS)
      .single();
    if (error) throw error;

    return ok(data);
  });
}
