import { readJSON, writeJSON, callKey, ratingKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

const QUALITY = ["bad", "weak", "good", "perfect"];
const LATENCY = ["fast", "normal", "slow"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const callId = typeof body.callId === "string" ? body.callId : "";
  const { quality } = body;
  const latency = body.latency ?? null;
  const note = typeof body.note === "string" ? body.note : "";

  if (!projectId || projectId.length > 256 || !callId || callId.length > 256)
    return json({ error: "invalid project or call id" }, 400);
  if (!QUALITY.includes(quality)) return json({ error: "invalid quality" }, 400);
  if (latency && !LATENCY.includes(latency)) return json({ error: "invalid latency" }, 400);
  const needsNote = quality === "bad" || quality === "weak";
  if (needsNote && !note.trim()) return json({ error: "note required for bad/weak" }, 400);

  const call = await readJSON(callKey(projectId, callId), null);
  if (!call) return json({ error: "call not found" }, 404);

  // Write the rating to its OWN blob — never rewrite the call object (which the
  // webhook may be concurrently updating).
  const rating = { quality, latency: latency || null, note: note.trim() || null, ratedAt: new Date().toISOString() };
  await writeJSON(ratingKey(projectId, callId), { callId, projectId, rating });
  return json({ ...call, rating });
};
