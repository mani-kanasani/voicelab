import { getStore } from "@netlify/blobs";

// Single Netlify Blobs store; keys are namespaced by prefix.
export const PROJECTS_KEY = "projects";
export const callKey = (projectId, callId) => `calls/${projectId}/${callId}`;
export const ratingKey = (projectId, callId) => `ratings/${projectId}/${callId}`;
export const transcriptKey = (projectId, id) => `transcripts/${projectId}/${id}`;

export const getVoiceStore = () => getStore("voicelab");

export async function readJSON(key, fallback = null) {
  const val = await getVoiceStore().get(key, { type: "json" });
  return val ?? fallback;
}

export async function writeJSON(key, value) {
  await getVoiceStore().setJSON(key, value);
}

export async function listKeys(prefix) {
  const { blobs } = await getVoiceStore().list({ prefix });
  return blobs.map((b) => b.key);
}
