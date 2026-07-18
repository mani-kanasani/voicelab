import { readJSON, settingKey } from "./store.mjs";

// Resolve an API key from either a Netlify env var (advanced/precedence) or the
// in-app key the owner pasted (stored server-side, one blob per key). The key is
// only ever used server-side — never returned to the browser.
export const KEY_FIELD = { DEEPGRAM_API_KEY: "deepgram", GEMINI_API_KEY: "gemini" };

/** Pure precedence: env var wins, else the stored value. Trimmed. */
export function pickKey(env, stored) {
  if (typeof env === "string" && env.trim()) return env.trim();
  return typeof stored === "string" ? stored.trim() : "";
}

export async function getKey(name) {
  const field = KEY_FIELD[name];
  const stored = field ? await readJSON(settingKey(field), "") : "";
  return pickKey(process.env[name], stored);
}
