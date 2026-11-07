import type { ActionResult } from "@/lib/voice-types";

/** Turns a failed backend call into a result the browser can show. */
export async function runAction<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await call() };
  } catch (error) {
    return { ok: false, code: error instanceof Error ? error.message : "internal_error" };
  }
}
