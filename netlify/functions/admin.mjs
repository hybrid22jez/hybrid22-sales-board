// Staff-only tools. Every link needs ?key=YOUR_ADMIN_KEY on the end.
import { json, checkAdmin, monthKey } from "./lib/util.mjs";
import { upsert, removeWhere, getDebug, getMonth } from "./lib/store.mjs";
import { runBackfill } from "./lib/backfill-core.mjs";

export const config = { path: "/api/admin/:action" };
const PUSH = "https://mb-api.mindbodyonline.com/push/api/v1";

export default async (req, context) => {
  const err = checkAdmin(req); if (err) return json({ error: err }, 401);
  const url = new URL(req.url), q = (k, d) => url.searchParams.get(k) ?? d, action = context.params.action;
  const pushHeaders = () => ({ "API-Key": process.env.MB_API_KEY, "User-Agent": "Hybrid22-Sales-Board", "Content-Type": "application/json" });

  switch (action) {
    case "status": {
      const env = ["MB_API_KEY", "MB_SITE_ID", "MB_STAFF_USERNAME", "MB_STAFF_PASSWORD", "MB_WEBHOOK_SIGNATURE_KEY", "ADMIN_KEY"].reduce((o, k) => (o[k] = !!process.env[k], o), {});
      const month = await getMonth(monthKey());
      return json({ env, thisMonth: { records: month.length, total: month.filter(r => !r.fallback).reduce((a, r) => a + r.contractValue, 0) }, lastEvent: (await getDebug("raw"))[0]?.at || null });
    }
    case "setup-webhook": {
      // Creates the Mindbody subscription pointing at this site, then activates it.
      const webhookUrl = `${url.origin}/api/mindbody`;
      const r = await fetch(`${PUSH}/subscriptions`, { method: "POST", headers: pushHeaders(), body: JSON.stringify({ eventIds: ["clientSale.created", "clientContract.created"], eventSchemaVersion: 1, referenceId: "hybrid22-sales-board", webhookUrl }) });
      const sub = await r.json().catch(() => ({}));
      if (!r.ok) return json({ step: "create", status: r.status, response: sub }, 502);
      const id = sub.subscriptionId || sub.SubscriptionId;
      const a = await fetch(`${PUSH}/subscriptions/${id}`, { method: "PATCH", headers: pushHeaders(), body: JSON.stringify({ Status: "Active" }) });
      return json({ ok: a.ok, subscriptionId: id, webhookUrl,
        messageSignatureKey: sub.messageSignatureKey || sub.MessageSignatureKey,
        next: "Copy messageSignatureKey into Netlify as MB_WEBHOOK_SIGNATURE_KEY, then redeploy. Mindbody only shows this key once." });
    }
    case "subscriptions": {
      const r = await fetch(`${PUSH}/subscriptions`, { headers: pushHeaders() }); return json(await r.json().catch(() => ({ status: r.status })));
    }
    case "test-sale": {
      const value = Number(q("value", 3120)), name = q("name", "Test");
      const rec = { id: `test:${Date.now()}`, test: true, kind: "membership", firstName: name, product: q("product", "12 Month Membership · TEST"),
        contractValue: value, soldBy: q("by", "Test"), soldAt: new Date().toISOString(), source: "test" };
      await upsert([rec]); return json({ added: rec, note: "Shows on the TV within about 30 seconds. Remove with /api/admin/clear-tests" });
    }
    case "clear-tests": return json({ removed: await removeWhere(r => r.test) });
    case "backfill": try { return json(await runBackfill(Number(q("hours", 24)))); } catch (e) { return json({ error: e.message }, 502); }
    case "raw": return json(await getDebug("raw"));
    case "unmatched": return json(await getDebug("unmatched"));
    default: return json({ actions: ["status", "setup-webhook", "subscriptions", "test-sale", "clear-tests", "backfill", "raw", "unmatched"] }, 404);
  }
};
