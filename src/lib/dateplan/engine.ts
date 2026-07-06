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
import { templateFor } from "./templates";
import { pickQuestion } from "./questions";
import { MOVES } from "./moves";
import type { WeatherHint } from "./weather";

// ── The engine ────────────────────────────────────────────────────────────────
// Pure function: (input, venues, nameSignal, weather, moveStats?) → DatePlan.
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
  used: Set<string>,
  seed: number,
): Venue | undefined {
  const pool = venues.filter((v) => v.kind === kind);
  if (pool.length === 0) return undefined;

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
): DatePlan {
  const { partnerName, city, date, timeOfDay, ageRange } = input;
  const seed = seedFrom(`${partnerName}|${date}|${timeOfDay}`);
  const preferPlayful = ageRange === "18-24";
  const specs = templateFor(city, timeOfDay);
  const band = signal?.spendBand;

  const used = new Set<string>();
  let stopSeed = seed;
  let decisionSeed = seed;
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
      ? pickVenue(venues, spec.slot, timeOfDay, band, used, stopSeed)
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

    const q = pickQuestion(spec.questionStage, stopSeed, preferPlayful);
    stopSeed++;

    steps.push({
      type: "stop",
      order: order++,
      emoji: spec.emoji,
      title: venue ? `${spec.title} — ${venue.name}` : spec.title,
      scene,
      minutes: spec.minutes,
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
    nameSignal: signal,
  };
}
