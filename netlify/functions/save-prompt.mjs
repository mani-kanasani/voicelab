import { writeJSON, promptKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!projectId || projectId.length > 256) return json({ error: "project required" }, 400);
  if (!prompt) return json({ error: "prompt required" }, 400);

  const p = {
    id: crypto.randomUUID(),
    projectId,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : "Untitled prompt",
    vertical: typeof body.vertical === "string" ? body.vertical.slice(0, 80) : "",
    direction: body.direction === "outbound" ? "outbound" : "inbound",
    capabilities: Array.isArray(body.capabilities) ? body.capabilities.filter((c) => typeof c === "string").slice(0, 20).map((c) => c.slice(0, 100)) : [],
    description: typeof body.description === "string" ? body.description.slice(0, 4000) : "",
    prompt: prompt.slice(0, 20000),
    createdAt: new Date().toISOString(),
  };
  await writeJSON(promptKey(projectId, p.id), p);
  return json(p, 201);
};
