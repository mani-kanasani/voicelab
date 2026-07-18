import { getVoiceStore, transcriptKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project");
  const id = url.searchParams.get("id");
  if (!projectId || !id) return json({ error: "project and id required" }, 400);
  await getVoiceStore().delete(transcriptKey(projectId, id));
  return json({ ok: true });
};
