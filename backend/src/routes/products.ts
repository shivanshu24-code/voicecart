import type { FastifyInstance, FastifyRequest } from "fastify";
import { createLLMProvider } from "../ai/llm.js";
import { consumeAiQuota, recordAiUsage } from "../lib/admin.js";
import { requireUser } from "../lib/auth.js";
import { ApiError, ok } from "../lib/errors.js";
import { emptyProfile } from "../schemas/onboarding.schema.js";
import {
  extractProductsSchema,
  productInputSchema,
  productParamsSchema,
  reorderSchema,
} from "../schemas/product.schema.js";
import { shopIdSchema } from "../schemas/shop.schema.js";
import { assertShopImages, productImages } from "../services/images.js";
import { mergeExtraction } from "../services/merge.js";
import { productRow } from "../services/pricing.js";
import { readPhotoUpload } from "../services/read-photo.js";
import { transcribeUpload } from "../services/transcribe.js";

const MAX_PRODUCTS = 200;

/** Reads through the caller's RLS client, so another owner's shop looks missing. */
async function requireOwnShop(request: FastifyRequest, id: string) {
  const { data, error } = await request.db.from("shops").select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "shop_not_found", "Shop not found.");
}

async function listProducts(request: FastifyRequest, shopId: string) {
  const { data, error } = await request.db
    .from("products")
    .select("id, name, sort_order")
    .eq("shop_id", shopId);
  if (error) throw error;
  return data;
}

/** Storefronts and voice setup both treat a name as unique within a shop. */
function assertNameFree(products: { id: string; name: string }[], name: string, ownId?: string) {
  const taken = products.some(
    (product) => product.id !== ownId && product.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ApiError(409, "product_exists", "A product with this name already exists.");
}

export async function productRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.post("/api/shops/:id/products", async (request, reply) => {
    const { id } = shopIdSchema.parse(request.params);
    const input = productInputSchema.parse(request.body);
    assertShopImages(productImages(input), id);
    const [, products] = await Promise.all([requireOwnShop(request, id), listProducts(request, id)]);
    if (products.length >= MAX_PRODUCTS) {
      throw new ApiError(422, "product_limit", "This shop has reached its product limit.");
    }
    assertNameFree(products, input.name);

    const sort_order = Math.max(-1, ...products.map((product) => product.sort_order)) + 1;
    const { data, error } = await request.db
      .from("products")
      .insert({ ...productRow(input), shop_id: id, sort_order })
      .select("*")
      .single();
    if (error) throw error;

    return reply.status(201).send(ok(data));
  });

  app.patch("/api/shops/:id/products/:productId", async (request) => {
    const { id, productId } = productParamsSchema.parse(request.params);
    const input = productInputSchema.parse(request.body);
    assertShopImages(productImages(input), id);
    assertNameFree(await listProducts(request, id), input.name, productId);

    const { data, error } = await request.db
      .from("products")
      .update(productRow(input))
      .eq("id", productId)
      .eq("shop_id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "product_not_found", "Product not found.");

    return ok(data);
  });

  app.delete("/api/shops/:id/products/:productId", async (request) => {
    const { id, productId } = productParamsSchema.parse(request.params);
    const { data, error } = await request.db
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("shop_id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "product_not_found", "Product not found.");

    return ok({ id: productId });
  });

  app.post("/api/shops/:id/products/reorder", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const { ids } = reorderSchema.parse(request.body);

    const results = await Promise.all(
      ids.map((productId, sort_order) =>
        request.db.from("products").update({ sort_order }).eq("id", productId).eq("shop_id", id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return ok({ ids });
  });

  app.post("/api/shops/:id/products/transcribe", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    await requireOwnShop(request, id);
    return ok(await transcribeUpload(request, id));
  });

  app.post("/api/shops/:id/products/read-photo", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    await requireOwnShop(request, id);
    return ok(await readPhotoUpload(request, id));
  });

  // Returns drafts only. Nothing is saved until the owner confirms each one.
  app.post("/api/shops/:id/products/extract", async (request) => {
    const { id } = shopIdSchema.parse(request.params);
    const { text, language } = extractProductsSchema.parse(request.body);
    await requireOwnShop(request, id);

    await consumeAiQuota(request.user.id);
    const llm = createLLMProvider();
    const { extraction, inputTokens, outputTokens } = await llm.extractBusiness({
      text,
      profile: emptyProfile,
      lastQuestion: null,
      language,
    });
    await recordAiUsage({
      user_id: request.user.id,
      shop_id: id,
      provider: llm.name,
      operation: "extract",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

    return ok(mergeExtraction(emptyProfile, extraction, text).profile.products);
  });
}
