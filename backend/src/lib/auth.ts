import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";
import { config } from "../config.js";
import { ApiError } from "./errors.js";

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string };
    /** Supabase client acting as the caller, so RLS applies to every query. */
    db: SupabaseClient;
  }
}

export async function requireUser(request: FastifyRequest) {
  const { supabaseUrl, supabaseKey } = config;
  if (!supabaseUrl || !supabaseKey) {
    throw new ApiError(503, "auth_not_configured", "Supabase is not configured on the server.");
  }

  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  }

  const db = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Verifies the token's signature and expiry against Supabase's public key.
  // The key is cached, so this normally needs no network trip.
  const { data, error } = await db.auth.getClaims(token);
  if (error || !data?.claims.sub) {
    throw new ApiError(401, "unauthenticated", "Your session has expired. Sign in again.");
  }

  request.user = { id: data.claims.sub };
  request.db = db;
}
