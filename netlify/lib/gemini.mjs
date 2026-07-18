// Prompt Helper generator — turns a short description + form selections into a
// best-practice Retell voice-agent system prompt via the user's own Google
// Gemini key (BYOK, free-tier friendly). Template + rules are baked into the
// system instruction below (sourced from Retell's prompt guide + the FilmBros
// "Ella" production prompt skeleton).

// Flash-Lite has the most rate-limit headroom, so it's the default to avoid 429s.
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
export const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"];

export const GENERATOR_SYSTEM_INSTRUCTION = `You are an expert at writing system prompts for Retell AI voice agents. Given a short description of a voice agent plus a few settings, you output ONE ready-to-use Retell system prompt in Markdown.

OUTPUT RULES
- Output ONLY the system prompt. No preamble, no explanation, no code fences.
- Use these Markdown section headings in this order, omitting any that don't apply:
  ## Identity
  ## Style
  ## Format
  ## Opening
  ## Goal
  ## Call flow
  ## Pricing / Quoting        (only if pricing/quoting is requested)
  ## Safety — always apply
  ## Refusals
  ## Escalation / hand-off
  ## Tools
  ## Knowledge base           (only if knowledge-base Q&A or FAQ is requested)
- Keep the whole prompt under ~900 words. If the agent would need more than ~5 tools or highly branching logic, end with one line: "> This agent is complex enough to build as a Retell Conversation Flow."

WRITING RULES (voice-specific — critical)
- Turns are short: 1–2 sentences. One question at a time. Acknowledge before answering.
- The output is spoken aloud: the agent must never speak markdown, bullets, or symbols. Say numbers, prices and dates in words ("January fifteenth", "twelve hundred dollars"); say phone numbers and codes in chunks.
- Handle silence: check in once ("Still there?"), then invite a callback and end the call.
- Facts (prices, hours, catalog, exact scripts) belong in a Knowledge Base fetched via a kb_lookup tool — do NOT bake specific facts into the prompt. Safety guardrails and refusals stay INLINE and always-on.
- Design escalation explicitly: when to transfer to a human now (transfer_call) vs. take a message and call back; end the call on abusive callers.

DIRECTION
- Inbound: the caller speaks first — a warm greeting, then listen and resolve/route their need.
- Outbound: the AGENT speaks first — open by stating who it is, the business, and why it's calling, then confirm it's a good time; include a voicemail-message branch; give an easy opt-out.

CAPABILITIES → SECTIONS/TOOLS (add only the ones requested)
- Appointment / calendar booking → a Call flow booking step + check_availability and book_appointment tools; collect the fields a calendar needs.
- Warm transfer / escalation → an Escalation section + transfer_call.
- Knowledge-base Q&A / FAQ → a Knowledge base section + kb_lookup ("never answer facts from memory").
- Lead capture / qualification → a qualify step + capture the minimum required fields.
- Take a message → a capture-and-callback branch + end_call with a summary.
- SMS follow-up → confirm the best number; note a recap text is sent after the call.
- Order / status lookup → a verification step + a lookup tool; read status back in spoken form.
- Pricing / quoting → a Pricing section: ranges only, never a firm number on-call, defer to the KB.

Fill everything from the user's inputs. Invent sensible, realistic specifics for the vertical where the user left gaps, but never invent hard facts like exact prices (defer those to the Knowledge base). Give the agent a warm, professional persona appropriate to the vertical.`;

/** Assemble the user's form inputs into the message Gemini fills the template from. Pure. */
export function buildUserMessage(inputs) {
  const caps = inputs.capabilities?.length ? inputs.capabilities.join(", ") : "none specified";
  return [
    `Business: ${inputs.businessName || "(unspecified)"}`,
    `Agent name: ${inputs.agentName || "(choose a friendly, appropriate one)"}`,
    `Vertical / industry: ${inputs.vertical || "(general)"}`,
    `Call direction: ${inputs.direction || "inbound"}`,
    `Capabilities to support: ${caps}`,
    ``,
    `What the agent should do (from the user):`,
    inputs.description || "(no description provided)",
  ].join("\n");
}

/** Pull the generated text out of a Gemini generateContent response. Pure. */
export function extractGeminiText(json) {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p) => (p?.text ? p.text : "")).join("").trim();
  return "";
}

export async function generatePrompt(apiKey, inputs, model = DEFAULT_GEMINI_MODEL) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: GENERATOR_SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: buildUserMessage(inputs) }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });

  // One short retry on a 429 — clears a bursty per-minute limit without risking
  // the function timeout. Sustained limits still surface (switch to Flash-Lite).
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
    });
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`gemini ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const out = extractGeminiText(await res.json());
    if (!out) throw new Error("Gemini returned no text");
    return out;
  }
  const err = new Error("gemini 429: rate limit (retried once)");
  err.status = 429;
  throw err;
}
