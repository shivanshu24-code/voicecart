import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";
import { ApiError } from "./errors.js";

let client: SupabaseClient | undefined;

/**
 * Bypasses RLS. Use only for server-controlled writes, and only after the
 * caller's ownership has been proven with their own RLS-scoped client.
 */
export function adminDb() {
  const { supabaseUrl, supabaseSecretKey } = config;
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new ApiError(503, "admin_not_configured", "The server is missing its Supabase secret key.");
  }
  client ??= createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Counts one AI call against today's limit, and refuses it once that's used up. */
export async function consumeAiQuota(userId: string) {
  const { data, error } = await adminDb().rpc("consume_ai_quota", {
    p_user: userId,
    p_limit: config.aiDailyLimit,
  });
  if (error) throw error;
  if (!data) {
    throw new ApiError(429, "ai_quota_exceeded", "You've reached today's limit. Try again tomorrow.");
  }
}

export async function recordAiUsage(usage: {
  user_id: string;
  shop_id: string;
  provider: string;
  operation: "transcribe" | "extract" | "read_photo";
  input_tokens?: number | null;
  output_tokens?: number | null;
  audio_bytes?: number;
}) {
  const { error } = await adminDb().from("ai_usage").insert(usage);
  if (error) throw error;
}
