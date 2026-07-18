import { describe, it, expect, afterEach } from "vitest";
import { accessToken, hasValidAccess } from "../netlify/lib/auth.mjs";

const reqWithCookie = (cookie: string) => ({
  headers: { get: (k: string) => (k.toLowerCase() === "cookie" ? cookie : null) },
});

afterEach(() => {
  delete process.env.SITE_PASSWORD;
});

describe("access gate", () => {
  it("is open when no password is configured", () => {
    delete process.env.SITE_PASSWORD;
    expect(hasValidAccess(reqWithCookie(""))).toBe(true);
  });

  it("rejects requests without a valid signed cookie when a password is set", () => {
    process.env.SITE_PASSWORD = "s3cret";
    expect(hasValidAccess(reqWithCookie(""))).toBe(false);
    expect(hasValidAccess(reqWithCookie("vl_access=deadbeef"))).toBe(false);
  });

  it("accepts the signed cookie derived from the password", () => {
    process.env.SITE_PASSWORD = "s3cret";
    const token = accessToken("s3cret");
    expect(hasValidAccess(reqWithCookie(`vl_access=${token}`))).toBe(true);
    // a cookie signed with the wrong password must not pass
    expect(hasValidAccess(reqWithCookie(`vl_access=${accessToken("other")}`))).toBe(false);
  });
});
