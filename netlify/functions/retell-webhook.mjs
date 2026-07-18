import { parseRetellEvent, mergeCall, verifyHmac } from "../lib/retell.mjs";
import { readJSON, writeJSON, callKey, PROJECTS_KEY } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const token = new URL(req.url).searchParams.get("token");
  const projects = await readJSON(PROJECTS_KEY, []);
  const project = projects.find((p) => p.webhookToken === token);
  if (!project) return new Response("unknown token", { status: 401 });

  const raw = await req.text();
  const sig = req.headers.get("x-retell-signature");
  const v = await verifyHmac(raw, sig, process.env.RETELL_API_KEY);
  if (!v.ok) return new Response(`signature: ${v.reason}`, { status: 401 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const { eventType, callId, fields } = parseRetellEvent(body);
  // Ack (don't trigger Retell retries) but skip storage for missing/oversized ids.
  if (!callId || typeof callId !== "string" || callId.length > 256) return json({ ok: true, note: "no/invalid call_id" });

  const key = callKey(project.id, callId);
  const existing = await readJSON(key, null);
  const merged = mergeCall(existing, fields, eventType);
  merged.callId = callId;
  merged.projectId = project.id;
  try {
    await writeJSON(key, merged);
  } catch {
    return json({ error: "store_failed" }, 500);
  }

  return json({ ok: true });
};
