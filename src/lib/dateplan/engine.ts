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
import { templateFor, FILLERS } from "./templates";
import type { StepSpec, StopSpec } from "./templates";
import { pickQuestions } from "./questions";
import { MOVES } from "./moves";
import { budgetTotalCents, isFreeKind } from "./cost";
import type { WeatherHint } from "./weather";

// Re-export the spec types the templates module owns so callers have one import.
export type { StepSpec, StopSpec } from "./templates";

// ── The engine ────────────────────────────────────────────────────────────────
// Pure function: (input, venues, nameSignal, weather) → DatePlan.
// Same inputs always produce the same plan. No AI, no network, fully testable.

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
const TRANSITION_MIN = 12; // rough gap between stops (getting there, ordering…)

function fmtClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
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
  aim: number, // budget's target price tier
  maxTier: number,
  used: Set<string>,
  seed: number,
): Venue | undefined {
  const all = venues.filter((v) => v.kind === kind);
  if (all.length === 0) return undefined;

  // Budget filters hard, but if nothing fits, fall back rather than drop the stop.
  const withinBudget = all.filter((v) => (v.priceTier ?? 2) <= maxTier);
  const pool = withinBudget.length ? withinBudget : all;

  const scored = pool
    .map((v) => ({
      v,
      score:
        (v.goodFor.includes(timeOfDay) ? 1.5 : 0) +
        // gravitate to the budget's target tier — this is what makes the budget
        // control actually change which venue (and cost) you get. Weighted high
        // so budget beats a small rating edge when tier options exist.
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

// Trim or extend the template so the plan roughly fits the target duration.
// Short target → fewer stops; long target (whole day) → cycle in filler stops.
function fitToDuration(base: StepSpec[], targetMin: number): StepSpec[] {
  const chosen: StepSpec[] = [];
  let mins = 0;
  let stops = 0;
  for (const s of base) {
    if (mins >= targetMin && stops >= 2) break;
    chosen.push(s);
    if (s.kind === "stop") {
      mins += s.minutes;
      stops++;
    }
  }
  let fi = 0;
  while (mins < targetMin - 15 && stops < 9) {
    const f: StopSpec = FILLERS[fi % FILLERS.length];
    chosen.push(f);
    mins += f.minutes;
    stops++;
    if (fi % 2 === 1) chosen.push({ kind: "decision", stage: "late" });
    fi++;
  }
  if (!chosen.some((s) => s.kind === "decision")) chosen.push({ kind: "decision", stage: "late" });
  return chosen;
}

function weatherBannerFor(w: WeatherHint, timeOfDay: PlanInput["timeOfDay"]): string {
  switch (w.mood) {
    case "hot":
      return `${w.emoji} ${w.summary} — beat the heat: this plan leads with something cold and keeps the walking for the cooler part of the ${timeOfDay}.`;
    case "cold":
      return `${w.emoji} ${w.summary} — chilly out, so this plan leans on warm, indoor stops between the highlights.`;
    case "wet":
      return `${w.emoji} ${w.summary} — rain about, so the outdoor legs are swapped for indoor backups.`;
    default:
      return `${w.emoji} ${w.summary} — a lovely ${timeOfDay} to be outside; the plan makes the most of the walk.`;
  }
}

export function buildPlan(
  input: PlanInput,
  venues: Venue[],
  signal: NameSignal | undefined,
  weather: WeatherHint | null,
  nonce = 0, // bump to get a different plan for the SAME inputs ("Try another plan")
): DatePlan {
  const { partnerName, city, date, timeOfDay, ageRange, budget, currency, durationHours } = input;
  const seed = seedFrom(`${partnerName}|${date}|${timeOfDay}|${budget}|${durationHours}|${nonce}`);
  const band = signal?.spendBand;
  const { aim, maxTier } = BUDGET_META[budget];

  const targetMin = Math.max(60, Math.round(durationHours * 60));
  const specs = fitToDuration(templateFor(city, timeOfDay), targetMin);

  const used = new Set<string>();
  const usedQ = new Set<string>();
  let stopSeed = seed;
  let decisionSeed = seed;
  let clock = START_MIN[timeOfDay];
  let totalCents = 0;
  let leadAdjusted = false;
  const steps: PlanStep[] = [];
  const paid: RoadmapStop[] = []; // non-free slot stops that share the budget
  let order = 1;

  for (const spec of specs) {
    if (spec.kind === "decision") {
      const options = pickMoves(timeOfDay, spec.stage, decisionSeed++);
      if (options.length) {
        steps.push({ type: "decision", order: order++, prompt: "What's your move?", options });
      }
      continue;
    }

    const venue = spec.slot
      ? pickVenue(venues, spec.slot, timeOfDay, band, aim, maxTier, used, stopSeed)
      : undefined;
    let scene = spec.scene;
    if (spec.slot) {
      scene = venue
        ? scene.replace("{venue}", venue.name)
        : scene.replace("{venue}", `a great local ${spec.slot}`);
    }

    // Temperature-driven wording on the first drink/coffee stop — makes the
    // weather visibly shape the plan, not just add a footnote.
    if (!leadAdjusted && venue && (venue.kind === "cafe" || venue.kind === "bar") && weather) {
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
    } else if (spec.outdoor && weather && weather.outdoorOk) {
      weatherNote = `${weather.emoji} ${weather.summary} — perfect for being outside.`;
    }

    const qs = pickQuestions(spec.questionStage, ageRange, usedQ, stopSeed, 3);
    stopSeed++;

    const startMin = clock;
    const endMin = startMin + spec.minutes;
    clock = endMin + TRANSITION_MIN;

    const stop: RoadmapStop = {
      type: "stop",
      order: order++,
      emoji: spec.emoji,
      title: venue ? `${spec.title} — ${venue.name}` : spec.title,
      scene,
      minutes: spec.minutes,
      timeLabel: `${fmtClock(startMin)} – ${fmtClock(endMin)}`,
      estCents: 0, // filled by the budget allocation below
      venue,
      questions: qs,
      weatherNote,
    };
    steps.push(stop);
    // A stop is "paid" if it fills a non-free slot — even when we don't yet have
    // a curated venue to name, so the cost still reflects the budget (an
    // un-curated city otherwise showed a €0 total).
    if (spec.slot && !isFreeKind(spec.slot)) paid.push(stop);
  }

  const totalMin = steps.reduce((a, s) => a + (s.type === "stop" ? s.minutes : 0), 0);
  const hrs = Math.round((totalMin / 60) * 10) / 10;

  // Split the budget total across the paid stops (walks are free). Anchored to the
  // ACTUAL planned hours so cost matches the shown duration and always adds up —
  // no per-venue inversions, and no mismatch when the stop cap trims a long plan.
  const target = budgetTotalCents(budget, totalMin / 60, currency);
  if (paid.length > 0) {
    const per = Math.max(100, Math.round(target / paid.length / 100) * 100);
    paid.forEach((s) => (s.estCents = per));
    totalCents = per * paid.length;
  }

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
    weatherBanner: weather ? weatherBannerFor(weather, timeOfDay) : undefined,
    nameSignal: signal,
  };
}
