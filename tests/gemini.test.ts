import { describe, it, expect } from "vitest";
import { buildUserMessage, extractGeminiText } from "../netlify/lib/gemini.mjs";

describe("buildUserMessage", () => {
  it("includes all form inputs and the description", () => {
    const msg = buildUserMessage({
      businessName: "Bright Dental",
      agentName: "Ava",
      vertical: "Dental",
      direction: "inbound",
      capabilities: ["Appointment / calendar booking", "Warm transfer / escalation"],
      description: "Answer calls, book cleanings, transfer emergencies.",
    });
    expect(msg).toContain("Bright Dental");
    expect(msg).toContain("Ava");
    expect(msg).toContain("Dental");
    expect(msg).toContain("inbound");
    expect(msg).toContain("Appointment / calendar booking, Warm transfer / escalation");
    expect(msg).toContain("book cleanings");
  });

  it("handles empty capabilities gracefully", () => {
    const msg = buildUserMessage({ description: "hi", capabilities: [] });
    expect(msg).toContain("none specified");
  });
});

describe("extractGeminiText", () => {
  it("pulls text from a normal Gemini response", () => {
    const json = { candidates: [{ content: { parts: [{ text: "## Identity\nHello." }] } }] };
    expect(extractGeminiText(json)).toBe("## Identity\nHello.");
  });
  it("joins multiple parts", () => {
    const json = { candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] };
    expect(extractGeminiText(json)).toBe("ab");
  });
  it("returns empty string on a malformed/blocked response", () => {
    expect(extractGeminiText({})).toBe("");
    expect(extractGeminiText({ candidates: [] })).toBe("");
    expect(extractGeminiText(null)).toBe("");
  });
});
