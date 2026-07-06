import type { Budget, VenueKind } from "./types";

// ── Cost model ────────────────────────────────────────────────────────────────
// The displayed cost is anchored to the BUDGET as a spend-rate per hour, then
// split across the paid stops. This guarantees:
//   • total scales with the duration slider (more hours → more money),
//   • budgets are clearly separated (cheap ≪ comfortable ≪ treat),
//   • per-stop costs always add up to the total (no odd inversions).

// Free stops — a walk by the river costs nothing.
const FREE_KINDS: VenueKind[] = ["walk", "park", "view"];
export function isFreeKind(kind: VenueKind): boolean {
  return FREE_KINDS.includes(kind);
}

// Rough FX vs EUR (not live rates — just to keep the number sensible per market).
const CCY_MULT: Record<string, number> = {
  EUR: 1,
  USD: 1.1,
  GBP: 0.85,
  CHF: 1,
  INR: 35,
};

// Spend rate per hour, in EUR cents. Tuned so "cheap" ≈ €20 for ~3.5h and ≈ €35
// for a half day, with comfortable/treat clearly above it.
const BUDGET_EUR_PER_HOUR_CENTS: Record<Budget, number> = {
  tight: 600, // ~€6/hr  → 3.5h ≈ €21, 6h ≈ €36
  comfortable: 1300, // ~€13/hr → 3h ≈ €39
  treat: 2600, // ~€26/hr → 3h ≈ €78
};

export function budgetTotalCents(budget: Budget, hours: number, currency: string): number {
  const base = BUDGET_EUR_PER_HOUR_CENTS[budget] * hours;
  const mult = CCY_MULT[currency] ?? 1;
  return Math.round((base * mult) / 100) * 100; // whole currency units
}

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", INR: "₹", GBP: "£", CHF: "Fr" };
  return map[currency] ?? currency;
}

export function fmtMoney(cents: number, currency: string): string {
  return `${currencySymbol(currency)}${Math.round(cents / 100)}`;
}
