import { getVoiceStore, uploadChunkKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

const okJob = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(s);
const okPart = (s) => typeof s === "string" && /^\d{1,5}$/.test(s);
const MAX_CHUNK = 5 * 1024 * 1024;

// One chunk of a large audio upload → stored in Blobs so a big file can get past
// Netlify's ~6 MB function-body wall a piece at a time.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);

  const u = new URL(req.url);
  const job = u.searchParams.get("job");
  const part = u.searchParams.get("part");
  if (!okJob(job) || !okPart(part)) return json({ error: "bad job/part" }, 400);

  const buf = await req.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: "empty chunk" }, 400);
  if (buf.byteLength > MAX_CHUNK) return json({ error: "chunk too large" }, 413);

  await getVoiceStore().set(uploadChunkKey(job, part), buf);
  return json({ ok: true });
};
