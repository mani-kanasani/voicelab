import { describe, it, expect } from "vitest";
import { assembleTranscript } from "../src/lib/deepgram";

describe("assembleTranscript", () => {
  it("prefers the utterances array", () => {
    const dg = {
      metadata: { duration: 12.4 },
      results: {
        utterances: [
          { speaker: 0, start: 0, end: 1, transcript: "Hello there." },
          { speaker: 1, start: 1, end: 2, transcript: "Hi, testing." },
        ],
      },
    };
    const r = assembleTranscript(dg);
    expect(r.utterances.length).toBe(2);
    expect(r.durationSeconds).toBe(12);
    expect(r.plainText).toBe("Speaker 1: Hello there.\nSpeaker 2: Hi, testing.");
  });

  it("falls back to grouping words by consecutive speaker", () => {
    const dg = {
      results: {
        channels: [
          {
            alternatives: [
              {
                words: [
                  { word: "hello", punctuated_word: "Hello", speaker: 0, start: 0, end: 0.5 },
                  { word: "there", punctuated_word: "there.", speaker: 0, start: 0.5, end: 1 },
                  { word: "hi", punctuated_word: "Hi.", speaker: 1, start: 1, end: 1.5 },
                ],
              },
            ],
          },
        ],
      },
    };
    const r = assembleTranscript(dg);
    expect(r.utterances.length).toBe(2);
    expect(r.utterances[0].text).toBe("Hello there.");
    expect(r.utterances[1].speaker).toBe(1);
    expect(r.plainText).toContain("Speaker 2: Hi.");
  });
});
