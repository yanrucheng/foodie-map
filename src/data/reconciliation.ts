import { z } from "zod";
import { isGuideUrl, type Restaurant } from "./contract.ts";
import { evidenceRefSchema } from "./catalog.ts";

/** Retain geographic/branch slug. Only locale, query, fragment and trailing slash are irrelevant. */
export function listingIdentity(value: string | null | undefined): string | null {
  if (!value || !isGuideUrl(value.split(/[?#]/u)[0]!)) return null;
  const url = new URL(value);
  return `https://guide.michelin.com${url.pathname.replace(/^\/[a-z]{2}\/[a-z]{2}(?:_[A-Z]{2})?\//u, "/").replace(/\/$/u, "")}`;
}
const identity = z.string().min(1);
export const reconciliationSchema = z.object({
  dataset: z.string().min(1),
  complete: z.boolean(),
  sources: z.array(evidenceRefSchema).min(1),
  identities: z.array(identity),
  // Each exception is independently auditable; file-local IDs and names never imply identity.
  aliases: z.array(z.object({ from: identity, to: identity, evidence: evidenceRefSchema, reason: z.string().min(1) }).strict()),
}).strict().superRefine((value, context) => {
  const normalized = value.identities.map((key) => listingIdentity(key) ?? key);
  if (new Set(normalized).size !== normalized.length) context.addIssue({ code: "custom", path: ["identities"], message: "Duplicate official identity" });
  const from = new Set<string>(), to = new Set<string>();
  for (const alias of value.aliases) {
    const a = listingIdentity(alias.from) ?? alias.from, b = listingIdentity(alias.to) ?? alias.to;
    if (from.has(a) || to.has(b) || a === b || from.has(b) || to.has(a)) context.addIssue({ code: "custom", path: ["aliases"], message: "Ambiguous or chained alias; use direct one-to-one evidence" });
    from.add(a); to.add(b);
  }
  const aliases = new Map(value.aliases.map((alias) => [listingIdentity(alias.from) ?? alias.from, listingIdentity(alias.to) ?? alias.to]));
  if (new Set(normalized.map((id) => aliases.get(id) ?? id)).size !== normalized.length) context.addIssue({ code: "custom", path: ["identities"], message: "Aliases collapse multiple official identities" });
});
export type Reconciliation = z.infer<typeof reconciliationSchema>;
export function recordIdentity(record: Restaurant): string | null {
  return listingIdentity(record.guide_url);
}
export function reconcileCoverage(records: Restaurant[], evidence: Reconciliation) {
  const normalize = (value: string) => listingIdentity(value) ?? value;
  const aliases = new Map(evidence.aliases.map((alias) => [normalize(alias.from), normalize(alias.to)]));
  const canonical = (value: string) => aliases.get(normalize(value)) ?? normalize(value);
  const expected = new Set(evidence.identities.map(canonical));
  const actual = new Set<string>(), ambiguous: number[] = [], unresolved: number[] = [];
  for (const record of records) {
    const key = recordIdentity(record);
    if (!key) { unresolved.push(record.id); continue; }
    const resolved = canonical(key);
    if (actual.has(resolved)) ambiguous.push(record.id);
    actual.add(resolved);
  }
  const missing = [...expected].filter((key) => !actual.has(key)).sort();
  const extra = [...actual].filter((key) => !expected.has(key)).sort();
  return { complete: evidence.complete && !missing.length && !extra.length && !ambiguous.length && !unresolved.length,
    missing, extra, ambiguous, unresolved, expected: expected.size, actual: actual.size };
}

export function reconcileEditions(before: Restaurant[], after: Restaurant[], official?: Reconciliation) {
  const normalize = (value: string) => listingIdentity(value) ?? value;
  const aliases = new Map(official?.aliases.map((alias) => [normalize(alias.from), normalize(alias.to)]) ?? []);
  const key = (record: Restaurant) => { const id = recordIdentity(record); return id ? aliases.get(id) ?? id : null; };
  const index = (records: Restaurant[]) => {
    const map = new Map<string, Restaurant[]>();
    for (const record of records) { const id = key(record); if (id) map.set(id, [...map.get(id) ?? [], record]); }
    return map;
  };
  const old = index(before), next = index(after);
  const expected = new Set(official?.identities.map((id) => aliases.get(normalize(id)) ?? normalize(id)) ?? []);
  const result: { identity: string | null; beforeIds: number[]; afterIds: number[]; membership: string; changes?: Record<string, unknown>; basis: unknown }[] = [];
  for (const id of new Set([...old.keys(), ...next.keys()])) {
    const a = old.get(id) ?? [], b = next.get(id) ?? [];
    let membership = "retained";
    if (a.length > 1 || b.length > 1) membership = "pending-identity-ambiguity";
    else if (!b.length) membership = expected.has(id) ? "capture-gap" : official?.complete ? "annual-exit" : "pending-missing-capture-or-exit";
    else if (!a.length) membership = "observed-addition-pending-prior-coverage";
    const changes: Record<string, unknown> = {};
    if (a.length === 1 && b.length === 1) for (const field of ["name", "name_zh", "name_en", "star_rating", "guide_url", "status", "address", "website"] as const) {
      if (a[0]![field] !== b[0]![field]) changes[field] = { before: a[0]![field] ?? null, after: b[0]![field] ?? null };
    }
    result.push({ identity: id, beforeIds: a.map((r) => r.id), afterIds: b.map((r) => r.id), membership, changes,
      basis: { method: "normalized-listing-url-or-evidenced-alias", aliases: official?.aliases.filter((alias) => normalize(alias.to) === id) ?? [] } });
  }
  for (const [side, records] of [["before", before], ["after", after]] as const) for (const record of records) if (!key(record)) result.push({ identity: null, beforeIds: side === "before" ? [record.id] : [], afterIds: side === "after" ? [record.id] : [], membership: "pending-missing-identity", basis: "Names and local numeric IDs are never cross-edition matches" });
  return { rows: result, note: "Annual membership and current status changes are separate. Additions need prior complete evidence to confirm first inclusion; missing captures never imply closure." };
}
