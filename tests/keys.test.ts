import { describe, it, expect } from "vitest";
import { pickKey } from "../netlify/lib/keys.mjs";

describe("pickKey", () => {
  it("prefers the in-app (stored) key over the env var", () => {
    expect(pickKey("env-key", "stored")).toBe("stored");
  });
  it("falls back to the env var when nothing is stored in-app", () => {
    expect(pickKey("env-key", "")).toBe("env-key");
    expect(pickKey("env-key", undefined)).toBe("env-key");
  });
  it("returns empty when neither is set", () => {
    expect(pickKey("", "")).toBe("");
    expect(pickKey(undefined, null)).toBe("");
  });
  it("trims whitespace", () => {
    expect(pickKey("  k  ", "")).toBe("k");
    expect(pickKey(undefined, "  s  ")).toBe("s");
  });
});
