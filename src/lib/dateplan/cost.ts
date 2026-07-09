import type { Budget, VenueKind } from "./types";

// ── Cost model ────────────────────────────────────────────────────────────────
// Each activity type has a realistic per-person cost that scales by budget tier.
// The plan's total is simply the SUM of its stops — so it emerges honestly
// (dinner costs more than coffee, bowling is never €6), and because budget also
// shapes WHICH activities appear (see templates), a cheap plan is genuinely cheap.

const FREE_KINDS: VenueKind[] = ["walk", "park", "view"];
export function isFreeKind(kind: VenueKind): boolean {
  return FREE_KINDS.includes(kind);
}

// Typical per-person cost in EUR, by activity and budget.
const COST_EUR: Record<string, Record<Budget, number>> = {
  cafe: { tight: 5, comfortable: 7, treat: 10 },
  bar: { tight: 9, comfortable: 14, treat: 22 },
  restaurant: { tight: 16, comfortable: 30, treat: 58 },
  dessert: { tight: 5, comfortable: 8, treat: 13 },
  activity: { tight: 12, comfortable: 17, treat: 27 },
};

// Rough FX vs EUR (not live) — keeps the number sensible per market.
const CCY_MULT: Record<string, number> = { EUR: 1, USD: 1.1, GBP: 0.85, CHF: 1, INR: 35 };

// Per-stop cost in cents. Free kinds (a walk) cost nothing.
export function stopCostCents(
  kind: VenueKind | undefined,
  budget: Budget,
  currency: string,
): number {
  if (!kind || isFreeKind(kind)) return 0;
  const eur = COST_EUR[kind]?.[budget] ?? 0;
  const mult = CCY_MULT[currency] ?? 1;
  return Math.round(eur * mult) * 100;
}

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", INR: "₹", GBP: "£", CHF: "Fr" };
  return map[currency] ?? currency;
}

export function fmtMoney(cents: number, currency: string): string {
  return `${currencySymbol(currency)}${Math.round(cents / 100)}`;
}
