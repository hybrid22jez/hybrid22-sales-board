// Receives Mindbody webhook events and turns qualifying sales into board records.
import crypto from "node:crypto";
import { upsert, logRaw, logUnmatched } from "./lib/store.mjs";
import { valueFor, pick } from "./lib/util.mjs";
import { clientFirstName } from "./lib/mindbody.mjs";

export const config = { path: "/api/mindbody" };

function signatureOk(raw, header) {
  const key = process.env.MB_WEBHOOK_SIGNATURE_KEY;
  if (!key) return true; // not configured yet (first-time setup only)
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", Buffer.from(key, "utf8")).update(Buffer.from(raw, "utf8")).digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(header.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async (req) => {
  if (req.method === "HEAD" || req.method === "GET") return new Response(null, { status: 200 }); // Mindbody validates the URL with HEAD
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get("x-mindbody-signature"))) return new Response("Bad signature", { status: 401 });
  let body; try { body = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  await logRaw(body);
  try {
    const records = await toRecords(body);
    if (records.length) await upsert(records);
  } catch (e) { console.error("webhook processing failed", e); }
  return new Response("ok", { status: 200 }); // always 200 fast, so Mindbody doesn't retry or deactivate us
};

async function toRecords(body) {
  const ev = body.eventId, d = body.eventData || body;
  const soldAt = pick(d, "saleDateTime", "agreementDateTime", "contractStartDateTime") || body.eventInstanceOriginationDateTime || new Date().toISOString();
  const clientId = pick(d, "purchasingClientId", "clientId", "clientUniqueId");
  let firstName = pick(d, "clientFirstName", "firstName", "client.firstName");
  const soldBy = pick(d, "soldByName", "salesRepFirstName", "contractSoldByStaffFirstName", "soldByStaffFirstName") || "";

  if (ev === "clientSale.created") {
    const items = pick(d, "items", "purchasedItems") || [d];
    const out = [];
    for (const [i, it] of items.entries()) {
      const name = pick(it, "name", "itemName", "item_name", "description");
      const v = valueFor(name, pick(it, "amountPaid", "item_amountPaid", "totalAmount"));
      if (!v) { await logUnmatched(name, "clientSale.created"); continue; }
      if (v.kind === "ignored" || v.value <= 0) continue;
      firstName ||= await clientFirstName(clientId);
      out.push({ id: `sale:${pick(d, "saleId") || body.messageId}:${pick(it, "itemId", "item_itemId") ?? i}`, kind: v.kind, firstName: firstName || "A new member",
        product: name, contractValue: v.value, soldBy, soldAt, clientId: clientId ? String(clientId) : undefined, source: "webhook" });
    }
    return out;
  }
  if (ev === "clientContract.created") {
    const name = pick(d, "contractName", "name");
    const v = valueFor(name);
    if (!v) { await logUnmatched(name, "clientContract.created"); return []; }
    if (v.kind !== "membership") return [];
    firstName ||= await clientFirstName(clientId);
    // Kept as a fallback: if a matching sale for this client arrives, the feed shows the sale instead.
    return [{ id: `contract:${pick(d, "clientContractId", "contractId") || body.messageId}`, kind: "membership", fallback: true, firstName: firstName || "A new member",
      product: name, contractValue: v.value, soldBy, soldAt, clientId: clientId ? String(clientId) : undefined, source: "webhook" }];
  }
  return [];
}
