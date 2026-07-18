import { describe, it, expect } from "vitest";
import { callKey, transcriptKey, PROJECTS_KEY } from "../netlify/lib/store.mjs";

describe("blob keys", () => {
  it("namespaces calls by project", () => {
    expect(callKey("p1", "c9")).toBe("calls/p1/c9");
  });
  it("namespaces transcripts by project", () => {
    expect(transcriptKey("p1", "t3")).toBe("transcripts/p1/t3");
  });
  it("has a stable projects key", () => {
    expect(PROJECTS_KEY).toBe("projects");
  });
});
