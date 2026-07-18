# VoiceLab

A tiny, self-hosted toolkit for building voice AI agents:

- **Testing** — paste a webhook into your [Retell](https://www.retellai.com/) agent, watch its calls arrive live, and rate each one (Bad / Weak / Good / Perfect + latency + notes).
- **Transcription** — drop in an audio file and get a **diarized** transcript (labeled by speaker), saved to a reusable library.
- **Prompt Helper** — describe your agent, check its capabilities, pick a vertical + inbound/outbound, and generate a best-practice Retell system prompt.

Everything is organized by **Projects** (one per client or per agent), and it all runs on **your own** free Netlify site with zero database to set up.

---

## 🚀 Deploy your own in one click

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mani-kanasani/voicelab)

### What you need
- A **GitHub** account (free — the deploy button forks this repo into your account).
- A **Netlify** account (free — sign in with GitHub).
- *(Optional)* a **Deepgram** API key to enable Transcription — free credit covers hundreds of hours. Get one at [console.deepgram.com/signup](https://console.deepgram.com/signup).

### Steps (about 3 minutes)
1. Click **Deploy to Netlify** above.
2. Sign in to Netlify with GitHub and authorize it.
3. *(Optional)* paste your `DEEPGRAM_API_KEY` when prompted — or skip it and add it later.
4. Click **Save & Deploy**. Your site goes live at `https://your-name.netlify.app` in ~1 minute.

That's it — no database, no servers, no config files to edit.

---

## 🎧 Using the Testing tool

1. Open your site and click **Testing**.
2. Copy the **webhook URL** shown at the top.
3. In Retell, open your agent → **Webhook Settings** → paste the URL → save.
4. Make a test call. It appears in VoiceLab within a few seconds.
5. Click a call to read its transcript + summary, then rate it.

Each **Project** has its own webhook URL, so you can point several agents (or several clients' agents) at one VoiceLab and keep them separate.

## 📝 Using the Transcription tool

1. Click **Transcription** (needs a `DEEPGRAM_API_KEY` — see below).
2. Drag in or choose an audio file (MP3, M4A, WAV, FLAC, OGG, WebM).
3. Get a diarized transcript with speaker labels, then **Save** it to your library.

**File size:** clips up to ~5 MB (a few minutes) transcribe reliably. For much longer recordings, split them first. *(A larger-file path is on the roadmap.)*

## ✨ Using the Prompt Helper

1. Click **Prompt Helper** (needs a `GEMINI_API_KEY` — see below).
2. Describe your agent in a sentence or two, check the capabilities it needs (booking, transfer, knowledge-base Q&A…), pick a vertical, and choose inbound or outbound.
3. Hit **Generate** → get a structured, best-practice Retell system prompt. Copy it into your Retell agent, or **Save** it to your library.

The generated prompt follows Retell's recommended structure (identity, style, call flow, guardrails, tools, knowledge base) and voice-specific rules. Uses your own Google Gemini key (free tier is plenty).

---

## ⚙️ Optional settings (Netlify → Site settings → Environment variables)

| Variable | What it does |
|---|---|
| `DEEPGRAM_API_KEY` | Enables the Transcription tool. [Get a free key.](https://console.deepgram.com/signup) |
| `GEMINI_API_KEY` | Enables the Prompt Helper tool. [Get a free key.](https://aistudio.google.com/apikey) |
| `SITE_PASSWORD` | Locks your VoiceLab behind a single password screen. |
| `RETELL_API_KEY` | Turns on signature verification for the Testing webhook (extra security). Without it, the per-project token in the URL is the gate. |

After adding or changing a variable, trigger a redeploy (Netlify → Deploys → **Trigger deploy**).

---

## 🧑‍💻 Run it locally (optional)

```bash
npm install
npm run dev      # netlify dev → http://localhost:8888
npm test         # unit tests
npm run build    # type-check + production build
```

Create a `.env` file for local secrets (gitignored):

```
DEEPGRAM_API_KEY=your_key_here
```

## 🛠 How it works

- **Frontend:** React + Vite + Tailwind (neomorphic "neo" UI).
- **Backend:** Netlify Functions (no separate server).
- **Storage:** Netlify Blobs (zero-config — no database).
- **Transcription:** your Deepgram key, proxied server-side (Deepgram blocks browser calls via CORS).

## ❓ Troubleshooting

- **Calls aren't showing up** → double-check the webhook URL is pasted into the right Retell agent, and that you copied the *whole* URL including `?token=…`.
- **Transcription says "add your key"** → set `DEEPGRAM_API_KEY` in Netlify and redeploy.
- **"File too large"** → keep audio under ~5 MB for now.
