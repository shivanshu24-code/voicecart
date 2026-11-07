export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isAuthConfigured = Boolean(supabaseUrl && supabaseKey);

/** Sample-data mode. Local development only, so it can never open up production. */
export const isPreview = !isAuthConfigured && process.env.NODE_ENV === "development";
