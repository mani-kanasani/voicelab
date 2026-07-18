import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";
import { getKey } from "../lib/keys.mjs";

const last4 = (k) => (k ? (k.length >= 4 ? k.slice(-4) : "••••") : null);

// Booleans + a last-4 hint (only when authed) — never the actual key values.
// `*Env` tells the UI an environment variable is the ACTIVE key (it wins over an
// in-app key), so the UI can warn that an in-app change won't take effect.
export default async (req) => {
  const authed = hasValidAccess(req);
  const [dg, gem] = await Promise.all([getKey("DEEPGRAM_API_KEY"), getKey("GEMINI_API_KEY")]);
  return json({
    hasDeepgram: !!dg,
    hasGemini: !!gem,
    deepgramHint: authed ? last4(dg) : null,
    geminiHint: authed ? last4(gem) : null,
    deepgramEnv: authed && !!process.env.DEEPGRAM_API_KEY,
    geminiEnv: authed && !!process.env.GEMINI_API_KEY,
    hasPassword: !!process.env.SITE_PASSWORD,
    hasRetellKey: !!process.env.RETELL_API_KEY,
    authed,
  });
};
