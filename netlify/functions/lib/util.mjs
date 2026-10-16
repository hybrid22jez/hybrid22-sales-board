import { MEMBERSHIPS, PACKS, IGNORE, BOARD } from "./config.mjs";

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

// Melbourne calendar month key, e.g. "2026-11"
export const monthKey = (d = new Date()) => new Date(d).toLocaleDateString("en-CA", { timeZone: BOARD.timezone }).slice(0, 7);

// Value a line item or contract by its name. Returns { kind, value } or null.
export function valueFor(name, amountPaid) {
  const n = String(name || "").toLowerCase();
  if (!n) return null;
  if (IGNORE.some(x => n.includes(x.toLowerCase()))) return { kind: "ignored", value: 0 };
  const m = MEMBERSHIPS.find(r => n.includes(r.match.toLowerCase()));
  if (m) return { kind: "membership", value: Math.round(m.value ?? m.weekly * m.weeks) };
  const p = PACKS.find(r => n.includes(r.match.toLowerCase()));
  if (p) return { kind: "pack", value: Math.round(Number(amountPaid) || 0) };
  return null;
}

// Read the first present field from a list of possible names (Mindbody payloads vary by version).
export const pick = (o, ...keys) => { for (const k of keys) { const v = k.split(".").reduce((a, p) => (a == null ? a : a[p]), o); if (v !== undefined && v !== null && v !== "") return v; } return undefined; };

export function checkAdmin(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return "ADMIN_KEY is not set in Netlify environment variables.";
  const url = new URL(req.url);
  const given = url.searchParams.get("key") || req.headers.get("x-admin-key");
  return given === key ? null : "Wrong or missing admin key.";
}
