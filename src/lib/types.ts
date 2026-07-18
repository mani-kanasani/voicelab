export type Project = {
  id: string;
  name: string;
  webhookToken: string;
  createdAt: string;
};

export type RatingQuality = "bad" | "weak" | "good" | "perfect";
export type RatingLatency = "fast" | "normal" | "slow";

export type Rating = {
  quality: RatingQuality;
  latency: RatingLatency | null;
  note: string | null;
  ratedAt: string;
};

export type Call = {
  callId: string;
  projectId: string;
  direction: "inbound" | "outbound" | null;
  fromNumber: string | null;
  toNumber: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  outcome: string | null;
  disconnectReason: string | null;
  summary: string | null;
  sentiment: string | null;
  callSuccessful: boolean | null;
  callAnalysis: unknown | null;
  rawPayload: unknown | null;
  receivedAt: string;
  rating: Rating | null;
};

export type Utterance = { speaker: number; start: number; end: number; text: string };

export type Transcript = {
  id: string;
  projectId: string;
  filename: string;
  durationSeconds: number | null;
  createdAt: string;
  utterances: Utterance[];
  plainText: string;
};

export type SavedPrompt = {
  id: string;
  projectId: string;
  title: string;
  vertical: string;
  direction: "inbound" | "outbound";
  capabilities: string[];
  description: string;
  prompt: string;
  createdAt: string;
};
