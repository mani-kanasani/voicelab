import { readJSON, settingKey } from "./store.mjs";

// Resolve an API key from either a Netlify env var (advanced/precedence) or the
// in-app key the owner pasted (stored server-side, one blob per key). The key is
// only ever used server-side — never returned to the browser.
export const KEY_FIELD = { DEEPGRAM_API_KEY: "deepgram", GEMINI_API_KEY: "gemini" };

/** Pure precedence: an in-app (stored) key wins, else the env var. Trimmed.
 * In-app first so a freshly pasted key can override a stale/invalid env var. */
export function pickKey(env, stored) {
  if (typeof stored === "string" && stored.trim()) return stored.trim();
  return typeof env === "string" ? env.trim() : "";
}

export async function getKey(name) {
  const field = KEY_FIELD[name];
  const stored = field ? await readJSON(settingKey(field), "") : "";
  return pickKey(process.env[name], stored);
}
