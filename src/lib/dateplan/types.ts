// ── Date Planner — shared types ───────────────────────────────────────────────
// The whole planner is deterministic: same inputs → same plan. No AI/LLM.

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type AgeRange = "18-24" | "25-34" | "35-44" | "45+";

// The kinds of place a roadmap block can be filled with.
export type VenueKind =
  | "cafe"
  | "bar"
  | "restaurant"
  | "dessert"
  | "activity"
  | "walk"
  | "park"
  | "view";

export interface Venue {
  id: string;
  city: string;
  name: string;
  kind: VenueKind;
  priceTier?: number; // 1–4
  rating?: number; // 0–5 (owner-curated)
  vibeTags: string[];
  goodFor: TimeOfDay[];
  area?: string;
  lat?: number;
  lon?: number;
  note?: string;
  /** true = client-side starter/example, not yet a real curated DB row */
  seed?: boolean;
}

export type Level = "low" | "med" | "high";
export type Stage = "opener" | "mid" | "late";

// A "move" the user can make at a decision point (billiards / movie / second date…).
export interface Move {
  id: string;
  label: string; // what the user proposes to their date
  risk: Level;
  reward: Level;
  stage: Stage;
  times: TimeOfDay[]; // when this move is appropriate
  hint?: string; // one-line read-the-room note (kept consent-positive)
}

export type Tone = "light" | "playful" | "personal" | "romantic";

// A conversation prompt, tagged so the engine can place it by stage + tone.
export interface Question {
  text: string;
  stage: Stage;
  tone: Tone;
}

// How much the user wants to spend on the whole date.
export type Budget = "tight" | "comfortable" | "treat";

// ── Assembled plan (engine output) ────────────────────────────────────────────

export interface RoadmapStop {
  type: "stop";
  order: number;
  emoji: string;
  title: string; // e.g. "Coffee at Lloyd's Café"
  scene: string; // the human sentence, venue slotted in
  minutes: number;
  timeLabel?: string; // computed clock window, e.g. "18:30 – 19:30"
  estCents?: number; // per-person cost estimate for this stop (0 = free)
  venue?: Venue; // the chosen place, if the slot was filled
  question?: Question; // what to ask here
  weatherNote?: string; // set when weather forces an indoor swap etc.
}

export interface DecisionPoint {
  type: "decision";
  order: number;
  prompt: string; // "What's your move?"
  options: Move[]; // exactly the low/med/high spread
}

export type PlanStep = RoadmapStop | DecisionPoint;

export interface NameSignal {
  name: string;
  count: number;
  avgCents: number;
  currency: string;
  happyRate: number; // mood >= 4
  secondRate: number;
  spendBand: "budget" | "mid" | "premium";
}

export interface DatePlan {
  city: string;
  timeOfDay: TimeOfDay;
  headline: string;
  subline: string;
  steps: PlanStep[];
  totalCents: number; // sum of per-stop estimates
  currency: string;
  nameSignal?: NameSignal; // present when we have data on this first name
}

export interface PlanInput {
  partnerName: string;
  city: string;
  date: string; // ISO date (yyyy-mm-dd)
  timeOfDay: TimeOfDay;
  ageRange: AgeRange;
  budget: Budget;
  currency: string;
}

export const TIME_META: Record<TimeOfDay, { label: string; emoji: string }> = {
  morning: { label: "Morning", emoji: "🌅" },
  afternoon: { label: "Afternoon", emoji: "☀️" },
  evening: { label: "Evening", emoji: "🌆" },
  night: { label: "Night", emoji: "🌙" },
};

export const LEVEL_META: Record<Level, { label: string; color: string; dot: string }> = {
  low: { label: "Low risk", color: "text-green-500", dot: "🟢" },
  med: { label: "Medium risk", color: "text-amber-500", dot: "🟡" },
  high: { label: "High risk", color: "text-rose-500", dot: "🔴" },
};

export const REWARD_LABEL: Record<Level, string> = {
  low: "small payoff",
  med: "good payoff",
  high: "big payoff",
};

export const BUDGET_META: Record<Budget, { label: string; emoji: string; maxTier: number }> = {
  tight: { label: "Keep it cheap", emoji: "🪙", maxTier: 2 },
  comfortable: { label: "Comfortable", emoji: "💶", maxTier: 3 },
  treat: { label: "Treat them", emoji: "✨", maxTier: 4 },
};
