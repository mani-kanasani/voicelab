# VoiceLab — Design Spec

**Date:** 2026-07-17
**Status:** Approved-in-principle (forks resolved via brainstorming), pending written-spec review
**Working name:** VoiceLab (trivially renameable — the name appears only in the shell header, page title, and repo name)

---

## 1. What this is

A **giveaway app** for a ~150-person session on advanced voice AI agents (AI-agency audience). Each attendee **deploys their own private copy** in one click and walks away owning a real, working tool with two capabilities:

1. **Testing** — paste an app-generated webhook URL into a Retell agent; the agent's call events (especially `call_analyzed`) land in the app; the attendee reviews the transcript and **rates** each call.
2. **Transcription** — drag in an audio file (MP3/M4A/WAV/…); it's transcribed with **speaker diarization**; the transcript is saved to a reusable library.

Both are organized under **Projects** (one project per client or per agent), so an agency can manage several clients from a single deploy.

### Primary success criteria (in priority order)
1. **Minimal setup / zero technical proficiency / low room for error** across 150 non-technical people.
2. Each attendee **owns** their deployed instance (it's theirs to keep and customize).
3. Looks and feels identical to FilmBros (neomorphic "neo" design system, lifted wholesale).

---

## 2. Non-goals (deliberate YAGNI)

- No multi-user accounts, teams, roles, or invites (each deploy is single-tenant / single-owner).
- No editing or provisioning of the Retell agent from the app (it only *receives* Retell's webhook).
- No analytics dashboards, no billing, no CRM features.
- No real-time/streaming transcription (file upload only).
- No separate relational database (Netlify Blobs only).
- No server we operate on the attendee's behalf (fully self-hosted per attendee).

---

## 3. Decisions locked during brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Ownership model | **Self-deploy, single-tenant** ("Deploy to Netlify" button) | Attendees own it; matches "an app they deploy." |
| Datastore | **Netlify Blobs** (built-in) | Zero DB provisioning → truly one-click deploy. |
| Auth | **None by default**; optional `SITE_PASSWORD` env var | Private instance; auth was explicitly droppable. |
| Tenancy of clients/agents | **Projects inside one deploy** (not one deploy per client) | One dashboard across an agency's clients; cheap with Blobs. |
| Rating scale | **Bad / Weak / Good / Perfect** + optional **Fast / Normal / Slow** latency + note | Attendee's exact words; latency is on-theme for voice QA. |
| Transcription provider | **Deepgram, bring-your-own key** (attendee pastes their free key at deploy) | Free credit ≈ hundreds of hours; diarization built-in; no shared secret in a public repo; no cost to the host. |
| Retell API key | **Not required** | Retell only POSTs to the webhook; HMAC verification is optional/off. |
| Design system | **Lift FilmBros neo layer** (`.neo-*` CSS + `neo.tsx`) | Non-negotiable per stakeholder. |

---

## 4. Architecture

**Frontend:** Static React 18 + Vite + TypeScript + Tailwind SPA. Icons `lucide-react`, motion `framer-motion`, toasts `sonner`. Served by Netlify. Client-side routing (single page with a lightweight view switch, mirroring the FilmBros `?page=` pattern or a minimal router).

**Backend:** Netlify Functions (Node, ESM). No standalone server. Functions:

| Function | Method | Purpose |
|---|---|---|
| `retell-webhook` | POST | Retell agent-level webhook receiver. Verifies project token, parses the call, upserts into Blobs. |
| `projects` | GET/POST/PATCH/DELETE | List/create/rename/delete projects. Mints each project's webhook token. |
| `get-calls` | GET | Return calls (+ ratings) for a project. |
| `rate-call` | POST | Save/update a call's rating. |
| `transcribe` | POST | Proxy an uploaded audio file to Deepgram server-side (browser REST to Deepgram is CORS-blocked) and return the raw response. (See §8.) |
| `save-transcript` | POST | Persist a finished diarized transcript for a project. |
| `get-transcripts` | GET | List a project's saved transcriptions. |
| `delete-transcript` | DELETE | Remove a saved transcription. |
| `config` | GET | Return whether `SITE_PASSWORD` / Deepgram are configured (booleans only, never secrets) so the UI can adapt. |
| `verify-password` | POST | When `SITE_PASSWORD` is set, check a submitted password server-side and issue a short-lived access cookie/token. The password is never sent to the client. |

**Storage:** Netlify Blobs (`@netlify/blobs`), namespaced by project. Zero configuration.

**Config (env vars, all optional at deploy):**
- `DEEPGRAM_API_KEY` — enables the Transcription card. If absent, the card shows a friendly "add your Deepgram key to enable" state.
- `SITE_PASSWORD` — if set, gates the whole app behind a single password screen.
- `RETELL_API_KEY` — if set, enables optional HMAC verification of the Retell webhook. Off/absent by default.

---

## 5. Data model (Netlify Blobs)

Store name: `voicelab` (single store; keys namespaced by prefix).

| Key | Shape | Notes |
|---|---|---|
| `projects` | `Project[]` | The project registry (small; single blob). |
| `calls/<projectId>/<callId>` | `Call` | One blob per call, keyed by Retell `call_id`. |
| `transcripts/<projectId>/<transcriptId>` | `Transcript` | One blob per saved transcription. |

```ts
type Project = {
  id: string;            // slug/uuid
  name: string;          // "Acme Dental" or "Ella v2"
  webhookToken: string;  // random, unguessable; embedded in the webhook URL
  createdAt: string;     // ISO
};

type Call = {
  callId: string;                 // Retell call_id (blob key)
  projectId: string;
  direction: 'inbound' | 'outbound' | null;
  fromNumber: string | null;
  toNumber: string | null;
  startedAt: string | null;       // ISO (from start_timestamp)
  endedAt: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  outcome: string | null;         // call_status
  disconnectReason: string | null;
  summary: string | null;         // call_analysis.call_summary
  sentiment: string | null;       // call_analysis.user_sentiment
  callSuccessful: boolean | null; // call_analysis.call_successful
  callAnalysis: object | null;    // raw call_analysis (incl. custom_analysis_data)
  rawPayload: object | null;      // last raw event body, for the collapsible viewer
  receivedAt: string;             // ISO, first receipt
  rating: Rating | null;
};

type Rating = {
  quality: 'bad' | 'weak' | 'good' | 'perfect';
  latency: 'fast' | 'normal' | 'slow' | null;
  note: string | null;
  ratedAt: string;                // ISO
};

type Transcript = {
  id: string;
  projectId: string;
  filename: string;
  durationSeconds: number | null;
  createdAt: string;              // ISO
  utterances: Utterance[];        // diarized
  plainText: string;              // "Speaker 1: …\nSpeaker 2: …" for copy/download
};

type Utterance = { speaker: number; start: number; end: number; text: string };
```

---

## 6. Feature: Home (card grid)

On open (after optional password gate), a neo card grid:
- **Testing** card → opens the Testing tool.
- **Transcription** card → opens the Transcription tool.
- Layout leaves room for a **third card** later.
- A **project switcher** is present app-wide (top bar): current project + dropdown to switch / "＋ New project". Both tools operate on the current project.

Empty state: if no projects exist, first-run creates a default project ("My First Project") automatically so nothing is ever blank.

---

## 7. Feature: Testing card

Ported from FilmBros `VoiceAgentTesting.tsx`, now project-scoped and Blobs-backed.

**Webhook setup panel (top, collapses after first call):**
- Shows **this project's** webhook URL: `https://<site>.netlify.app/.netlify/functions/retell-webhook?token=<project.webhookToken>` with a big **Copy** button.
- Three-line instructions: *"In Retell → your agent → **Webhook Settings** → paste this URL → save. Then make a test call."*
- Live "Waiting for your first call…" state that polls `get-calls` every few seconds so the first call appears automatically (the demo beat).

**Two-pane review (reused layout):**
- **Left:** call list — caller/number, relative time, duration, outcome chip, and a colored **rating chip** (or "Unrated"). Filters: "only unrated" toggle, direction filter.
- **Right (selected call):** summary, sentiment, success flag, **audio player** (recording_url), full **transcript** (scroll box), collapsible **raw payload** viewer.

**Rating panel:**
- **Quality:** `Bad · Weak · Good · Perfect` (4-button neo grid, active button fills with its color).
- **Latency (optional):** `Fast · Normal · Slow`.
- **Note:** free-text; **required** for Bad/Weak, optional otherwise.
- One rating per call (upsert), editable. Saves via `rate-call` → Blobs; optimistic UI + `sonner` toast.

**Webhook receiver (`retell-webhook`) behavior** — ported from `retell-call-event`:
- Read raw body once. Resolve project by `?token=`. Reject unknown/absent token (401).
- Optional HMAC: if `RETELL_API_KEY` is set, verify `X-Retell-Signature` (`v=<ms>,d=<hex>`, HMAC-SHA256 over `raw_body + ts`, 5-min replay window). If unset, skip verification (token is the gate).
- Handle `call_started` / `call_ended` / `call_analyzed`. Upsert one `Call` by `callId`, **merging only present fields** (a late event must never null out a transcript/analysis). `outcome` not set on `call_started`.
- Parse from `body.call`: `call_id`, `start_timestamp`/`end_timestamp` (epoch ms → ISO), `duration_ms`, `direction`, `from_number`/`to_number`, `recording_url`, `transcript`, `call_status`, `disconnection_reason`, and `call_analysis` (`call_summary`, `user_sentiment`, `call_successful`, raw object). Store last raw body as `rawPayload`.
- Always return 200 quickly on valid+parsed events (so Retell doesn't retry-storm).

---

## 8. Feature: Transcription card

**No webhook. Direct upload → diarize → save.**

**Flow (server-side proxy — RESOLVED during build):**
1. Attendee drags/drops or picks an audio file (MP3, M4A/MP4, WAV, FLAC, OGG, WebM — Deepgram-supported formats; no client transcoding).
2. Browser POSTs the file to our `transcribe` Netlify Function.
3. The function forwards the audio to Deepgram `/v1/listen?model=nova-2&diarize=true&smart_format=true&punctuate=true&utterances=true` **server-side** and returns the raw response.
4. Browser assembles Deepgram's words/utterances into `Utterance[]` + `plainText` ("Speaker 1: …") via `assembleTranscript`.
5. Browser posts the finished transcript (small JSON) to `save-transcript` → Blobs under `transcripts/<project>/<id>`.

**Why the proxy (not browser-direct):** Deepgram **blocks REST calls from the browser via CORS** and documents a server-side proxy as the required pattern ([docs](https://developers.deepgram.com/guides/fundamentals/token-based-authentication)). The earlier "browser-direct with a grant token" idea does not work for pre-recorded REST.

**Consequence — file-size ceiling:** routing through a Netlify Function means the audio is bounded by Netlify's ~6 MB request-body limit (and the ~10 s synchronous timeout). The client caps uploads at **5 MB** with a clear message; short clips / a few minutes transcribe reliably. **Improvement path (future):** chunked upload → Blob → Deepgram async callback + polling to lift the size/time ceiling for long recordings.

**UI:**
- Upload zone (drag/drop + file picker), progress/processing state.
- Result view: diarized transcript with speaker labels and timestamps; **Copy** and **Download** (.txt / .md / .json).
- **Library:** list of saved transcriptions for the current project (filename, date, duration); reopen, copy, download, delete. Fully multi-transcription.
- If `DEEPGRAM_API_KEY` is absent: card shows a short "Add your free Deepgram key to Netlify → Site settings → Environment variables to enable transcription" helper with a signup link.

---

## 9. Design system (neo lift)

Lift from `repo/Code/dashboard`:
- The **`.neo-*` Tailwind utility layer** (neo-raised, neo-inset, neo-chip, neo-interactive, neo-field, neo-btn-brand, glass-brand, etc.) from the global stylesheet + `tailwind.config.ts` tokens.
- **`src/components/ui/neo.tsx`** motion inventory and any small primitives the ported screens use (e.g. `NeoNumber`, `DataSourceBadge` if reused).
- Match colors/typography exactly; introduce **no new hues**. VoiceLab should be visually indistinguishable from FilmBros.

---

## 10. Security & configuration

- **App access:** none by default. If `SITE_PASSWORD` is set, a single password screen gates the SPA (client checks via `config` + a `verify-password` check; password never shipped to the client). Kept intentionally simple — it's a private instance, not a multi-user system.
- **Webhook auth:** per-project random `webhookToken` in the URL (auto-created, shown in-app, zero setup). Optional Retell HMAC when `RETELL_API_KEY` is present.
- **Deepgram key:** stored only as a Netlify env var; the browser only ever receives short-lived grant tokens, never the raw key.
- **No secrets in the repo.** The public deploy repo contains zero credentials; everything sensitive is an env var the attendee sets.

---

## 11. Deploy & handout (the attendee journey)

1. **Prerequisite (the one real friction point): a GitHub account.** The "Deploy to Netlify" button forks the repo into the attendee's Git provider. Mitigation: illustrated one-page handout **and** a live, do-it-together walkthrough during the session.
2. Click **Deploy to Netlify** → sign into Netlify → (optionally paste `DEEPGRAM_API_KEY`; `SITE_PASSWORD` optional) → **Save & Deploy**. Live in ~1 minute.
3. Open the site → create/confirm a project → **copy the webhook URL** → paste into the Retell agent → make a test call → rate it.
4. For transcription: drop in an audio file → get the diarized transcript → save.

`netlify.toml` declares the build (Vite → `dist`), the functions dir, and the **optional** template env vars (labeled, with help text and a Deepgram signup link) so the deploy button prompts for them without requiring them.

---

## 12. Build phases

1. **Scaffold + neo lift + Blobs plumbing + Projects.** Vite/React/TS/Tailwind app, neo design system in, Netlify Functions wired to Blobs, `projects` CRUD + switcher, Home card grid, optional password gate. Deploy button + `netlify.toml`.
2. **Testing card.** `retell-webhook` receiver (token + optional HMAC + event merge), `get-calls`, `rate-call`, the two-pane review UI + rating panel + live-poll empty state. End-to-end test with a simulated Retell payload, then a real Retell agent.
3. **Transcription card.** `deepgram-token`, browser-direct Deepgram diarization (verify CORS/grant-token; fall back to chunked proxy if needed), `save-transcript`/`get-transcripts`/`delete-transcript`, upload UI + result view + library. Test with real MP3/M4A files including a long call recording.
4. **Polish + the giveaway handout.** README with the Deploy button, the illustrated setup guide (GitHub → Netlify → Deepgram → Retell), copy polish, empty/error states.

---

## 13. Open questions / to refine later ("improve from there")

- **Third card:** what it is (e.g. an inline Retell-cost estimator, a prompt-tester, or a shareable transcript link). Left as a slot.
- **App name/branding** for the session.
- Whether saved transcriptions should be shareable via a public read link (adds a public function + token).
- Whether to add lightweight export of rated calls (CSV) for the agency's records.
- Deepgram model/params tuning (nova-2 vs newer; language auto-detect).
