import { ApiError } from "../lib/errors.js";

const TIMEOUT_MS = 30_000;

/** One bounded retry for temporary provider failures; bad requests never retry. */
export async function fetchWithRetry(url: string, build: () => RequestInit, failureCode: string) {
  for (let attempt = 0; ; attempt += 1) {
    const last = attempt === 1;
    try {
      const response = await fetch(url, { ...build(), signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.ok) return response;
      if (!last && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      throw new ApiError(502, failureCode, `Provider responded with ${response.status}.`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (last) throw new ApiError(502, failureCode, "The provider could not be reached.");
    }
  }
}
