import { writeJSON, getVoiceStore, settingKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

const clean = (v) => (typeof v === "string" ? v.trim().slice(0, 400) : undefined);

// Store the owner's pasted API keys server-side, one blob per key (no shared
// read-modify-write, so saving Deepgram + Gemini in quick succession can't race).
// Only keys present in the body are touched; an explicit empty string clears one.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  for (const field of ["deepgram", "gemini"]) {
    const v = clean(body[field]);
    if (v === undefined) continue; // not provided → leave as-is
    if (v) await writeJSON(settingKey(field), v);
    else await getVoiceStore().delete(settingKey(field)); // empty string → clear
  }
  return json({ ok: true });
};
