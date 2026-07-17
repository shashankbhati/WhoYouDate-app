import type { TimeOfDay, VenueKind, Stage, Budget, Venue } from "./types";

// ── Roadmap arcs ──────────────────────────────────────────────────────────────
// An arc is the ORDERED, FULL set of stops for a date (a real date's shape:
// opener → main → wind-down). The engine truncates it to a realistic stop count
// by duration, distributes the minutes, and inserts the decision points — so
// templates here are just stops, never decisions or filler.
//
// Budget shapes the arc itself (a cheap date is coffee+walk+dessert, not an
// expensive date with smaller numbers). Dresden is hand-authored with real
// landmarks; every other city uses the generic budget-aware arc.

export interface StopSpec {
  kind: "stop";
  emoji: string;
  minutes: number; // base duration; the engine scales it to fit the total
  slot?: VenueKind; // if set, filled from a venue of this kind (else fixed scene)
  title: string;
  scene: string; // "{venue}" is replaced with the picked venue name
  questionStage: Stage;
  outdoor?: boolean;
  indoorSwap?: string;
}

export interface DecisionSpec {
  kind: "decision";
  stage: Stage;
}

export type StepSpec = StopSpec | DecisionSpec;

// ── Dresden (hand-authored, real landmarks; core-first so short dates truncate well) ──
const DRESDEN: Record<TimeOfDay, StopSpec[]> = {
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
      minutes: 30,
      title: "Walk the Elbe",
      scene: "Stroll the Brühlsche Terrasse — the 'Balcony of Europe' — with the Elbe below you.",
      questionStage: "mid",
      outdoor: true,
      indoorSwap: "Wander the Zwinger's covered galleries instead — dry and just as pretty.",
    },
    {
      kind: "stop",
      emoji: "🍰",
      minutes: 30,
      slot: "dessert",
      title: "Sweet refuel",
      scene: "Refuel with something sweet at {venue}.",
      questionStage: "late",
    },
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
      minutes: 35,
      title: "Altstadt wander",
      scene: "Wander the Altmarkt past the Frauenkirche and through the old town squares.",
      questionStage: "mid",
      outdoor: true,
      indoorSwap: "Duck into the Zwinger galleries or the Neumarkt arcades if the weather turns.",
    },
    {
      kind: "stop",
      emoji: "🍦",
      minutes: 25,
      slot: "dessert",
      title: "Ice cream stop",
      scene: "Grab an ice cream at {venue} and keep walking.",
      questionStage: "mid",
    },
    {
      kind: "stop",
      emoji: "🎨",
      minutes: 45,
      slot: "activity",
      title: "Do something together",
      scene: "Do something with your hands together at {venue}.",
      questionStage: "late",
    },
  ],
  evening: [
    {
      kind: "stop",
      emoji: "🍸",
      minutes: 55,
      slot: "bar",
      title: "Drinks to open the night",
      scene: "Open the evening with drinks at {venue} — relaxed, low-key.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🍽️",
      minutes: 75,
      slot: "restaurant",
      title: "Dinner",
      scene: "Sit down for dinner at {venue}.",
      questionStage: "mid",
    },
    {
      kind: "stop",
      emoji: "🌆",
      minutes: 30,
      title: "Sunset by the river",
      scene:
        "Walk down to the Elbwiesen (the river meadows) and catch the last light over the old town skyline.",
      questionStage: "late",
      outdoor: true,
      indoorSwap: "Skip the riverside and settle into a cozy Neustadt spot as the light fades.",
    },
    {
      kind: "stop",
      emoji: "🍨",
      minutes: 30,
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
      minutes: 55,
      slot: "bar",
      title: "Meet for a drink",
      scene: "Meet for a drink at {venue} in the Neustadt — the nightlife quarter.",
      questionStage: "opener",
    },
    {
      kind: "stop",
      emoji: "🎱",
      minutes: 50,
      slot: "activity",
      title: "Play something",
      scene: "Break the ice with a game at {venue}.",
      questionStage: "mid",
    },
    {
      kind: "stop",
      emoji: "🌙",
      minutes: 25,
      title: "Night walk",
      scene:
        "Take a slow walk through the Kunsthofpassage courtyards — the lit-up art yards are pure Dresden.",
      questionStage: "late",
      outdoor: true,
      indoorSwap: "Find a warm corner bar and let the night wind down there.",
    },
  ],
};

// ── Generic (budget-aware) stop factories ─────────────────────────────────────
const cafe = (scene: string, q: Stage = "opener"): StopSpec => ({
  kind: "stop",
  emoji: "☕",
  minutes: 45,
  slot: "cafe",
  title: "Coffee",
  scene,
  questionStage: q,
});
const bar = (scene: string): StopSpec => ({
  kind: "stop",
  emoji: "🍸",
  minutes: 55,
  slot: "bar",
  title: "Drinks",
  scene,
  questionStage: "opener",
});
const restaurant = (): StopSpec => ({
  kind: "stop",
  emoji: "🍽️",
  minutes: 75,
  slot: "restaurant",
  title: "Dinner",
  scene: "Sit down for dinner at {venue}.",
  questionStage: "mid",
});
const dessert = (): StopSpec => ({
  kind: "stop",
  emoji: "🍨",
  minutes: 25,
  slot: "dessert",
  title: "Something sweet",
  scene: "Grab something sweet at {venue}.",
  questionStage: "late",
});
const activity = (): StopSpec => ({
  kind: "stop",
  emoji: "🎳",
  minutes: 55,
  slot: "activity",
  title: "Do something together",
  scene: "Break things up with something hands-on at {venue}.",
  questionStage: "mid",
});
const walk = (label: string, q: Stage = "mid"): StopSpec => ({
  kind: "stop",
  emoji: "🌳",
  minutes: 30,
  slot: "park",
  title: `${label} walk`,
  scene: `Take a ${label.toLowerCase()} stroll through {venue}.`,
  questionStage: q,
  outdoor: true,
  indoorSwap: "Duck somewhere cosy and keep talking if the weather turns.",
});

// Rotate through arc variants by the plan's seed so "Try another plan" changes
// the SHAPE (not just the venues) — café→walk→dinner→dessert isn't a must.
function pick<T>(v: number, arr: T[]): T {
  return arr[((v % arr.length) + arr.length) % arr.length];
}

const GENERIC: Record<TimeOfDay, (b: Budget, v: number) => StopSpec[]> = {
  morning: (b, v) =>
    pick(v, [
      [cafe("Start easy over coffee at {venue}."), walk("Morning", "opener"), dessert()],
      [
        walk("Morning stroll", "opener"),
        cafe("Warm up with coffee at {venue}."),
        b === "treat" ? activity() : dessert(),
      ],
      [cafe("Coffee and pastries at {venue}."), activity(), walk("Morning", "late")],
    ]),
  afternoon: (b, v) =>
    pick(v, [
      [cafe("Meet over coffee at {venue}."), walk("Afternoon"), b === "treat" ? activity() : dessert()],
      [activity(), cafe("Cool down with coffee at {venue}."), walk("Afternoon", "late")],
      [
        walk("Afternoon", "opener"),
        b === "tight" ? cafe("Coffee at {venue}.") : restaurant(),
        dessert(),
      ],
    ]),
  evening: (b, v) =>
    b === "tight"
      ? pick(v, [
          [bar("Open the evening with drinks at {venue}."), walk("Golden-hour"), dessert()],
          [walk("Golden-hour", "opener"), bar("Drinks at {venue}."), dessert()],
          [cafe("Coffee to start at {venue}."), walk("Evening"), bar("A drink to end at {venue}.")],
        ])
      : b === "comfortable"
        ? pick(v, [
            [bar("Open the evening with drinks at {venue}."), restaurant(), walk("After-dinner", "late")],
            [restaurant(), walk("After-dinner", "opener"), dessert()],
            [activity(), restaurant(), bar("A nightcap at {venue}.")],
          ])
        : pick(v, [
            [bar("Open the evening with drinks at {venue}."), restaurant(), walk("After-dinner", "late"), dessert()],
            [activity(), restaurant(), walk("After-dinner"), bar("A nightcap at {venue}.")],
            [restaurant(), bar("Drinks after dinner at {venue}."), walk("Late", "late"), dessert()],
          ]),
  night: (b, v) =>
    b === "tight"
      ? pick(v, [
          [bar("Meet for a drink at {venue}."), walk("Late-night", "late")],
          [walk("Late-night", "opener"), bar("A drink at {venue}.")],
        ])
      : b === "comfortable"
        ? pick(v, [
            [bar("Meet for a drink at {venue}."), activity(), walk("Late-night", "late")],
            [activity(), bar("Drinks at {venue}."), walk("Late-night", "late")],
          ])
        : pick(v, [
            [bar("Meet for a drink at {venue}."), activity(), walk("Late-night", "late"), dessert()],
            [activity(), restaurant(), bar("A nightcap at {venue}."), walk("Late-night", "late")],
          ]),
};

const CITY_TEMPLATES: Record<string, Record<TimeOfDay, StopSpec[]>> = { dresden: DRESDEN };

// The full arc for a city+time+budget (before the engine truncates to a realistic
// stop count). Curated cities keep their hand-made showcase arc; every other city
// rotates through arc variants by `variant` so the shape genuinely changes.
export function arcFor(
  city: string,
  timeOfDay: TimeOfDay,
  budget: Budget,
  variant = 0,
): StopSpec[] {
  const key = city.trim().toLowerCase();
  const curated = CITY_TEMPLATES[key];
  return curated ? curated[timeOfDay] : GENERIC[timeOfDay](budget, variant);
}

export function hasCuratedTemplate(city: string): boolean {
  return city.trim().toLowerCase() in CITY_TEMPLATES;
}

// ── Starter venues ────────────────────────────────────────────────────────────
// Shown instantly so the planner is never blank. STARTER EXAMPLES — replaced/
// verified in /plan-admin. `rating` is an editorial "our pick" score.
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
    // Budget (tier 1–2)
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
    // Comfortable (tier 3)
    v(
      "Kaffeehaus Aha",
      "cafe",
      3,
      4.5,
      "Altstadt",
      ["morning", "afternoon"],
      ["charming", "fair-trade"],
      "A nicer, slower brunch spot near the Frauenkirche.",
    ),
    v(
      "Wenzel Prager Bierstuben",
      "restaurant",
      3,
      4.4,
      "Altstadt",
      ["evening", "night"],
      ["hearty", "characterful"],
      "Proper sit-down dinner with atmosphere.",
    ),
    v(
      "Ch800 Cocktailbar",
      "bar",
      3,
      4.5,
      "Neustadt",
      ["evening", "night"],
      ["romantic", "cocktails"],
      "Grown-up cocktail bar — good for a real conversation.",
    ),
    // Treat (tier 4)
    v(
      "Kastenmeiers",
      "restaurant",
      4,
      4.6,
      "Altstadt",
      ["evening", "night"],
      ["upscale", "riverside"],
      "Fish-forward fine dining on the Terrassenufer — the treat option.",
    ),
    v(
      "Bean & Beluga",
      "restaurant",
      4,
      4.7,
      "Blasewitz",
      ["evening", "night"],
      ["fine-dining", "special"],
      "Special-occasion tasting menus when you're going all out.",
    ),
  ];
}
