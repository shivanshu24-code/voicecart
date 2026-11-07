"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Sarvam's real-time API accepts under 30 seconds, so turns stop before that. */
export const MAX_SECONDS = 25;

const TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

export function useRecorder(onAudio: (audio: Blob) => void, onDenied: () => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onDenied();
      return;
    }

    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const media = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
    const chunks: Blob[] = [];

    media.ondataavailable = (event) => chunks.push(event.data);
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      onAudio(new Blob(chunks, { type: media.mimeType }));
    };

    recorder.current = media;
    media.start();
    setSeconds(0);
    setRecording(true);

    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) stop();
    }, 250);
  }, [onAudio, onDenied, stop]);

  useEffect(() => stop, [stop]);

  return { recording, seconds, start, stop };
}
