// Safety-net check shared by the hourly job and the admin "backfill" link.
import { upsert, logUnmatched } from "./store.mjs";
import { valueFor, pick } from "./util.mjs";
import { salesSince, clientFirstName } from "./mindbody.mjs";

export async function runBackfill(hours = 3) {
  const sales = await salesSince(new Date(Date.now() - hours * 3600e3));
  const out = [];
  for (const s of sales) {
    const items = s.PurchasedItems || s.Items || [];
    for (const [i, it] of items.entries()) {
      const name = pick(it, "Description", "Name", "ItemName");
      const v = valueFor(name, pick(it, "TotalAmount", "AmountPaid", "Price"));
      if (!v) { await logUnmatched(name, "backfill"); continue; }
      if (v.kind === "ignored" || v.value <= 0) continue;
      const clientId = pick(s, "ClientId", "RecipientClientId");
      out.push({ id: `sale:${s.Id}:${pick(it, "Id", "SaleDetailId") ?? i}`, kind: v.kind, firstName: (await clientFirstName(clientId)) || "A new member",
        product: name, contractValue: v.value, soldBy: "", soldAt: pick(s, "SaleDateTime", "SaleDate") || new Date().toISOString(),
        clientId: clientId ? String(clientId) : undefined, source: "backfill" });
    }
  }
  return { checked: sales.length, added: out.length ? await upsert(out) : 0 };
}

