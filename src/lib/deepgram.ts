import type { Utterance } from "./types";

type Assembled = { utterances: Utterance[]; plainText: string; durationSeconds: number | null };

/**
 * Turn a Deepgram pre-recorded response into diarized utterances + plain text.
 * Prefers `results.utterances[]`; falls back to grouping words by speaker.
 */
export function assembleTranscript(dg: any): Assembled {
  const durationSeconds =
    typeof dg?.metadata?.duration === "number" ? Math.round(dg.metadata.duration) : null;

  let utterances: Utterance[] = [];

  if (Array.isArray(dg?.results?.utterances) && dg.results.utterances.length) {
    utterances = dg.results.utterances.map((u: any) => ({
      speaker: typeof u.speaker === "number" ? u.speaker : 0,
      start: typeof u.start === "number" ? u.start : 0,
      end: typeof u.end === "number" ? u.end : 0,
      text: String(u.transcript ?? "").trim(),
    }));
  } else {
    const words = dg?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    let cur: Utterance | null = null;
    for (const w of words) {
      const sp = typeof w.speaker === "number" ? w.speaker : 0;
      const word = w.punctuated_word ?? w.word ?? "";
      if (!cur || cur.speaker !== sp) {
        if (cur) utterances.push(cur);
        cur = { speaker: sp, start: w.start ?? 0, end: w.end ?? 0, text: word };
      } else {
        cur.text += " " + word;
        cur.end = w.end ?? cur.end;
      }
    }
    if (cur) utterances.push(cur);
  }

  const plainText = utterances.map((u) => `Speaker ${u.speaker + 1}: ${u.text}`).join("\n");
  return { utterances, plainText, durationSeconds };
}

export class NoDeepgramKeyError extends Error {
  constructor() {
    super("no_key");
    this.name = "NoDeepgramKeyError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super("file_too_large");
    this.name = "FileTooLargeError";
  }
}

// Netlify Functions cap request bodies at ~6 MB; stay comfortably under it.
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/**
 * Transcription runs through our own Netlify Function (Deepgram blocks browser
 * REST via CORS). The function forwards the audio to Deepgram server-side and
 * returns the raw response, which we assemble into diarized utterances here.
 */
export async function transcribeFile(file: File): Promise<Assembled> {
  if (file.size > MAX_AUDIO_BYTES) throw new FileTooLargeError();

  const res = await fetch("/.netlify/functions/transcribe", {
    method: "POST",
    headers: { "Content-Type": file.type || "audio/*" },
    body: file,
  });
  if (res.status === 503) throw new NoDeepgramKeyError();
  if (res.status === 413) throw new FileTooLargeError();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Transcription failed (${res.status})`);
  }
  return assembleTranscript(await res.json());
}
