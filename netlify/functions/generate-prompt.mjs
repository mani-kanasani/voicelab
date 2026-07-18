import { generatePrompt } from "../lib/gemini.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";
import { getKey } from "../lib/keys.mjs";

const DIRECTIONS = ["inbound", "outbound"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);
  const key = await getKey("GEMINI_API_KEY");
  if (!key) return json({ error: "no_key" }, 503);

  const body = await req.json().catch(() => ({}));
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return json({ error: "description required" }, 400);
  if (description.length > 4000) return json({ error: "description too long (max 4000 chars)" }, 400);

  const inputs = {
    description,
    direction: DIRECTIONS.includes(body.direction) ? body.direction : "inbound",
    vertical: typeof body.vertical === "string" ? body.vertical.slice(0, 80) : "",
    businessName: typeof body.businessName === "string" ? body.businessName.slice(0, 120) : "",
    agentName: typeof body.agentName === "string" ? body.agentName.slice(0, 80) : "",
    capabilities: Array.isArray(body.capabilities)
      ? body.capabilities.filter((c) => typeof c === "string").slice(0, 20).map((c) => c.slice(0, 100))
      : [],
  };

  try {
    const prompt = await generatePrompt(key, inputs);
    return json({ prompt });
  } catch (e) {
    const status = e?.status === 400 ? 400 : e?.status === 429 ? 429 : 502;
    return json({ error: "generate_failed", detail: String(e?.message || e) }, status);
  }
};
