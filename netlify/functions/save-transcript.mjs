import { writeJSON, transcriptKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId || projectId.length > 256) return json({ error: "project required" }, 400);

  const t = {
    id: crypto.randomUUID(),
    projectId,
    filename: typeof body.filename === "string" ? body.filename : "audio",
    durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : null,
    createdAt: new Date().toISOString(),
    utterances: Array.isArray(body.utterances) ? body.utterances : [],
    plainText: typeof body.plainText === "string" ? body.plainText : "",
  };
  await writeJSON(transcriptKey(projectId, t.id), t);
  return json(t, 201);
};
