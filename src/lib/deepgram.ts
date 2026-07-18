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

export const MAX_AUDIO_BYTES = 2 * 1024 * 1024 * 1024; // Deepgram's 2 GB ceiling
const CHUNK = 4 * 1024 * 1024; // stay under Netlify's ~6 MB function-body limit

export type TranscribeProgress = { phase: "upload" | "transcribe"; pct: number };

/**
 * Transcribe any-size local audio. Deepgram blocks browser REST (CORS) and
 * Netlify caps a function body at ~6 MB, so the file is chunk-uploaded into
 * Netlify Blobs, a 15-minute background function feeds the whole file to
 * Deepgram, and we poll for the diarized result. No size limit but Deepgram's 2 GB.
 */
export async function transcribeFile(
  file: File,
  onProgress?: (p: TranscribeProgress) => void
): Promise<Assembled> {
  if (file.size > MAX_AUDIO_BYTES) throw new FileTooLargeError();

  const job = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`).replace(/-/g, "");
  const parts = Math.max(1, Math.ceil(file.size / CHUNK));

  // 1. Chunk the file past Netlify's 6 MB wall into Blobs.
  for (let i = 0; i < parts; i++) {
    const chunk = file.slice(i * CHUNK, (i + 1) * CHUNK);
    const res = await fetch(`/.netlify/functions/upload-chunk?job=${job}&part=${i}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    onProgress?.({ phase: "upload", pct: Math.round(((i + 1) / parts) * 100) });
  }

  // 2. Kick off the background transcription (returns 202).
  const q = new URLSearchParams({ job, parts: String(parts), type: file.type || "audio/*", name: file.name });
  const trig = await fetch(`/.netlify/functions/transcribe-large-background?${q.toString()}`, { method: "POST" });
  if (!trig.ok && trig.status !== 202) throw new Error(`Could not start transcription (${trig.status})`);
  onProgress?.({ phase: "transcribe", pct: 0 });

  // 3. Poll for the diarized result.
  const deadline = Date.now() + 16 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await fetch(`/.netlify/functions/transcription-status?job=${job}`);
    if (!s.ok) continue;
    const j = await s.json();
    if (j.status === "done") return j.result as Assembled;
    if (j.status === "error") {
      if (j.error === "no_key") throw new NoDeepgramKeyError();
      throw new Error(j.error || "Transcription failed");
    }
  }
  throw new Error("Transcription timed out");
}
