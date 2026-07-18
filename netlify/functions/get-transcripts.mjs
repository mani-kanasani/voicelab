import { readJSON, listKeys } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

export default async (req) => {
  const projectId = new URL(req.url).searchParams.get("project");
  if (!projectId) return json({ error: "project required" }, 400);

  const keys = await listKeys(`transcripts/${projectId}/`);
  const items = (await Promise.all(keys.map((k) => readJSON(k, null)))).filter(Boolean);
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return json(items);
};
