import { getStore } from "@netlify/blobs";

// Single Netlify Blobs store; keys are namespaced by prefix.
export const PROJECTS_KEY = "projects";
// Each API key lives in its OWN blob so saving one never races/clobbers the other.
// Flat key (no slash) so it can't collide with a same-named parent on hierarchical stores.
export const settingKey = (field) => `settings-${field}`;
export const callKey = (projectId, callId) => `calls/${projectId}/${callId}`;
export const ratingKey = (projectId, callId) => `ratings/${projectId}/${callId}`;
export const transcriptKey = (projectId, id) => `transcripts/${projectId}/${id}`;
export const promptKey = (projectId, id) => `prompts/${projectId}/${id}`;
export const uploadChunkKey = (job, part) => `uploads/${job}/${part}`;
export const jobKey = (job) => `jobs/${job}`;

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
