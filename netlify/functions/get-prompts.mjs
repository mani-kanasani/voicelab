import { readJSON, listKeys } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

export default async (req) => {
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);
  const projectId = new URL(req.url).searchParams.get("project");
  if (!projectId) return json({ error: "project required" }, 400);

  const keys = await listKeys(`prompts/${projectId}/`);
  const items = (await Promise.all(keys.map((k) => readJSON(k, null)))).filter(Boolean);
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return json(items);
};
