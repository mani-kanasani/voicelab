import { json } from "../lib/http.mjs";

// Booleans only — never leak the actual secret values to the client.
export default async () =>
  json({
    hasDeepgram: !!process.env.DEEPGRAM_API_KEY,
    hasPassword: !!process.env.SITE_PASSWORD,
    hasRetellKey: !!process.env.RETELL_API_KEY,
  });
