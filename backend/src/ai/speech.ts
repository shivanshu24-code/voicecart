import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
import { fetchWithRetry } from "./retry.js";

export interface SpeechProvider {
  readonly name: string;
  transcribe(audio: Buffer, mimeType: string): Promise<{ text: string; language: string | null }>;
}

class SarvamSpeechProvider implements SpeechProvider {
  readonly name = "sarvam";

  constructor(private readonly apiKey: string) {}

  async transcribe(audio: Buffer, mimeType: string) {
    const response = await fetchWithRetry(
      "https://api.sarvam.ai/speech-to-text",
      () => {
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "speech");
        form.append("language_code", "unknown");
        return { method: "POST", headers: { "api-subscription-key": this.apiKey }, body: form };
      },
      "speech_failed",
    );

    const body = (await response.json()) as { transcript: string; language_code: string | null };
    return { text: body.transcript.trim(), language: body.language_code };
  }
}

export function createSpeechProvider(): SpeechProvider {
  if (!config.sarvamKey) {
    throw new ApiError(503, "speech_not_configured", "Speech is not configured on the server.");
  }
  return new SarvamSpeechProvider(config.sarvamKey);
}
