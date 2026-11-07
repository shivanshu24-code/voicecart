import "server-only";
import { apiUrl } from "@/lib/api-url";
import { createClient } from "@/lib/supabase/server";

export type Shop = {
  id: string;
  name: string;
  slug: string | null;
  category: "grocery" | "clothing" | "electronics" | "bakery" | "other";
  is_published: boolean;
  product_count: number;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/** Calls the backend as the signed-in user. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${apiUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      // Only JSON bodies say so: the backend rejects JSON with nothing in it, and
      // fetch sets the multipart boundary itself when the body is FormData.
      ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
      // Passed through only; the backend verifies this token with Supabase.
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });

  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) throw new Error(body.error.code);
  return body.data;
}
