// Server-side Deepgram proxy. Deepgram blocks REST calls from the browser (CORS),
// so transcription is forwarded from a Netlify Function (server → Deepgram, no CORS).
// Returns the raw Deepgram response; the browser assembles it via assembleTranscript().

export async function transcribeAudio(apiKey, body, contentType) {
  const params = new URLSearchParams({
    model: "nova-2",
    diarize: "true",
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType || "audio/*",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`deepgram ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Server-side mirror of src/lib/deepgram.ts assembleTranscript — used by the
// background function so it stores a compact diarized transcript, not raw JSON.
export function assembleTranscript(dg) {
  const durationSeconds = typeof dg?.metadata?.duration === "number" ? Math.round(dg.metadata.duration) : null;
  let utterances = [];
  if (Array.isArray(dg?.results?.utterances) && dg.results.utterances.length) {
    utterances = dg.results.utterances.map((u) => ({
      speaker: typeof u.speaker === "number" ? u.speaker : 0,
      start: typeof u.start === "number" ? u.start : 0,
      end: typeof u.end === "number" ? u.end : 0,
      text: String(u.transcript ?? "").trim(),
    }));
  } else {
    const words = dg?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    let cur = null;
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
