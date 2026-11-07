import type { FastifyInstance, FastifyRequest } from "fastify";
import { createLLMProvider } from "../ai/llm.js";
import { adminDb, consumeAiQuota, recordAiUsage } from "../lib/admin.js";
import { requireUser } from "../lib/auth.js";
import { ApiError, ok } from "../lib/errors.js";
import {
  businessProfileSchema,
  completeSchema,
  emptyProfile,
  messageSchema,
  sessionIdSchema,
  startSessionSchema,
} from "../schemas/onboarding.schema.js";
import { mergeExtraction } from "../services/merge.js";
import { productRow } from "../services/pricing.js";
import { firstQuestion, missingFields, nextQuestion } from "../services/questions.js";
import { transcribeUpload } from "../services/transcribe.js";

type Session = {
  id: string;
  shop_id: string;
  status: string;
  language: "en" | "hi";
  collected_data: unknown;
};

/** Reads through the caller's RLS client, so only the owner gets a result. */
async function getOwnSession(request: FastifyRequest, id: string) {
  const { data, error } = await request.db
    .from("onboarding_sessions")
    .select("id, shop_id, status, language, collected_data")
    .eq("id", id)
    .maybeSingle<Session>();
  if (error) throw error;
  if (!data) throw new ApiError(404, "session_not_found", "Setup session not found.");
  return data;
}

const getActiveSession = async (request: FastifyRequest, id: string) => {
  const session = await getOwnSession(request, id);
  if (session.status !== "active") {
    throw new ApiError(409, "session_closed", "This setup is already finished.");
  }
  return session;
};

const readProfile = (session: Session) => {
  const parsed = businessProfileSchema.safeParse(session.collected_data);
  return parsed.success ? parsed.data : emptyProfile;
};

async function addMessage(sessionId: string, role: "user" | "assistant", content: string) {
  const { error } = await adminDb()
    .from("messages")
    .insert({ session_id: sessionId, role, content });
  if (error) throw error;
}

async function sessionView(request: FastifyRequest, session: Session) {
  const { data, error } = await request.db
    .from("messages")
    .select("id, role, content")
    .eq("session_id", session.id)
    .order("created_at");
  if (error) throw error;

  const profile = readProfile(session);
  return {
    id: session.id,
    status: session.status,
    profile,
    missing: missingFields(profile),
    messages: data,
  };
}

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.post("/api/onboarding", async (request, reply) => {
    const { shopId, language } = startSessionSchema.parse(request.body);

    const { data: shop, error: shopError } = await request.db
      .from("shops")
      .select("id, name, category")
      .eq("id", shopId)
      .maybeSingle();
    if (shopError) throw shopError;
    if (!shop) throw new ApiError(404, "shop_not_found", "Shop not found.");

    const { data: active, error: activeError } = await request.db
      .from("onboarding_sessions")
      .select("id, shop_id, status, language, collected_data")
      .eq("shop_id", shopId)
      .eq("status", "active")
      .maybeSingle<Session>();
    if (activeError) throw activeError;
    if (active) return ok(await sessionView(request, active));

    const { data: session, error } = await adminDb()
      .from("onboarding_sessions")
      .insert({
        shop_id: shopId,
        owner_id: request.user.id,
        language,
        consent_at: new Date().toISOString(),
        collected_data: { ...emptyProfile, name: shop.name, category: shop.category },
      })
      .select("id, shop_id, status, language, collected_data")
      .single<Session>();
    if (error) throw error;

    await addMessage(session.id, "assistant", firstQuestion(language));
    return reply.status(201).send(ok(await sessionView(request, session)));
  });

  app.get("/api/onboarding/:id", async (request) => {
    const { id } = sessionIdSchema.parse(request.params);
    return ok(await sessionView(request, await getOwnSession(request, id)));
  });

  app.post("/api/onboarding/:id/transcribe", async (request) => {
    const { id } = sessionIdSchema.parse(request.params);
    const session = await getActiveSession(request, id);
    return ok(await transcribeUpload(request, session.shop_id));
  });

  app.post("/api/onboarding/:id/messages", async (request) => {
    const { id } = sessionIdSchema.parse(request.params);
    const { text } = messageSchema.parse(request.body);
    const session = await getActiveSession(request, id);
    const profile = readProfile(session);

    const { data: last, error: lastError } = await request.db
      .from("messages")
      .select("content")
      .eq("session_id", id)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    await consumeAiQuota(request.user.id);
    const llm = createLLMProvider();
    const { extraction, inputTokens, outputTokens } = await llm.extractBusiness({
      text,
      profile,
      lastQuestion: last?.content ?? null,
      language: session.language,
    });
    await recordAiUsage({
      user_id: request.user.id,
      shop_id: session.shop_id,
      provider: llm.name,
      operation: "extract",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

    const merged = mergeExtraction(profile, extraction, text);
    const reply = extraction.clarification ?? nextQuestion(merged.profile, session.language);

    const { data: updated, error } = await adminDb()
      .from("onboarding_sessions")
      .update({ collected_data: merged.profile })
      .eq("id", id)
      .select("id, shop_id, status, language, collected_data")
      .single<Session>();
    if (error) throw error;

    await addMessage(id, "user", text);
    await addMessage(id, "assistant", reply);

    return ok(await sessionView(request, updated));
  });

  app.post("/api/onboarding/:id/complete", async (request) => {
    const { id } = sessionIdSchema.parse(request.params);
    const shop = completeSchema.parse(request.body);
    await getActiveSession(request, id);

    const confirmed = ["name", "category", "description", "phone", "whatsapp", "address"] as const;
    const { data, error } = await adminDb().rpc("commit_onboarding", {
      p_session: id,
      p_owner: request.user.id,
      p_profile: {
        ...shop,
        confirmed_fields: Object.fromEntries(
          [...confirmed.filter((field) => shop[field]), "hours", "products"].map((field) => [
            field,
            true,
          ]),
        ),
        products: shop.products.map((product, sort_order) => ({ ...productRow(product), sort_order })),
      },
    });
    if (error) throw error;

    return ok({ shopId: data as string });
  });
}
