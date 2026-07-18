import { timingSafeEqual } from "node:crypto";
import { json } from "../lib/http.mjs";
import { accessCookie } from "../lib/auth.mjs";

const eq = (a, b) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const expected = process.env.SITE_PASSWORD || "";
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!expected || !eq(password, expected)) return json({ error: "invalid" }, 401);
  // Issue a signed cookie that protected functions verify server-side.
  return json({ ok: true }, 200, { "set-cookie": accessCookie(expected) });
};
