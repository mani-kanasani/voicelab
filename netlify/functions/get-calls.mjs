import { readJSON, listKeys } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

export default async (req) => {
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);
  const projectId = new URL(req.url).searchParams.get("project");
  if (!projectId) return json({ error: "project required" }, 400);

  // Calls and ratings live in separate blobs so rating a call never races the
  // webhook that's still writing the call's transcript/analysis.
  const [callKeys, ratingKeys] = await Promise.all([
    listKeys(`calls/${projectId}/`),
    listKeys(`ratings/${projectId}/`),
  ]);
  const [calls, ratings] = await Promise.all([
    Promise.all(callKeys.map((k) => readJSON(k, null))),
    Promise.all(ratingKeys.map((k) => readJSON(k, null))),
  ]);
  const byCall = new Map(ratings.filter(Boolean).map((r) => [r.callId, r.rating]));

  const rows = calls.filter(Boolean).map((c) => ({ ...c, rating: byCall.get(c.callId) ?? null }));
  rows.sort((a, b) => {
    const ta = new Date(a.startedAt ?? a.receivedAt).getTime();
    const tb = new Date(b.startedAt ?? b.receivedAt).getTime();
    return tb - ta;
  });
  return json(rows);
};
