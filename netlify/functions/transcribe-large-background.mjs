import { getVoiceStore, uploadChunkKey, jobKey, writeJSON } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";
import { getKey } from "../lib/keys.mjs";
import { transcribeAudio, assembleTranscript } from "../lib/deepgram.mjs";

const okJob = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(s);

// Netlify BACKGROUND function (the "-background" suffix): returns 202 immediately
// and runs up to 15 minutes. Reassembles the uploaded chunks from Blobs, sends the
// whole file to Deepgram, and writes the diarized result to a job blob the client
// polls. This is how a large local recording gets transcribed with no size limit.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);

  const u = new URL(req.url);
  const job = u.searchParams.get("job");
  const parts = parseInt(u.searchParams.get("parts") || "0", 10);
  const type = u.searchParams.get("type") || "audio/*";
  const name = u.searchParams.get("name") || "audio";
  if (!okJob(job) || !(parts > 0 && parts <= 5000)) return json({ error: "bad params" }, 400);

  const store = getVoiceStore();
  await writeJSON(jobKey(job), { status: "processing", createdAt: new Date().toISOString() });

  try {
    const key = await getKey("DEEPGRAM_API_KEY");
    if (!key) throw new Error("no_key");

    // Reassemble the chunks in order.
    let total = 0;
    const bufs = [];
    for (let i = 0; i < parts; i++) {
      const ab = await store.get(uploadChunkKey(job, String(i)), { type: "arrayBuffer" });
      if (!ab) throw new Error(`missing chunk ${i}`);
      bufs.push(new Uint8Array(ab));
      total += ab.byteLength;
    }
    const merged = new Uint8Array(total);
    let off = 0;
    for (const b of bufs) {
      merged.set(b, off);
      off += b.byteLength;
    }

    const dg = await transcribeAudio(key, merged, type);
    const result = { ...assembleTranscript(dg), filename: name };
    await writeJSON(jobKey(job), { status: "done", result });
  } catch (e) {
    const msg = e?.message === "no_key" ? "no_key" : String(e?.message || e);
    await writeJSON(jobKey(job), { status: "error", error: msg });
  } finally {
    for (let i = 0; i < parts; i++) {
      try {
        await store.delete(uploadChunkKey(job, String(i)));
      } catch {
        /* best effort */
      }
    }
  }
  return json({ ok: true });
};
