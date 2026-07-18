import { readJSON, listKeys } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

export default async (req) => {
  const projectId = new URL(req.url).searchParams.get("project");
  if (!projectId) return json({ error: "project required" }, 400);

  const keys = await listKeys(`calls/${projectId}/`);
  const calls = (await Promise.all(keys.map((k) => readJSON(k, null)))).filter(Boolean);
  calls.sort((a, b) => {
    const ta = new Date(a.startedAt ?? a.receivedAt).getTime();
    const tb = new Date(b.startedAt ?? b.receivedAt).getTime();
    return tb - ta;
  });
  return json(calls);
};
