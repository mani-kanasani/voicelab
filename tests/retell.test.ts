import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { parseRetellEvent, mergeCall, verifyHmac } from "../netlify/lib/retell.mjs";

const analyzed = {
  event: "call_analyzed",
  call: {
    call_id: "abc",
    direction: "inbound",
    from_number: "+1",
    to_number: "+2",
    start_timestamp: 1700000000000,
    end_timestamp: 1700000090000,
    duration_ms: 90000,
    recording_url: "http://r",
    transcript: "hi",
    call_status: "ended",
    disconnection_reason: "user_hangup",
    call_analysis: { call_summary: "s", user_sentiment: "Positive", call_successful: true },
  },
};

describe("parseRetellEvent", () => {
  it("parses analyzed event fields", () => {
    const { eventType, callId, fields } = parseRetellEvent(analyzed);
    expect(eventType).toBe("call_analyzed");
    expect(callId).toBe("abc");
    expect(fields.durationSeconds).toBe(90);
    expect(fields.summary).toBe("s");
    expect(fields.sentiment).toBe("Positive");
    expect(fields.callSuccessful).toBe(true);
    expect(fields.startedAt).toBe(new Date(1700000000000).toISOString());
  });
});

describe("mergeCall", () => {
  it("never nulls an existing transcript with a later empty event", () => {
    const first = mergeCall(null, parseRetellEvent(analyzed).fields, "call_analyzed");
    const started = { event: "call_started", call: { call_id: "abc", direction: "inbound" } };
    const merged = mergeCall(first, parseRetellEvent(started).fields, "call_started");
    expect(merged.transcript).toBe("hi");
    expect(merged.summary).toBe("s");
  });

  it("does not set outcome on call_started", () => {
    const started = { event: "call_started", call: { call_id: "abc", call_status: "registered" } };
    const { fields } = parseRetellEvent(started);
    const merged = mergeCall(null, fields, "call_started");
    expect(merged.outcome).toBeNull();
  });

  it("sets outcome on call_ended", () => {
    const ended = { event: "call_ended", call: { call_id: "abc", call_status: "ended" } };
    const { fields } = parseRetellEvent(ended);
    const merged = mergeCall(null, fields, "call_ended");
    expect(merged.outcome).toBe("ended");
  });
});

describe("verifyHmac", () => {
  it("accepts a valid signature", async () => {
    const raw = JSON.stringify({ event: "call_started", call: { call_id: "x" } });
    const ts = Date.now();
    const key = "secret";
    const digest = createHmac("sha256", key).update(raw + String(ts)).digest("hex");
    const res = await verifyHmac(raw, `v=${ts},d=${digest}`, key);
    expect(res.ok).toBe(true);
  });

  it("rejects a tampered digest", async () => {
    const ts = Date.now();
    const res = await verifyHmac("{}", `v=${ts},d=deadbeef`, "secret");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("signature_mismatch");
  });

  it("rejects a stale timestamp", async () => {
    const old = Date.now() - 10 * 60 * 1000;
    const raw = "{}";
    const digest = createHmac("sha256", "secret").update(raw + String(old)).digest("hex");
    const res = await verifyHmac(raw, `v=${old},d=${digest}`, "secret");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("stale_timestamp");
  });

  it("is disabled (ok) when no key is configured", async () => {
    const res = await verifyHmac("{}", null, "");
    expect(res.ok).toBe(true);
    expect(res.reason).toBe("unverified");
  });
});
