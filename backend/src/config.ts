import { z } from "zod";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on real environment variables (production).
}

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  SPEECH_PROVIDER: z.enum(["sarvam"]).default("sarvam"),
  LLM_PROVIDER: z.enum(["gemini"]).default("gemini"),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(60),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const env = schema.parse(process.env);

export const config = {
  port: env.PORT,
  frontendOrigin: env.FRONTEND_ORIGIN,
  supabaseUrl: env.SUPABASE_URL || undefined,
  supabaseKey: env.SUPABASE_PUBLISHABLE_KEY || undefined,
  supabaseSecretKey: env.SUPABASE_SECRET_KEY || undefined,
  sarvamKey: env.SARVAM_API_KEY || undefined,
  geminiKey: env.GEMINI_API_KEY || undefined,
  geminiModel: env.GEMINI_MODEL,
  speechProvider: env.SPEECH_PROVIDER,
  llmProvider: env.LLM_PROVIDER,
  aiDailyLimit: env.AI_DAILY_LIMIT,
  cloudinaryCloud: env.CLOUDINARY_CLOUD_NAME || undefined,
  cloudinaryKey: env.CLOUDINARY_API_KEY || undefined,
  cloudinarySecret: env.CLOUDINARY_API_SECRET || undefined,
};

const requiredInProduction = [
  "FRONTEND_ORIGIN",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SARVAM_API_KEY",
  "GEMINI_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

/** Names what's missing, so a bad deploy stops at startup and not on a customer's visit. */
export const missingProductionSettings = (values: Record<string, string | undefined>) =>
  values.NODE_ENV === "production" ? requiredInProduction.filter((name) => !values[name]) : [];

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseKey);
