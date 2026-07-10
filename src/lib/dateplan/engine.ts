import type {
  DatePlan,
  PlanInput,
  PlanStep,
  RoadmapStop,
  Move,
  Venue,
  VenueKind,
  NameSignal,
  Level,
} from "./types";
import { BUDGET_META } from "./types";
import { arcFor } from "./templates";
import type { StopSpec } from "./templates";
import { pickQuestions } from "./questions";
import { MOVES } from "./moves";
import { stopCostCents } from "./cost";
import type { WeatherHint } from "./weather";

// ── The engine ────────────────────────────────────────────────────────────────
// Pure function: (input, venues, nameSignal, weather) → DatePlan. Deterministic.
//
// Model: a date is a small, capped set of real stops (never filler-padded). The
// duration slider controls how LONG stops run and whether a 2nd decision appears
// — not how many venues. Cost is the sum of realistic per-activity prices.

function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const rewardRank: Record<Level, number> = { low: 1, med: 2, high: 3 };

const START_MIN: Record<PlanInput["timeOfDay"], number> = {
  morning: 10 * 60,
  afternoon: 14 * 60,
  evening: 18 * 60 + 30,
  night: 21 * 60,
};
const TRANSITION_MIN = 12;

// Realistic bounds per activity — a walk isn't 2 hours, dinner isn't 20 minutes.
const KIND_MIN_MAX: Record<string, [number, number]> = {
  cafe: [30, 75],
  bar: [40, 85],
  restaurant: [55, 120],
  dessert: [20, 45],
  activity: [40, 90],
  park: [20, 55],
  walk: [20, 55],
  view: [20, 45],
};

// A real date is 2–4 places. Longer dates linger, they don't hop more venues.
function stopCount(hours: number): number {
  if (hours <= 2) return 2;
  if (hours <= 3.5) return 3;
  return 4;
}

function fmtClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function clampMinutes(slot: VenueKind | undefined, m: number): number {
  const [lo, hi] = KIND_MIN_MAX[slot ?? "walk"] ?? [20, 55];
  return Math.max(lo, Math.min(hi, Math.round(m / 5) * 5));
}

function bandPriceFit(tier: number | undefined, band: NameSignal["spendBand"] | undefined): number {
  if (tier == null || !band) return 0;
  if (band === "premium") return tier >= 3 ? 1 : 0;
  if (band === "budget") return tier <= 2 ? 1 : 0;
  return tier === 2 || tier === 3 ? 0.5 : 0;
}

function pickVenue(
  venues: Venue[],
  kind: VenueKind,
  timeOfDay: PlanInput["timeOfDay"],
  band: NameSignal["spendBand"] | undefined,
  aim: number,
  maxTier: number,
  used: Set<string>,
  seed: number,
): Venue | undefined {
  const all = venues.filter((v) => v.kind === kind);
  if (all.length === 0) return undefined;
  const withinBudget = all.filter((v) => (v.priceTier ?? 2) <= maxTier);
  const pool = withinBudget.length ? withinBudget : all;

  const scored = pool
    .map((v) => ({
      v,
      score:
        (v.goodFor.includes(timeOfDay) ? 2 : 0) +
        2 * (2 - Math.abs((v.priceTier ?? 2) - aim)) +
        bandPriceFit(v.priceTier, band) * 0.3 +
        (v.rating ?? 0) / 5 +
        (used.has(v.id) ? -3 : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || (b.v.rating ?? 0) - (a.v.rating ?? 0) || a.v.id.localeCompare(b.v.id),
    );

  const topBand = scored.filter((s) => s.score >= scored[0].score - 0.4);
  const chosen = topBand[seed % topBand.length].v;
  used.add(chosen.id);
  return chosen;
}

// Pick one move of a given risk for a stop — prefers the stop's stage, avoids
// repeating a move already used earlier in the plan, deterministic.
function pickOneMove(
  timeOfDay: PlanInput["timeOfDay"],
  stage: Move["stage"],
  risk: Level,
  used: Set<string>,
  seed: number,
): Move | undefined {
  const pool = MOVES.filter((m) => m.times.includes(timeOfDay) && m.risk === risk);
  if (pool.length === 0) return undefined;
  let avail = pool.filter((m) => !used.has(m.id));
  if (avail.length === 0) avail = pool;
  avail = avail.sort(
    (a, b) =>
      (b.stage === stage ? 1 : 0) - (a.stage === stage ? 1 : 0) ||
      rewardRank[b.reward] - rewardRank[a.reward] ||
      a.id.localeCompare(b.id),
  );
  const chosen = avail[seed % avail.length];
  used.add(chosen.id);
  return chosen;
}

export function buildPlan(
  input: PlanInput,
  venues: Venue[],
  signal: NameSignal | undefined,
  weather: WeatherHint | null,
  nonce = 0,
): DatePlan {
  const { partnerName, city, date, timeOfDay, ageRange, budget, currency, durationHours } = input;
  const seed = seedFrom(`${partnerName}|${date}|${timeOfDay}|${budget}|${durationHours}|${nonce}`);
  const band = signal?.spendBand;
  const { aim, maxTier } = BUDGET_META[budget];

  // 1) Pick the stops: the budget-shaped arc, truncated to a realistic count.
  const arc = arcFor(city, timeOfDay, budget);
  const n = Math.min(stopCount(durationHours), arc.length);
  const chosen: StopSpec[] = arc.slice(0, Math.max(2, n));

  // 2) Distribute the target duration across those stops (longer date → longer
  //    stops, clamped to realistic bounds — never more stops).
  const targetStopMin = Math.max(
    45,
    Math.round(durationHours * 60) - Math.max(0, chosen.length - 1) * TRANSITION_MIN,
  );
  const baseSum = chosen.reduce((a, s) => a + s.minutes, 0) || 1;
  const scale = targetStopMin / baseSum;

  const used = new Set<string>();
  const usedQ = new Set<string>();
  const usedSafe = new Set<string>();
  const usedRisky = new Set<string>();
  let stopSeed = seed;
  let clock = START_MIN[timeOfDay];
  let totalCents = 0;
  let leadAdjusted = false;
  const steps: PlanStep[] = [];
  let order = 1;

  chosen.forEach((spec) => {
    const venue = spec.slot
      ? pickVenue(venues, spec.slot, timeOfDay, band, aim, maxTier, used, stopSeed)
      : undefined;
    let scene = spec.scene;
    if (spec.slot) {
      scene = venue
        ? scene.replace("{venue}", venue.name)
        : scene.replace("{venue}", `a great local ${spec.slot}`);
    }

    // Temperature-driven wording on the first drink/coffee stop.
    if (!leadAdjusted && (spec.slot === "cafe" || spec.slot === "bar") && weather) {
      if (weather.mood === "hot") {
        scene = `It's warm out — start cool. ${scene}`;
        leadAdjusted = true;
      } else if (weather.mood === "cold") {
        scene = `Somewhere warm to start — ${scene.charAt(0).toLowerCase()}${scene.slice(1)}`;
        leadAdjusted = true;
      }
    }

    let weatherNote: string | undefined;
    if (spec.outdoor && weather && !weather.outdoorOk) {
      weatherNote = `${weather.emoji} ${weather.summary} — ${spec.indoorSwap ?? "consider an indoor alternative."}`;
      if (spec.indoorSwap) scene = spec.indoorSwap;
    }

    const qs = pickQuestions(spec.questionStage, ageRange, usedQ, stopSeed, 3);
    // Each chapter gets a safe (low-risk) + risky (high-risk) move for its moment.
    const safe = pickOneMove(timeOfDay, spec.questionStage, "low", usedSafe, stopSeed);
    const risky = pickOneMove(timeOfDay, spec.questionStage, "high", usedRisky, stopSeed);
    stopSeed++;

    const minutes = clampMinutes(spec.slot, spec.minutes * scale);
    const startMin = clock;
    const endMin = startMin + minutes;
    clock = endMin + TRANSITION_MIN;
    const estCents = stopCostCents(spec.slot, budget, currency);
    totalCents += estCents;

    steps.push({
      type: "stop",
      order: order++,
      emoji: spec.emoji,
      title: venue ? `${spec.title} — ${venue.name}` : spec.title,
      scene,
      minutes,
      timeLabel: `${fmtClock(startMin)} – ${fmtClock(endMin)}`,
      estCents,
      venue,
      questions: qs,
      safe,
      risky,
      weatherNote,
    });
  });

  // (No separate decision steps: each chapter carries its own safe/risky moves.)

  const totalMin = steps.reduce((a, s) => a + (s.type === "stop" ? s.minutes : 0), 0);
  const hrs = Math.round((totalMin / 60) * 10) / 10;

  const first = partnerName.trim() || "your date";
  const headline = partnerName.trim() ? `Your date with ${first}` : `Your ${timeOfDay} in ${city}`;
  let subline = `A ${hrs}-hour ${timeOfDay} plan in ${city}.`;
  if (signal) {
    const pct = Math.round(signal.secondRate * 100);
    subline += ` Based on ${signal.count} logged dates with someone named ${first}: they lean ${signal.spendBand}-spend, ${pct}% went to a second date.`;
  }

  return {
    city,
    timeOfDay,
    headline,
    subline,
    steps,
    totalCents,
    currency,
    weatherBanner: weather ? weatherBannerFor(weather, timeOfDay) : undefined,
    nameSignal: signal,
  };
}

function weatherBannerFor(w: WeatherHint, timeOfDay: PlanInput["timeOfDay"]): string {
  switch (w.mood) {
    case "hot":
      return `${w.emoji} ${w.summary} — hot out: this plan starts cool and saves the walking for the cooler part of the ${timeOfDay}.`;
    case "cold":
      return `${w.emoji} ${w.summary} — chilly, so this plan leans on warm, indoor stops.`;
    case "wet":
      return `${w.emoji} ${w.summary} — rain about, so the outdoor legs swap for indoor backups.`;
    default:
      return `${w.emoji} ${w.summary} — good weather for the outdoor parts of this date.`;
  }
}
