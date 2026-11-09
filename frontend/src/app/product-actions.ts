"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { ProductPayload } from "@/lib/product-draft";
import { runAction } from "@/lib/run-action";
import { refreshStorefronts } from "@/lib/storefront-cache";
import type { ProductRow } from "@/lib/storefront";
import type { Product } from "@/lib/voice-types";

type UploadSignature = Record<string, string> & { cloud_name: string };

export const getUploadSignature = async (shopId: string) =>
  runAction(() => api<UploadSignature>(`/api/shops/${shopId}/uploads/signature`, { method: "POST" }));

const path = (shopId: string, rest = "") => `/api/shops/${shopId}/products${rest}`;

export async function createProduct(shopId: string, product: ProductPayload) {
  const result = await runAction(() =>
    api<ProductRow>(path(shopId), { method: "POST", body: JSON.stringify(product) }),
  );
  revalidatePath("/dashboard");
  if (result.ok) refreshStorefronts();
  return result;
}

export async function updateProduct(shopId: string, id: string, product: ProductPayload) {
  const result = await runAction(() =>
    api<ProductRow>(path(shopId, `/${id}`), { method: "PATCH", body: JSON.stringify(product) }),
  );
  if (result.ok) refreshStorefronts();
  return result;
}

export async function deleteProduct(shopId: string, id: string) {
  const result = await runAction(() => api(path(shopId, `/${id}`), { method: "DELETE" }));
  revalidatePath("/dashboard");
  if (result.ok) refreshStorefronts();
  return result;
}

export async function reorderProducts(shopId: string, ids: string[]) {
  const result = await runAction(() =>
    api(path(shopId, "/reorder"), { method: "POST", body: JSON.stringify({ ids }) }),
  );
  if (result.ok) refreshStorefronts();
  return result;
}

export const transcribeProducts = async (shopId: string, form: FormData) =>
  runAction(() => api<{ text: string }>(path(shopId, "/transcribe"), { method: "POST", body: form }));

export const readProductPhoto = async (shopId: string, form: FormData) =>
  runAction(() => api<{ text: string }>(path(shopId, "/read-photo"), { method: "POST", body: form }));

export const extractProducts = async (shopId: string, text: string, language: string) =>
  runAction(() =>
    api<Product[]>(path(shopId, "/extract"), {
      method: "POST",
      body: JSON.stringify({ text, language }),
    }),
  );
