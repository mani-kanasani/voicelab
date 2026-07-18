import { writeJSON, transcriptKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const { projectId, filename, durationSeconds, utterances, plainText } = await req.json().catch(() => ({}));
  if (!projectId) return json({ error: "project required" }, 400);

  const t = {
    id: crypto.randomUUID(),
    projectId,
    filename: filename || "audio",
    durationSeconds: durationSeconds ?? null,
    createdAt: new Date().toISOString(),
    utterances: Array.isArray(utterances) ? utterances : [],
    plainText: plainText || "",
  };
  await writeJSON(transcriptKey(projectId, t.id), t);
  return json(t, 201);
};
