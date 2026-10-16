// Hourly safety net: Mindbody says webhook delivery isn't guaranteed, so this re-checks the last 3 hours of sales.
import { runBackfill } from "./lib/backfill-core.mjs";

export const config = { schedule: "@hourly" };

export default async () => {
  if (!process.env.MB_API_KEY) return new Response("Mindbody not configured yet", { status: 200 });
  try { const r = await runBackfill(); console.log("backfill", r); } catch (e) { console.error("backfill failed", e.message); }
  return new Response("ok");
};
