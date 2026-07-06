import type { VenueKind } from "./types";

// ── Rough per-person cost estimates ───────────────────────────────────────────
// Deterministic ballpark by price tier so we can show a running total. These are
// intentionally approximate ("~") — the owner tunes them as real venues get
// curated. Baseline is EUR cents; other currencies scale by a rough multiplier.

const TIER_EUR_CENTS: Record<number, number> = {
  1: 800, // €8  — coffee / a scoop / a cheap bite
  2: 1800, // €18 — a couple of drinks / casual meal
  3: 3500, // €35 — a proper sit-down
  4: 6000, // €60 — a treat
};

// Kinds that cost nothing (a walk by the river is free).
const FREE_KINDS: VenueKind[] = ["walk", "park", "view"];

// Rough FX vs EUR. Not live rates — just to keep the number sensible per market.
const CCY_MULT: Record<string, number> = {
  EUR: 1,
  USD: 1.1,
  GBP: 0.85,
  CHF: 1,
  INR: 35,
};

export function estimateStopCents(
  kind: VenueKind,
  priceTier: number | undefined,
  currency: string,
): number {
  if (FREE_KINDS.includes(kind)) return 0;
  const base = TIER_EUR_CENTS[priceTier ?? 2] ?? TIER_EUR_CENTS[2];
  const mult = CCY_MULT[currency] ?? 1;
  return Math.round((base * mult) / 100) * 100; // round to a whole unit
}

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", INR: "₹", GBP: "£", CHF: "Fr" };
  return map[currency] ?? currency;
}

export function fmtMoney(cents: number, currency: string): string {
  return `${currencySymbol(currency)}${Math.round(cents / 100)}`;
}
