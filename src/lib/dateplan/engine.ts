import type {
  DatePlan,
  PlanInput,
  PlanStep,
  Move,
  Venue,
  VenueKind,
  NameSignal,
  Level,
} from "./types";
import { BUDGET_META } from "./types";
import { templateFor } from "./templates";
import { pickQuestion } from "./questions";
import { MOVES } from "./moves";
import { estimateStopCents } from "./cost";
import type { WeatherHint } from "./weather";

// ── The engine ────────────────────────────────────────────────────────────────
// Pure function: (input, venues, nameSignal, weather) → DatePlan.
// Same inputs always produce the same plan. No AI, no network, fully testable.

// Small deterministic seed from the inputs so plans are stable per (name, date, tod)
// but vary between different dates — no randomness.
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const rewardRank: Record<Level, number> = { low: 1, med: 2, high: 3 };

// When each time of day starts (minutes past midnight) — drives the clock.
const START_MIN: Record<PlanInput["timeOfDay"], number> = {
  morning: 10 * 60, // 10:00
  afternoon: 14 * 60, // 14:00
  evening: 18 * 60 + 30, // 18:30
  night: 21 * 60, // 21:00
};
const TRANSITION_MIN = 12; // rough gap between stops (getting there, ordering…)

function fmtClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function bandPriceFit(tier: number | undefined, band: NameSignal["spendBand"] | undefined): number {
  if (tier == null) return 0;
  if (band === "premium") return tier >= 3 ? 2 : 0;
  if (band === "budget") return tier <= 2 ? 2 : 0;
  return tier === 2 || tier === 3 ? 1 : 0; // mid / unknown
}

function pickVenue(
  venues: Venue[],
  kind: VenueKind,
  timeOfDay: PlanInput["timeOfDay"],
  band: NameSignal["spendBand"] | undefined,
  maxTier: number,
  used: Set<string>,
  seed: number,
): Venue | undefined {
  const all = venues.filter((v) => v.kind === kind);
  if (all.length === 0) return undefined;

  // Budget is an explicit user choice, so it filters hard — but if nothing fits
  // the budget, fall back to the whole pool rather than dropping the stop.
  const withinBudget = all.filter((v) => (v.priceTier ?? 2) <= maxTier);
  const pool = withinBudget.length ? withinBudget : all;

  const scored = pool
    .map((v) => ({
      v,
      score:
        (v.goodFor.includes(timeOfDay) ? 2 : 0) +
        bandPriceFit(v.priceTier, band) +
        (v.rating ?? 0) / 5 +
        (used.has(v.id) ? -3 : 0), // avoid repeats, but allow if it's the only option
    }))
    .sort(
      (a, b) =>
        b.score - a.score || (b.v.rating ?? 0) - (a.v.rating ?? 0) || a.v.id.localeCompare(b.v.id),
    );

  // Rotate among the top choices by seed so different dates don't always get #1.
  const topBand = scored.filter((s) => s.score >= scored[0].score - 0.4);
  const chosen = topBand[seed % topBand.length].v;
  used.add(chosen.id);
  return chosen;
}

function pickMoves(
  timeOfDay: PlanInput["timeOfDay"],
  decisionStage: Move["stage"],
  seed: number,
): Move[] {
  const eligible = MOVES.filter((m) => m.times.includes(timeOfDay));
  const out: Move[] = [];
  (["low", "med", "high"] as Level[]).forEach((risk, i) => {
    const bucket = eligible
      .filter((m) => m.risk === risk)
      .sort(
        (a, b) =>
          (b.stage === decisionStage ? 1 : 0) - (a.stage === decisionStage ? 1 : 0) ||
          rewardRank[b.reward] - rewardRank[a.reward] ||
          a.id.localeCompare(b.id),
      );
    if (bucket.length) out.push(bucket[(seed + i) % bucket.length]);
  });
  return out;
}

export function buildPlan(
  input: PlanInput,
  venues: Venue[],
  signal: NameSignal | undefined,
  weather: WeatherHint | null,
  nonce = 0, // bump to get a different plan for the SAME inputs ("Try another plan")
): DatePlan {
  const { partnerName, city, date, timeOfDay, ageRange, budget, currency } = input;
  const seed = seedFrom(`${partnerName}|${date}|${timeOfDay}|${budget}|${nonce}`);
  const specs = templateFor(city, timeOfDay);
  const band = signal?.spendBand;
  const maxTier = BUDGET_META[budget].maxTier;

  const used = new Set<string>(); // venue ids used
  const usedQ = new Set<string>(); // question texts used (no repeats within a plan)
  let stopSeed = seed;
  let decisionSeed = seed;
  let clock = START_MIN[timeOfDay];
  let totalCents = 0;
  const steps: PlanStep[] = [];
  let order = 1;

  for (const spec of specs) {
    if (spec.kind === "decision") {
      const options = pickMoves(timeOfDay, spec.stage, decisionSeed++);
      if (options.length) {
        steps.push({ type: "decision", order: order++, prompt: "What's your move?", options });
      }
      continue;
    }

    // stop
    const venue = spec.slot
      ? pickVenue(venues, spec.slot, timeOfDay, band, maxTier, used, stopSeed)
      : undefined;
    // If a slot couldn't be filled (owner hasn't curated that kind yet), keep the
    // stop but show a friendly placeholder rather than a broken sentence.
    let scene = spec.scene;
    if (spec.slot) {
      scene = venue
        ? scene.replace("{venue}", venue.name)
        : scene.replace("{venue}", `a great local ${spec.slot}`);
    }

    let weatherNote: string | undefined;
    if (spec.outdoor && weather && !weather.outdoorOk) {
      weatherNote = `${weather.emoji} ${weather.summary} — ${spec.indoorSwap ?? "consider an indoor alternative."}`;
      if (spec.indoorSwap) scene = spec.indoorSwap;
    } else if (spec.outdoor && weather && weather.outdoorOk) {
      weatherNote = `${weather.emoji} ${weather.summary} — perfect for being outside.`;
    }

    const q = pickQuestion(spec.questionStage, ageRange, usedQ, stopSeed);
    stopSeed++;

    // Clock + cost
    const startMin = clock;
    const endMin = startMin + spec.minutes;
    clock = endMin + TRANSITION_MIN;
    const estCents = venue ? estimateStopCents(venue.kind, venue.priceTier, currency) : 0;
    totalCents += estCents;

    steps.push({
      type: "stop",
      order: order++,
      emoji: spec.emoji,
      title: venue ? `${spec.title} — ${venue.name}` : spec.title,
      scene,
      minutes: spec.minutes,
      timeLabel: `${fmtClock(startMin)} – ${fmtClock(endMin)}`,
      estCents,
      venue,
      question: q,
      weatherNote,
    });
  }

  const totalMin = steps.reduce((a, s) => a + (s.type === "stop" ? s.minutes : 0), 0);
  const hrs = Math.round((totalMin / 60) * 10) / 10;

  const first = partnerName.trim() || "your date";
  let subline = `A ${hrs}-hour ${timeOfDay} plan in ${city}.`;
  if (signal) {
    const pct = Math.round(signal.secondRate * 100);
    subline += ` Based on ${signal.count} logged dates with someone named ${first}: they lean ${signal.spendBand}-spend, ${pct}% went to a second date.`;
  }

  return {
    city,
    timeOfDay,
    headline: `Your date with ${first}`,
    subline,
    steps,
    totalCents,
    currency,
    nameSignal: signal,
  };
}
