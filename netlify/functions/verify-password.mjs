import { timingSafeEqual } from "node:crypto";
import { json } from "../lib/http.mjs";

const eq = (a, b) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const expected = process.env.SITE_PASSWORD || "";
  const { password } = await req.json().catch(() => ({}));
  if (!expected || !eq(password || "", expected)) return json({ error: "invalid" }, 401);
  return json({ ok: true }, 200, {
    "set-cookie": "vl_access=ok; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000",
  });
};
