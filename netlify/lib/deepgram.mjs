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
