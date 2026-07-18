import { readJSON, writeJSON, PROJECTS_KEY, listKeys, getVoiceStore } from "../lib/store.mjs";
import { json } from "../lib/http.mjs";

function newProject(name) {
  return {
    id: crypto.randomUUID(),
    name: (name && name.trim()) || "Untitled project",
    webhookToken: crypto.randomUUID().replace(/-/g, ""),
    createdAt: new Date().toISOString(),
  };
}

export default async (req) => {
  let projects = await readJSON(PROJECTS_KEY, []);

  if (req.method === "GET") {
    if (!projects.length) {
      projects = [newProject("My First Project")];
      await writeJSON(PROJECTS_KEY, projects);
    }
    return json(projects);
  }

  if (req.method === "POST") {
    const { name } = await req.json().catch(() => ({}));
    const p = newProject(name);
    projects.push(p);
    await writeJSON(PROJECTS_KEY, projects);
    return json(p, 201);
  }

  if (req.method === "PATCH") {
    const { id, name } = await req.json().catch(() => ({}));
    const p = projects.find((x) => x.id === id);
    if (!p) return json({ error: "not found" }, 404);
    p.name = (name && name.trim()) || p.name;
    await writeJSON(PROJECTS_KEY, projects);
    return json(p);
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    projects = projects.filter((x) => x.id !== id);
    await writeJSON(PROJECTS_KEY, projects);
    const store = getVoiceStore();
    for (const key of await listKeys(`calls/${id}/`)) await store.delete(key);
    for (const key of await listKeys(`transcripts/${id}/`)) await store.delete(key);
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
};
