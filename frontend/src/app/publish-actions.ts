"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { runAction } from "@/lib/run-action";
import { refreshStorefronts } from "@/lib/storefront-cache";

export const checkSlug = async (shopId: string, value: string) =>
  runAction(() =>
    api<{ valid: boolean; available: boolean }>(
      `/api/shops/${shopId}/slug?value=${encodeURIComponent(value)}`,
    ),
  );

export async function publishShop(shopId: string, slug: string, template: string) {
  const result = await runAction(() =>
    api(`/api/shops/${shopId}/publish`, {
      method: "POST",
      body: JSON.stringify({ slug, template }),
    }),
  );
  revalidatePath("/dashboard");
  if (result.ok) refreshStorefronts();
  return result;
}

export async function unpublishShop(shopId: string) {
  const result = await runAction(() => api(`/api/shops/${shopId}/unpublish`, { method: "POST" }));
  revalidatePath("/dashboard");
  if (result.ok) refreshStorefronts();
  return result;
}

export async function saveShopProfile(shopId: string, profile: unknown) {
  const result = await runAction(() =>
    api(`/api/shops/${shopId}/profile`, { method: "PUT", body: JSON.stringify(profile) }),
  );
  revalidatePath("/dashboard");
  if (result.ok) refreshStorefronts();
  return result;
}

export async function saveBranding(
  shopId: string,
  branding: { logo_url?: string | null; banner_url?: string | null },
) {
  const result = await runAction(() =>
    api(`/api/shops/${shopId}`, { method: "PATCH", body: JSON.stringify(branding) }),
  );
  if (result.ok) refreshStorefronts();
  return result;
}

export async function saveTemplate(shopId: string, template: string) {
  const result = await runAction(() =>
    api(`/api/shops/${shopId}`, { method: "PATCH", body: JSON.stringify({ template }) }),
  );
  if (result.ok) refreshStorefronts();
  return result;
}
