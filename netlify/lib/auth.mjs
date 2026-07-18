import { createHmac, timingSafeEqual } from "node:crypto";

// Optional single-password gate. When SITE_PASSWORD is set, protected functions
// require a signed access cookie whose value the client cannot forge without the
// password. When unset, everything is open (a private single-tenant instance).

export function accessToken(password) {
  return createHmac("sha256", password).update("voicelab-access-v1").digest("hex");
}

export function accessCookie(password) {
  return `vl_access=${accessToken(password)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

export function hasValidAccess(req) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return true; // no gate configured → open
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)vl_access=([a-f0-9]+)/);
  if (!m) return false;
  const got = Buffer.from(m[1]);
  const expected = Buffer.from(accessToken(pw));
  return got.length === expected.length && timingSafeEqual(got, expected);
}
