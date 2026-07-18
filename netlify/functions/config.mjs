import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

// Booleans only — never leak the actual secret values to the client.
export default async (req) =>
  json({
    hasDeepgram: !!process.env.DEEPGRAM_API_KEY,
    hasPassword: !!process.env.SITE_PASSWORD,
    hasRetellKey: !!process.env.RETELL_API_KEY,
    authed: hasValidAccess(req),
  });
