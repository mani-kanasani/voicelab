import type { Call, Project, Transcript, Utterance } from "./types";

const BASE = "/.netlify/functions";
const jsonHeaders = { "content-type": "application/json" };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, init);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export const getConfig = () =>
  req<{ hasDeepgram: boolean; hasPassword: boolean; hasRetellKey: boolean }>("config");

export const verifyPassword = (password: string) =>
  req<{ ok: true }>("verify-password", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ password }) });

export const listProjects = () => req<Project[]>("projects");
export const createProject = (name: string) =>
  req<Project>("projects", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name }) });
export const renameProject = (id: string, name: string) =>
  req<Project>("projects", { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ id, name }) });
export const deleteProject = (id: string) =>
  req<{ ok: true }>(`projects?id=${encodeURIComponent(id)}`, { method: "DELETE" });

export const getCalls = (projectId: string) =>
  req<Call[]>(`get-calls?project=${encodeURIComponent(projectId)}`);
export const rateCall = (input: {
  projectId: string;
  callId: string;
  quality: string;
  latency: string | null;
  note: string;
}) => req<Call>("rate-call", { method: "POST", headers: jsonHeaders, body: JSON.stringify(input) });

export const getTranscripts = (projectId: string) =>
  req<Transcript[]>(`get-transcripts?project=${encodeURIComponent(projectId)}`);
export const saveTranscript = (input: {
  projectId: string;
  filename: string;
  durationSeconds: number | null;
  utterances: Utterance[];
  plainText: string;
}) => req<Transcript>("save-transcript", { method: "POST", headers: jsonHeaders, body: JSON.stringify(input) });
export const deleteTranscript = (projectId: string, id: string) =>
  req<{ ok: true }>(`delete-transcript?project=${encodeURIComponent(projectId)}&id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
