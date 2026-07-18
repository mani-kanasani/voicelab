import { transcribeAudio } from "../lib/deepgram.mjs";
import { json } from "../lib/http.mjs";

// Proxies an uploaded audio file to Deepgram (server-side, CORS-safe) and returns
// the raw Deepgram response. Bounded by Netlify's ~6 MB request-body limit — the
// client caps file size before calling this.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return json({ error: "no_key" }, 503);

  const contentType = req.headers.get("content-type") || "audio/*";
  const buf = await req.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: "empty body" }, 400);

  try {
    const dg = await transcribeAudio(key, new Uint8Array(buf), contentType);
    return json(dg);
  } catch (e) {
    const status = e?.status === 400 ? 400 : 502;
    return json({ error: "transcribe_failed", detail: String(e?.message || e) }, status);
  }
};
