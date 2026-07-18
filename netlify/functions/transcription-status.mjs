import { readJSON, jobKey } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

const okJob = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(s);

export default async (req) => {
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);
  const job = new URL(req.url).searchParams.get("job");
  if (!okJob(job)) return json({ error: "bad job" }, 400);
  // No job blob yet → the background function hasn't written its first status.
  const j = await readJSON(jobKey(job), null);
  return json(j ?? { status: "processing" });
};
