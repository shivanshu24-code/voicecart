import type { FastifyRequest } from "fastify";
import { createSpeechProvider } from "../ai/speech.js";
import { consumeAiQuota, recordAiUsage } from "../lib/admin.js";
import { ApiError } from "../lib/errors.js";

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];

/** Audio stays in memory and goes to the provider; it is never stored. */
export async function transcribeUpload(request: FastifyRequest, shopId: string) {
  const file = await request.file({ limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } });
  if (!file) throw new ApiError(400, "audio_missing", "No audio was uploaded.");

  const mimeType = file.mimetype.split(";")[0] ?? "";
  if (!AUDIO_TYPES.includes(mimeType)) {
    throw new ApiError(415, "audio_unsupported", "This audio format isn't supported.");
  }

  let audio: Buffer;
  try {
    audio = await file.toBuffer();
  } catch {
    throw new ApiError(413, "audio_too_large", "That recording is too long.");
  }

  await consumeAiQuota(request.user.id);
  const speech = createSpeechProvider();
  const { text, language } = await speech.transcribe(audio, mimeType);
  await recordAiUsage({
    user_id: request.user.id,
    shop_id: shopId,
    provider: speech.name,
    operation: "transcribe",
    audio_bytes: audio.length,
  });

  return { text, language };
}
