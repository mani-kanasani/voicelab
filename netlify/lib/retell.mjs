// Retell agent-level webhook parsing + merge + HMAC verification.
// Ported from FilmBros' retell-call-event edge function (parse/merge/HMAC logic),
// stripped of any FilmBros-specific concerns.

const iso = (ms) => (typeof ms === "number" ? new Date(ms).toISOString() : null);

/**
 * Parse a Retell webhook body into { eventType, callId, fields }.
 * `fields` carries only the values present in this event (plus internal
 * `_outcome`/`rawPayload` markers consumed by mergeCall).
 */
export function parseRetellEvent(body) {
  const eventType = body?.event ?? body?.type ?? "unknown";
  const call = body?.call ?? body?.data ?? {};
  const callId = call.call_id ?? body?.call_id ?? null;
  const analysis = call.call_analysis ?? null;

  const durationSeconds =
    typeof call.duration_ms === "number"
      ? Math.round(call.duration_ms / 1000)
      : typeof call.start_timestamp === "number" && typeof call.end_timestamp === "number"
        ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
        : null;

  const fields = {
    direction: call.direction ?? null,
    fromNumber: call.from_number ?? null,
    toNumber: call.to_number ?? null,
    startedAt: iso(call.start_timestamp),
    endedAt: iso(call.end_timestamp),
    durationSeconds,
    recordingUrl: call.recording_url ?? null,
    transcript: typeof call.transcript === "string" ? call.transcript : null,
    disconnectReason: call.disconnection_reason ?? null,
    summary: typeof analysis?.call_summary === "string" ? analysis.call_summary : null,
    sentiment: typeof analysis?.user_sentiment === "string" ? analysis.user_sentiment : null,
    callSuccessful: typeof analysis?.call_successful === "boolean" ? analysis.call_successful : null,
    callAnalysis: analysis ?? null,
    // outcome is monotonic — never set on call_started (would clobber a real status)
    _outcome: eventType !== "call_started" ? (call.call_status ?? eventType) : null,
    rawPayload: body,
  };
  return { eventType, callId, fields };
}

const EMPTY_CALL = {
  callId: null, projectId: null, direction: null, fromNumber: null, toNumber: null,
  startedAt: null, endedAt: null, durationSeconds: null, recordingUrl: null, transcript: null,
  outcome: null, disconnectReason: null, summary: null, sentiment: null, callSuccessful: null,
  callAnalysis: null, rawPayload: null, rating: null,
};

/**
 * Merge parsed `fields` into an existing call (or a fresh one), never nulling
 * out a value already present — so a late/re-delivered event cannot wipe a
 * transcript or analysis saved by an earlier event.
 */
export function mergeCall(existing, fields, _eventType) {
  const base = existing ?? { ...EMPTY_CALL, receivedAt: new Date().toISOString() };
  const out = { ...base };
  for (const [k, v] of Object.entries(fields)) {
    if (k === "_outcome") {
      if (v !== null && v !== undefined) out.outcome = v;
      continue;
    }
    if (k === "rawPayload") {
      out.rawPayload = v;
      continue;
    }
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

function parseSigHeader(header) {
  if (!header) return null;
  const m = header.match(/v=(\d+),\s*d=([0-9a-f]+)/i);
  if (!m) return null;
  return { ts: parseInt(m[1], 10), digest: m[2].toLowerCase() };
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify Retell's `X-Retell-Signature` (`v=<unix_ms>,d=<hex>`), where the digest
 * is HMAC-SHA256(rawBody + String(ts)) keyed by the Retell API key.
 * If `apiKey` is falsy, verification is disabled → { ok: true, reason: "unverified" }.
 */
export async function verifyHmac(rawBody, signatureHeader, apiKey) {
  if (!apiKey) return { ok: true, reason: "unverified" };
  if (!signatureHeader) return { ok: false, reason: "missing_signature_header" };
  const parsed = parseSigHeader(signatureHeader);
  if (!parsed) return { ok: false, reason: "malformed_signature_header" };
  if (Math.abs(Date.now() - parsed.ts) > 5 * 60 * 1000) return { ok: false, reason: "stale_timestamp" };

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(apiKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody + String(parsed.ts)));
  const computed = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqualHex(computed, parsed.digest) ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}
