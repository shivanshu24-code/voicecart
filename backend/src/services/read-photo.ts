import type { FastifyRequest } from "fastify";
import { createLLMProvider } from "../ai/llm.js";
import { consumeAiQuota, recordAiUsage } from "../lib/admin.js";
import { ApiError } from "../lib/errors.js";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Turns a photo of a rate list or bill into plain text the owner can check and
 * correct before products are made from it. The photo is never stored.
 */
export async function readPhotoUpload(request: FastifyRequest, shopId: string) {
  const file = await request.file({ limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } });
  if (!file) throw new ApiError(400, "photo_missing", "No photo was uploaded.");

  const mimeType = file.mimetype.split(";")[0] ?? "";
  if (!PHOTO_TYPES.includes(mimeType)) {
    throw new ApiError(415, "photo_unsupported", "This photo format isn't supported.");
  }

  let photo: Buffer;
  try {
    photo = await file.toBuffer();
  } catch {
    throw new ApiError(413, "photo_too_large", "That photo is too large.");
  }

  await consumeAiQuota(request.user.id);
  const llm = createLLMProvider();
  const { text, inputTokens, outputTokens } = await llm.readPhoto(photo, mimeType);
  await recordAiUsage({
    user_id: request.user.id,
    shop_id: shopId,
    provider: llm.name,
    operation: "read_photo",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });

  return { text };
}
