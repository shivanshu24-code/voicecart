"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { runAction } from "@/lib/run-action";
import type { Profile, Session } from "@/lib/voice-types";

export const startSession = async (shopId: string, language: string) =>
  runAction(() =>
    api<Session>("/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ shopId, language, consent: true }),
    }),
  );

export const transcribeAudio = async (sessionId: string, form: FormData) =>
  runAction(() =>
    api<{ text: string }>(`/api/onboarding/${sessionId}/transcribe`, {
      method: "POST",
      body: form,
    }),
  );

export const sendAnswer = async (sessionId: string, text: string) =>
  runAction(() =>
    api<Session>(`/api/onboarding/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  );

export async function completeSetup(sessionId: string, profile: Profile) {
  const result = await runAction(() =>
    api<{ shopId: string }>(`/api/onboarding/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify(profile),
    }),
  );
  if (result.ok) revalidatePath("/dashboard");
  return result;
}
