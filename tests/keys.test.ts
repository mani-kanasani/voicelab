import { describe, it, expect } from "vitest";
import { pickKey } from "../netlify/lib/keys.mjs";

describe("pickKey", () => {
  it("prefers the env var over the stored key", () => {
    expect(pickKey("env-key", "stored")).toBe("env-key");
  });
  it("falls back to the stored key when no env var", () => {
    expect(pickKey(undefined, "stored")).toBe("stored");
    expect(pickKey("", "g")).toBe("g");
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
