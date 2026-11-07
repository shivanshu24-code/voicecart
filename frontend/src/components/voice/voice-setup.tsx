"use client";

import { Mic, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type CSSProperties } from "react";
import { sendAnswer, startSession, transcribeAudio } from "@/app/voice-actions";
import type { Session } from "@/lib/voice-types";
import { ReviewForm } from "./review-form";
import { MAX_SECONDS, useRecorder } from "./use-recorder";

const bars = [40, 70, 100, 55, 85, 45, 95, 60, 75, 40];

const errorKey = (code: string) => {
  if (code === "ai_quota_exceeded") return "quota";
  if (code === "audio_too_large") return "tooLong";
  return "failed";
};

export function VoiceSetup({ shopId }: { shopId: string }) {
  const t = useTranslations("setup");
  const locale = useLocale();

  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"start" | "transcribe" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const sessionId = session?.id;

  const onAudio = useCallback(
    async (audio: Blob) => {
      if (!sessionId) return;
      setBusy("transcribe");
      setError(null);

      const form = new FormData();
      form.append("audio", audio, "speech");
      const result = await transcribeAudio(sessionId, form);

      setBusy(null);
      if (!result.ok) setError(errorKey(result.code));
      else if (!result.data.text) setError("noSpeech");
      else setDraft((current) => [current, result.data.text].filter(Boolean).join(" "));
    },
    [sessionId],
  );

  const onDenied = useCallback(() => setError("micDenied"), []);
  const { recording, seconds, start, stop } = useRecorder(onAudio, onDenied);

  async function begin() {
    setBusy("start");
    setError(null);
    const result = await startSession(shopId, locale);
    setBusy(null);
    if (result.ok) setSession(result.data);
    else setError(errorKey(result.code));
  }

  async function send() {
    if (!sessionId) return;
    setBusy("send");
    setError(null);
    const result = await sendAnswer(sessionId, draft);
    setBusy(null);
    if (result.ok) {
      setSession(result.data);
      setDraft("");
    } else {
      setError(errorKey(result.code));
    }
  }

  const alert = error && (
    <p role="alert" className="mt-4 text-sm text-accent">
      {t(`errors.${error}`)}
    </p>
  );

  if (!session) {
    return (
      <section className="mt-8 max-w-xl border-t border-line pt-8">
        <h2 className="font-display text-2xl">{t("consent.title")}</h2>
        <p className="mt-3 leading-relaxed text-muted">{t("consent.body")}</p>
        <button
          type="button"
          onClick={begin}
          disabled={busy !== null}
          className="mt-6 rounded-md bg-brand px-5 py-2.5 font-medium text-paper transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          {t("consent.agree")}
        </button>
        {alert}
      </section>
    );
  }

  if (reviewing) {
    return <ReviewForm sessionId={session.id} profile={session.profile} onBack={() => setReviewing(false)} />;
  }

  const question = session.messages.findLast((message) => message.role === "assistant")?.content;
  const { profile, missing } = session;
  const known = [
    { label: t("fields.name"), value: profile.name },
    { label: t("fields.phone"), value: profile.phone ?? profile.whatsapp },
    { label: t("fields.address"), value: profile.address },
    { label: t("fields.hours"), value: profile.hours.length ? t("days", { count: new Set(profile.hours.map((hour) => hour.day_of_week)).size }) : null },
    { label: t("fields.products"), value: profile.products.length ? profile.products.map((product) => product.name).join(", ") : null },
  ];

  return (
    <div className="mt-8 grid gap-10 border-t border-line pt-8 lg:grid-cols-[1.5fr_1fr]">
      <section>
        <p aria-live="polite" className="font-display text-2xl leading-snug md:text-[1.7rem]">
          {question}
        </p>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={recording ? stop : start}
            disabled={busy !== null}
            aria-label={recording ? t("stop") : t("record")}
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-paper transition-colors hover:bg-brand-dark disabled:opacity-40"
          >
            {recording ? <Square aria-hidden size={18} /> : <Mic aria-hidden size={20} strokeWidth={1.5} />}
          </button>

          {recording ? (
            <div className="flex items-center gap-3">
              <div aria-hidden className="flex h-7 items-center gap-1">
                {bars.map((height, i) => (
                  <span
                    key={i}
                    className="voice-bar w-[2px] rounded-full bg-brand"
                    style={{ "--i": i, height: `${height}%` } as CSSProperties}
                  />
                ))}
              </div>
              <span className="text-sm text-muted tabular-nums">
                {seconds}s / {MAX_SECONDS}s
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted">
              {busy === "transcribe" ? t("transcribing") : t("hint")}
            </span>
          )}
        </div>

        <label className="mt-8 block text-sm text-muted">
          {t("answerLabel")}
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t("answerPlaceholder")}
            className="mt-2 w-full rounded-md border border-line bg-card p-3 text-base text-ink"
          />
        </label>

        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || busy !== null || recording}
          className="mt-3 rounded-md bg-brand px-5 py-2.5 font-medium text-paper transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          {busy === "send" ? t("sending") : t("send")}
        </button>
        {alert}
      </section>

      <aside>
        <h2 className="text-sm text-muted">{t("sofar")}</h2>
        <dl className="mt-3 border-t border-line">
          {known.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-6 border-b border-line py-3">
              <dt className="shrink-0 text-sm text-muted">{label}</dt>
              <dd className="min-w-0 text-right text-sm break-words">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className={`mt-5 w-full rounded-md px-4 py-2.5 font-medium transition-colors ${
            missing.length === 0
              ? "bg-brand text-paper hover:bg-brand-dark"
              : "border border-line bg-card hover:border-muted"
          }`}
        >
          {t("review")}
        </button>
      </aside>
    </div>
  );
}
