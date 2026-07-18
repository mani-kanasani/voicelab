import { readJSON, writeJSON, callKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

const QUALITY = ["bad", "weak", "good", "perfect"];
const LATENCY = ["fast", "normal", "slow"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const { projectId, callId, quality, latency, note } = await req.json().catch(() => ({}));

  if (!QUALITY.includes(quality)) return json({ error: "invalid quality" }, 400);
  if (latency && !LATENCY.includes(latency)) return json({ error: "invalid latency" }, 400);
  const needsNote = quality === "bad" || quality === "weak";
  if (needsNote && !(note && note.trim())) return json({ error: "note required for bad/weak" }, 400);

  const key = callKey(projectId, callId);
  const call = await readJSON(key, null);
  if (!call) return json({ error: "call not found" }, 404);

  call.rating = {
    quality,
    latency: latency || null,
    note: (note && note.trim()) || null,
    ratedAt: new Date().toISOString(),
  };
  await writeJSON(key, call);
  return json(call);
};
