// Feed the TV reads: this month's sales plus the last 8 days of last month (so weeks spanning a month boundary add up).
import { getMonth } from "./lib/store.mjs";
import { monthKey } from "./lib/util.mjs";

export const config = { path: "/api/sales" };

export default async () => {
  const now = new Date(), prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const cutoff = now.getTime() - 8 * 864e5;
  const list = [...(await getMonth(monthKey(prev))).filter(r => new Date(r.soldAt).getTime() >= cutoff), ...(await getMonth(monthKey(now)))];
  // Drop contract fallbacks when the matching sale for the same client exists within 30 minutes.
  const real = list.filter(r => !r.fallback);
  const sales = list.filter(r => !r.fallback || !real.some(s => s.kind === "membership" && s.clientId && s.clientId === r.clientId && Math.abs(new Date(s.soldAt) - new Date(r.soldAt)) < 30 * 60e3))
    .map(({ id, firstName, product, contractValue, soldBy, soldAt, test }) => ({ id, firstName, product, contractValue, soldBy: String(soldBy||"").split(" ")[0], soldAt, test: !!test }));
  return new Response(JSON.stringify({ updatedAt: now.toISOString(), sales }), {
    headers: { "content-type": "application/json", "cache-control": "no-store", "netlify-cdn-cache-control": "public, s-maxage=10, stale-while-revalidate=20" },
  });
};
