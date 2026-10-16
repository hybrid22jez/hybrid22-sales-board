// Mindbody Public API v6 helpers (used for name lookups and the hourly safety-net check).
import { getDebug, setDebug } from "./store.mjs";

const BASE = "https://api.mindbodyonline.com/public/v6";
const UA = "Hybrid22-Sales-Board";

function baseHeaders() {
  const { MB_API_KEY, MB_SITE_ID } = process.env;
  if (!MB_API_KEY || !MB_SITE_ID) throw new Error("MB_API_KEY and MB_SITE_ID must be set.");
  return { "Api-Key": MB_API_KEY, "SiteId": MB_SITE_ID, "User-Agent": UA, "Content-Type": "application/json" };
}

// Staff token, cached for 6 hours to keep API call counts (and cost) low.
async function token() {
  const cached = (await getDebug("token"))[0];
  if (cached && Date.now() - cached.t < 6 * 3600e3) return cached.v;
  const { MB_STAFF_USERNAME, MB_STAFF_PASSWORD } = process.env;
  if (!MB_STAFF_USERNAME || !MB_STAFF_PASSWORD) throw new Error("MB_STAFF_USERNAME and MB_STAFF_PASSWORD must be set.");
  const r = await fetch(`${BASE}/usertoken/issue`, { method: "POST", headers: baseHeaders(), body: JSON.stringify({ Username: MB_STAFF_USERNAME, Password: MB_STAFF_PASSWORD }) });
  if (!r.ok) throw new Error(`Mindbody token request failed: ${r.status} ${await r.text()}`);
  const v = (await r.json()).AccessToken;
  await setDebug("token", [{ t: Date.now(), v }]);
  return v;
}

export async function mb(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { ...baseHeaders(), Authorization: await token() } });
  if (!r.ok) throw new Error(`Mindbody ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function clientFirstName(clientId) {
  if (!clientId) return undefined;
  try { const d = await mb(`/client/clients?ClientIds=${encodeURIComponent(clientId)}&Limit=1`); return d?.Clients?.[0]?.FirstName; }
  catch { return undefined; }
}

export async function salesSince(start, end = new Date()) {
  const q = `StartSaleDateTime=${encodeURIComponent(start.toISOString())}&EndSaleDateTime=${encodeURIComponent(end.toISOString())}&Limit=200`;
  return (await mb(`/sale/sales?${q}`))?.Sales || [];
}
