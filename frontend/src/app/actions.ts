"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { PRIVACY_VERSION } from "@/lib/consent";
import { isAuthConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isLocale, localeCookie } from "@/i18n/config";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;

  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export type CreateShopState = { failed: boolean };

export async function createShop(
  _previous: CreateShopState,
  formData: FormData,
): Promise<CreateShopState> {
  let shop: { id: string };
  try {
    shop = await api<{ id: string }>("/api/shops", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        category: formData.get("category"),
      }),
    });
  } catch {
    return { failed: true };
  }

  revalidatePath("/dashboard");
  // Owners see the designs first, before describing their shop.
  redirect(`/dashboard/shops/${shop.id}/publish`);
}

export async function signOut() {
  if (isAuthConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function acceptPrivacy() {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { privacy_version: PRIVACY_VERSION, privacy_accepted_at: new Date().toISOString() },
  });
  if (error) redirect("/consent?error=1");

  // Sign-in checks read the token, so it must carry the agreement before moving on.
  await supabase.auth.refreshSession();
  redirect("/dashboard");
}
