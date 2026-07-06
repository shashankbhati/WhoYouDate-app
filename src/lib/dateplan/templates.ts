import type { TimeOfDay, VenueKind, Stage, Venue } from "./types";

// ── Roadmap templates ─────────────────────────────────────────────────────────
// A template is an ordered list of steps for a given time of day. "stop" steps
// either embed a fixed local scene (walks past real landmarks — no venue needed)
// or declare a venue `slot` the engine fills from the curated `venues` table.
// "decision" steps are where the engine offers the low/med/high move spread.

export interface StopSpec {
  kind: "stop";
  emoji: string;
  minutes: number;
  slot?: VenueKind; // if set, engine fills from a curated venue of this kind
  title: string; // used when there's no venue (or as prefix)
  scene: string; // sentence; "{venue}" is replaced with the picked venue name
  questionStage: Stage;
  outdoor?: boolean; // weather-sensitive
  indoorSwap?: string; // alternate scene when weather is bad
}

export interface DecisionSpec {
  kind: "decision";
  stage: Stage;
}

export type StepSpec = StopSpec | DecisionSpec;

// City templates. Dresden is hand-authored; other cities fall back to a generic
// skeleton (landmarks become generic "a scenic spot nearby").
const DRESDEN: Record<TimeOfDay, StepSpec[]> = {
  morning: [
    {
      kind: "stop",
      emoji: "☕",
      minutes: 45,
      slot: "cafe",
      title: "Slow coffee & breakfast",
      scene: "Start easy over coffee at {venue} — no rush, just talk.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🌅",
      minutes: 25,
      title: "Walk the Elbe",
      scene: "Stroll the Brühlsche Terrasse — the 'Balcony of Europe' — with the Elbe below you.",
      questionStage: "opener",
      outdoor: true,
      indoorSwap:
        "Wander the Zwinger's covered galleries and courtyard instead — dry and just as pretty.",
    },
    { kind: "decision", stage: "mid" },
    {
      kind: "stop",
      emoji: "🍰",
      minutes: 30,
      slot: "dessert",
      title: "Sweet refuel",
      scene: "Refuel with something sweet at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "late" },
  ],
  afternoon: [
    {
      kind: "stop",
      emoji: "☕",
      minutes: 40,
      slot: "cafe",
      title: "Coffee to warm up",
      scene: "Meet over coffee at {venue} to get comfortable.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🏛️",
      minutes: 30,
      title: "Altstadt wander",
      scene: "Wander the Altmarkt past the Frauenkirche and through the old town squares.",
      questionStage: "mid",
      outdoor: true,
      indoorSwap: "Duck into the Zwinger galleries or the Neumarkt arcades if the weather turns.",
    },
    {
      kind: "stop",
      emoji: "🍦",
      minutes: 20,
      slot: "dessert",
      title: "Ice cream stop",
      scene: "Grab an ice cream at {venue} and keep walking.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "mid" },
    {
      kind: "stop",
      emoji: "🎨",
      minutes: 40,
      slot: "activity",
      title: "Do something together",
      scene: "Do something with your hands together at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "late" },
  ],
  evening: [
    {
      kind: "stop",
      emoji: "🍸",
      minutes: 60,
      slot: "bar",
      title: "Drinks to open the night",
      scene: "Open the evening with drinks at {venue} — relaxed, low-key.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🌆",
      minutes: 25,
      title: "Sunset by the river",
      scene:
        "Walk down to the Elbwiesen (the river meadows) and catch the sunset over the old town skyline.",
      questionStage: "mid",
      outdoor: true,
      indoorSwap: "Skip the riverside and settle into a cozy Neustadt spot as the light fades.",
    },
    {
      kind: "stop",
      emoji: "🍽️",
      minutes: 60,
      slot: "restaurant",
      title: "Dinner",
      scene: "Sit down for dinner at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "late" },
    {
      kind: "stop",
      emoji: "🍨",
      minutes: 25,
      slot: "dessert",
      title: "Nightcap or dessert",
      scene: "Wind down with dessert or a last drink at {venue}.",
      questionStage: "late",
    },
  ],
  night: [
    {
      kind: "stop",
      emoji: "🍸",
      minutes: 50,
      slot: "bar",
      title: "Meet for a drink",
      scene: "Meet for a drink at {venue} in the Neustadt — the nightlife quarter.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🎱",
      minutes: 45,
      slot: "activity",
      title: "Play something",
      scene: "Break the ice with a game at {venue}.",
      questionStage: "mid",
    },
    {
      kind: "stop",
      emoji: "🌙",
      minutes: 20,
      title: "Night walk",
      scene:
        "Take a slow walk through the Kunsthofpassage courtyards — the lit-up art yards are pure Dresden.",
      questionStage: "late",
      outdoor: true,
      indoorSwap: "Find a warm corner bar and let the night wind down there.",
    },
    { kind: "decision", stage: "late" },
  ],
};

const GENERIC: Record<TimeOfDay, StepSpec[]> = {
  morning: [
    {
      kind: "stop",
      emoji: "☕",
      minutes: 45,
      slot: "cafe",
      title: "Slow coffee",
      scene: "Start easy over coffee at {venue}.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🌅",
      minutes: 25,
      title: "Morning walk",
      scene: "Take a walk somewhere scenic nearby.",
      questionStage: "opener",
      outdoor: true,
      indoorSwap: "Find an indoor spot — a market hall or gallery — if the weather's off.",
    },
    { kind: "decision", stage: "mid" },
    {
      kind: "stop",
      emoji: "🍰",
      minutes: 30,
      slot: "dessert",
      title: "Sweet refuel",
      scene: "Refuel with something sweet at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "late" },
  ],
  afternoon: [
    {
      kind: "stop",
      emoji: "☕",
      minutes: 40,
      slot: "cafe",
      title: "Coffee",
      scene: "Meet over coffee at {venue}.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🏙️",
      minutes: 30,
      title: "Wander the center",
      scene: "Wander the old town / main square together.",
      questionStage: "mid",
      outdoor: true,
      indoorSwap: "Head into an arcade or museum if it rains.",
    },
    {
      kind: "stop",
      emoji: "🍦",
      minutes: 20,
      slot: "dessert",
      title: "Ice cream",
      scene: "Grab an ice cream at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "mid" },
    { kind: "decision", stage: "late" },
  ],
  evening: [
    {
      kind: "stop",
      emoji: "🍸",
      minutes: 60,
      slot: "bar",
      title: "Drinks",
      scene: "Open the evening with drinks at {venue}.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🌆",
      minutes: 25,
      title: "Golden-hour walk",
      scene: "Take a sunset walk somewhere with a view.",
      questionStage: "mid",
      outdoor: true,
      indoorSwap: "Settle into a cozy spot as the light fades.",
    },
    {
      kind: "stop",
      emoji: "🍽️",
      minutes: 60,
      slot: "restaurant",
      title: "Dinner",
      scene: "Sit down for dinner at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "late" },
  ],
  night: [
    {
      kind: "stop",
      emoji: "🍸",
      minutes: 50,
      slot: "bar",
      title: "Meet for a drink",
      scene: "Meet for a drink at {venue}.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🎱",
      minutes: 45,
      slot: "activity",
      title: "Play something",
      scene: "Break the ice with a game at {venue}.",
      questionStage: "mid",
    },
    { kind: "decision", stage: "late" },
  ],
};

const CITY_TEMPLATES: Record<string, Record<TimeOfDay, StepSpec[]>> = {
  dresden: DRESDEN,
};

export function templateFor(city: string, timeOfDay: TimeOfDay): StepSpec[] {
  const key = city.trim().toLowerCase();
  return (CITY_TEMPLATES[key] ?? GENERIC)[timeOfDay];
}

export function hasCuratedTemplate(city: string): boolean {
  return city.trim().toLowerCase() in CITY_TEMPLATES;
}

// ── Starter venues ────────────────────────────────────────────────────────────
// Shown instantly so the planner is never blank (same philosophy as the app's
// seeded ledger). These are STARTER EXAMPLES — the owner replaces/verifies them
// in /plan-admin. `rating` is an editorial "our pick" score, not a Google rating.
export function seedDresdenVenues(): Venue[] {
  const v = (
    name: string,
    kind: VenueKind,
    priceTier: number,
    rating: number,
    area: string,
    goodFor: TimeOfDay[],
    vibeTags: string[],
    note: string,
  ): Venue => ({
    id: `seed-${kind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    city: "Dresden",
    name,
    kind,
    priceTier,
    rating,
    vibeTags,
    goodFor,
    area,
    note,
    seed: true,
  });

  return [
    v(
      "Combo Coffee",
      "cafe",
      2,
      4.6,
      "Neustadt",
      ["morning", "afternoon"],
      ["cozy", "specialty"],
      "Specialty flat whites — a calm place to start.",
    ),
    v(
      "Lloyd Café",
      "cafe",
      2,
      4.3,
      "Neustadt",
      ["morning", "afternoon"],
      ["relaxed", "local"],
      "Easy neighbourhood café on Martin-Luther-Platz.",
    ),
    v(
      "Eiscafé Rosengarten",
      "dessert",
      1,
      4.4,
      "Neustadt",
      ["afternoon", "evening"],
      ["classic", "outdoor"],
      "Ice cream by the river — grab a cone and keep walking.",
    ),
    v(
      "Louisengarten",
      "bar",
      2,
      4.5,
      "Neustadt",
      ["evening", "night"],
      ["lively", "biergarten"],
      "Open-air beer garden in the heart of the nightlife quarter.",
    ),
    v(
      "Curry & Co",
      "restaurant",
      1,
      4.2,
      "Neustadt",
      ["evening", "night"],
      ["casual", "quick"],
      "Low-pressure bite if you don't want a formal dinner.",
    ),
    v(
      "Charlie's Billiard",
      "activity",
      2,
      4.1,
      "Neustadt",
      ["evening", "night"],
      ["playful", "games"],
      "Pool tables — the classic ice-breaker move.",
    ),
  ];
}
