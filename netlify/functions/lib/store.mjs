import { getStore } from "@netlify/blobs";
import { monthKey } from "./util.mjs";

const sales = () => getStore({ name: "sales", consistency: "strong" });
const debug = () => getStore({ name: "debug", consistency: "strong" });

export async function getMonth(key = monthKey()) { return (await sales().get(key, { type: "json" })) || []; }

// Insert or update records by id. Idempotent, so Mindbody retries never double count.
export async function upsert(records) {
  const byMonth = {};
  for (const r of records) (byMonth[monthKey(r.soldAt)] ||= []).push(r);
  let added = 0;
  for (const [key, list] of Object.entries(byMonth)) {
    const cur = await getMonth(key);
    for (const r of list) {
      const i = cur.findIndex(x => x.id === r.id);
      if (i === -1) { cur.push(r); added++; } else cur[i] = { ...cur[i], ...r };
    }
    cur.sort((a, b) => new Date(a.soldAt) - new Date(b.soldAt));
    await sales().setJSON(key, cur);
  }
  return added;
}

export async function removeWhere(fn, key = monthKey()) {
  const cur = await getMonth(key); const keep = cur.filter(r => !fn(r));
  await sales().setJSON(key, keep); return cur.length - keep.length;
}

async function pushList(name, item, max) {
  const cur = (await debug().get(name, { type: "json" })) || [];
  cur.unshift(item); await debug().setJSON(name, cur.slice(0, max));
}
export const logRaw = (payload) => pushList("raw", { at: new Date().toISOString(), payload }, 30);
export const logUnmatched = (name, source) => pushList("unmatched", { at: new Date().toISOString(), name, source }, 60);
export const getDebug = async (name) => (await debug().get(name, { type: "json" })) || [];
export const setDebug = (name, v) => debug().setJSON(name, v);
