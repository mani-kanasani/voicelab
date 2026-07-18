import { readJSON, writeJSON, PROJECTS_KEY, listKeys, getVoiceStore } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";
import { hasValidAccess } from "../lib/auth.mjs";

function newProject(name) {
  return {
    id: crypto.randomUUID(),
    name: (name && name.trim()) || "Untitled project",
    webhookToken: crypto.randomUUID().replace(/-/g, ""),
    createdAt: new Date().toISOString(),
  };
}

export default async (req) => {
  if (!hasValidAccess(req)) return json({ error: "unauthorized" }, 401);
  let projects = await readJSON(PROJECTS_KEY, []);

  if (req.method === "GET") {
    if (!projects.length) {
      projects = [newProject("My First Project")];
      await writeJSON(PROJECTS_KEY, projects);
    }
    return json(projects);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const p = newProject(typeof body.name === "string" ? body.name : "");
    projects.push(p);
    await writeJSON(PROJECTS_KEY, projects);
    return json(p, 201);
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    const p = projects.find((x) => x.id === body.id);
    if (!p) return json({ error: "not found" }, 404);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    p.name = name || p.name;
    await writeJSON(PROJECTS_KEY, projects);
    return json(p);
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return json({ error: "id required" }, 400);
    projects = projects.filter((x) => x.id !== id);
    await writeJSON(PROJECTS_KEY, projects);
    const store = getVoiceStore();
    for (const prefix of [`calls/${id}/`, `ratings/${id}/`, `transcripts/${id}/`, `prompts/${id}/`]) {
      for (const key of await listKeys(prefix)) await store.delete(key);
    }
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
};
