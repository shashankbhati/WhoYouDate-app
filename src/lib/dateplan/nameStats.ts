import type { Entry } from "../datedata/types";
import type { NameSignal } from "./types";

const MIN_SAMPLE = 5; // never surface a first-name stat below this (privacy + noise)

// Derive the community signal for a first name from the existing ledger. This is
// what tilts venue picks toward budget vs premium — the part no competitor has.
export function nameSignal(entries: Entry[], rawName: string): NameSignal | undefined {
  const name = rawName.trim().toLowerCase();
  if (!name) return undefined;
  const rows = entries.filter((e) => e.partnerName.trim().toLowerCase() === name);
  if (rows.length < MIN_SAMPLE) return undefined;

  const count = rows.length;
  const avgCents = rows.reduce((a, e) => a + e.amountCents, 0) / count;
  const happyRate = rows.filter((e) => e.mood >= 4).length / count;
  const secondRate = rows.filter((e) => e.secondDate && e.secondDate !== "no").length / count;

  // Most common currency in the sample (so the band label matches the money shown).
  const ccyCounts: Record<string, number> = {};
  rows.forEach((e) => {
    ccyCounts[e.currency] = (ccyCounts[e.currency] ?? 0) + 1;
  });
  const currency = Object.entries(ccyCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Spend band is relative to the same-currency population median, so it works
  // across € / ₹ / $ without hard-coded thresholds.
  const sameCcy = entries
    .filter((e) => e.currency === currency)
    .map((e) => e.amountCents)
    .sort((a, b) => a - b);
  const median = sameCcy.length ? sameCcy[Math.floor(sameCcy.length / 2)] : avgCents;
  const spendBand: NameSignal["spendBand"] =
    avgCents >= median * 1.35 ? "premium" : avgCents <= median * 0.7 ? "budget" : "mid";

  return { name: rawName.trim(), count, avgCents, currency, happyRate, secondRate, spendBand };
}
