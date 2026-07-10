import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/datedata/store";
import {
  useDatePlanStore,
  venuesForCity,
  ensureCityVenues,
  submitReview,
} from "@/lib/dateplan/store";
import { buildPlan } from "@/lib/dateplan/engine";
import { sharePlan } from "@/lib/dateplan/share";
import { openAuthModal } from "@/lib/auth";
import { nameSignal } from "@/lib/dateplan/nameStats";
import { getWeather } from "@/lib/dateplan/weather";
import { hasCuratedTemplate } from "@/lib/dateplan/templates";
import { fmtMoney } from "@/lib/dateplan/cost";
import { getCountryConfig } from "@/lib/country";
import {
  TIME_META,
  type TimeOfDay,
  type AgeRange,
  type Budget,
  type DatePlan,
  type RoadmapStop,
  type Move,
} from "@/lib/dateplan/types";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Date Planner — Plan the Perfect Date in Dresden | WhoAmIDating" },
      {
        name: "description",
        content:
          "Get a full date roadmap for Dresden — where to go, what to ask, how long to stay, what it costs, and your next move rated by risk and reward. Built from real dating data.",
      },
    ],
  }),
  component: PlanPage,
});

const TODS: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];
const AGES: AgeRange[] = ["18-24", "25-34", "35-44", "45+"];
const BUDGETS: Budget[] = ["tight", "comfortable", "treat"];
const BUDGET_SYM: Record<Budget, string> = { tight: "€", comfortable: "€€", treat: "€€€" };
const LENGTHS: { label: string; h: number }[] = [
  { label: "2h", h: 2 },
  { label: "4h", h: 4 },
  { label: "All night", h: 6 },
];

// Known coords for our launch city so weather works with zero clicks.
const DRESDEN = { name: "Dresden", lat: 51.0504, lon: 13.7373 };

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}
function cityNameFrom(r: NominatimResult): string {
  return (
    r.address.city ??
    r.address.town ??
    r.address.village ??
    r.address.county ??
    r.display_name.split(",")[0].trim()
  );
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function PlanPage() {
  const { entries } = useStore();
  useDatePlanStore(); // subscribe so curated venues load in the background

  const [name, setName] = useState("");
  const [city, setCity] = useState(DRESDEN.name);
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: DRESDEN.lat,
    lon: DRESDEN.lon,
  });
  const [date, setDate] = useState(todayISO());
  const [tod, setTod] = useState<TimeOfDay>("evening");
  const [age, setAge] = useState<AgeRange>("25-34");
  const [budget, setBudget] = useState<Budget>("comfortable");
  const [durationHours, setDurationHours] = useState(4);

  const [plan, setPlan] = useState<DatePlan | null>(null);
  const [building, setBuilding] = useState(false);
  const [mode, setMode] = useState<"setup" | "reel">("setup"); // setup card → full reel
  const variant = useRef(0);
  const geoCity = useRef(DRESDEN.name); // the city `coords` currently points at

  // City autocomplete (Nominatim — same as the log form)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSug, setShowSug] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleCityChange(val: string) {
    setCity(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1`,
        );
        setSuggestions(await res.json());
        setShowSug(true);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  }
  function pickCity(r: NominatimResult) {
    const nm = cityNameFrom(r);
    setCity(nm);
    setCoords({ lat: parseFloat(r.lat), lon: parseFloat(r.lon) });
    geoCity.current = nm;
    setSuggestions([]);
    setShowSug(false);
  }

  async function build(nonce = 0) {
    variant.current = nonce;
    setBuilding(true);
    const currency = getCountryConfig().defaultCurrency;
    const input = {
      partnerName: name,
      city,
      date,
      timeOfDay: tod,
      ageRange: age,
      budget,
      currency,
      durationHours,
    };
    const signal = nameSignal(entries, name);
    // If the city was typed but not picked from the dropdown, its coords are
    // stale — geocode it so the weather matches the actual city.
    let c = coords;
    if (city.trim().toLowerCase() !== geoCity.current.trim().toLowerCase()) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        );
        const d = await res.json();
        if (d[0]) {
          c = { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
          setCoords(c);
          geoCity.current = city;
        }
      } catch {
        /* keep existing coords */
      }
    }
    const weather = await getWeather(c.lat, c.lon, date, tod).catch(() => null);
    // Auto-import venues for supported cities (e.g. Berlin) on first use; no-op
    // for curated/other cities.
    await ensureCityVenues(city);
    // Only that city's venues — never fall back to another city's places.
    const cityVenues = venuesForCity(city);
    setPlan(buildPlan(input, cityVenues, signal, weather, nonce));
    setMode("reel"); // hand over the screen to the reel
    setBuilding(false);
  }

  // Real-community proof for the PLANNED city (not the live input, which may have
  // moved on since the plan was built).
  const cityProof = useMemo(() => {
    const key = (plan?.city ?? "").trim().toLowerCase();
    if (!key) return null;
    const rows = entries.filter((e) => e.city.toLowerCase() === key);
    if (rows.length < 8) return null;
    const second = rows.filter((e) => e.secondDate && e.secondDate !== "no").length / rows.length;
    return { count: rows.length, secondPct: Math.round(second * 100) };
  }, [entries, plan?.city]);

  if (mode === "reel" && plan) {
    return (
      <main className="mx-auto max-w-[440px] px-4 py-8">
        <button
          type="button"
          onClick={() => setMode("setup")}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Edit details
        </button>
        <PlanView
          plan={plan}
          proof={cityProof}
          onAnother={() => build(variant.current + 1)}
          building={building}
          input={{ partnerName: name, city, date, timeOfDay: tod, ageRange: age }}
          shareKey={`${name}|${city}|${date}|${tod}|${age}|${budget}|${durationHours}|${variant.current}`}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[440px] px-4 py-8 [font-family:var(--font-sans)]">
      {/* Header */}
      <div className="mb-4 px-1">
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          New date · draft 01
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
          Tell me the shape of it.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">A few taps. I'll write the reel.</p>
      </div>

      {/* Cinematic setup card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          build(0);
        }}
        className="relative overflow-hidden rounded-[32px] bg-[color:var(--color-reel-surface)] p-6 ring-1 ring-white/10 shadow-2xl"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 15% 0%, oklch(0.35 0.11 15 / 0.5), transparent 55%), radial-gradient(circle at 90% 100%, oklch(0.3 0.09 300 / 0.5), transparent 55%)",
          }}
        />
        <div className="relative space-y-6 text-white">
          {/* For + In */}
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <label className="block">
              <span className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
                For
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--color-reel-rose-soft)] text-sm font-semibold text-[color:var(--color-reel-rose)]">
                  {name.trim() ? name.trim()[0].toUpperCase() : "♥"}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="your date"
                  className="w-full border-b border-white/15 bg-transparent pb-1 text-2xl font-semibold tracking-tight outline-none placeholder:text-white/30 focus:border-[color:var(--color-reel-rose)]"
                />
              </div>
            </label>
            <div className="relative block text-right">
              <span className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
                In
              </span>
              <input
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 200)}
                className="mt-1 w-32 border-b border-white/15 bg-transparent pb-1 text-right text-lg outline-none focus:border-[color:var(--color-reel-rose)]"
              />
              {showSug && suggestions.length > 0 && (
                <ul className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl bg-[color:var(--color-reel-bg)] ring-1 ring-white/10 shadow-xl">
                  {suggestions.map((r) => (
                    <li key={r.place_id}>
                      <button
                        type="button"
                        onMouseDown={() => pickCity(r)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/[0.06] transition"
                      >
                        <div className="text-sm font-medium">{cityNameFrom(r)}</div>
                        <div className="text-xs text-white/40 truncate">
                          {[r.address.state, r.address.country].filter(Boolean).join(", ")}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Time of day */}
          <div>
            <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
              When
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {TODS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTod(t)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border py-2.5 transition ${tod === t ? "border-[color:var(--color-reel-rose)] bg-[color:var(--color-reel-rose)]/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <span className="text-lg leading-none">{TIME_META[t].emoji}</span>
                  <span className="text-[11px] font-medium">{TIME_META[t].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget + Length pills */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
                Budget
              </p>
              <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className={`min-w-10 rounded-full px-3 py-1.5 text-sm font-semibold transition ${budget === b ? "bg-white text-neutral-950" : "text-white/60"}`}
                  >
                    {BUDGET_SYM[b]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
                Length
              </p>
              <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                {LENGTHS.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => setDurationHours(l.h)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${durationHours === l.h ? "bg-white text-neutral-950" : "text-white/60"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date + Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
                Date
              </p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full border-b border-white/15 bg-transparent pb-1 text-sm outline-none focus:border-[color:var(--color-reel-rose)] [color-scheme:dark]"
              />
            </div>
            <div>
              <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/40">
                Age
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {AGES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAge(a)}
                    className={`rounded-lg border py-1.5 text-[10px] font-semibold transition ${age === a ? "border-[color:var(--color-reel-rose)] bg-[color:var(--color-reel-rose)]/15 text-white" : "border-white/10 bg-white/[0.03] text-white/50"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={building}
            className="w-full rounded-full bg-[color:var(--color-reel-rose)] py-3.5 font-semibold text-neutral-950 transition active:scale-[0.99] disabled:opacity-60"
          >
            {building ? "Writing…" : "Write the reel →"}
          </button>
          <p className="text-center [font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/30">
            A roadmap · private prompts · your best moves
          </p>
        </div>
      </form>

      {!hasCuratedTemplate(city) && (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          More cities are being added.{" "}
          <a
            href="mailto:hello@whoamidating.singles?subject=Add my city"
            className="text-primary hover:underline"
          >
            Request yours →
          </a>
        </p>
      )}
    </main>
  );
}

function PlanView({
  plan,
  proof,
  onAnother,
  building,
  input,
  shareKey,
}: {
  plan: DatePlan;
  proof: { count: number; secondPct: number } | null;
  onAnother: () => void;
  building: boolean;
  input: {
    partnerName: string;
    city: string;
    date: string;
    timeOfDay: TimeOfDay;
    ageRange: AgeRange;
  };
  shareKey: string;
}) {
  const [lastMove, setLastMove] = useState<Move | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const totalMin = plan.steps.reduce((a, s) => a + (s.type === "stop" ? s.minutes : 0), 0);
  const hrs = Math.round((totalMin / 60) * 10) / 10;

  async function share(p: DatePlan) {
    if (sharing) return;
    setSharing(true);
    const res = await sharePlan(p, shareKey);
    setSharing(false);
    if (res.error === "login") return openAuthModal("Sign in to share this plan with your date.");
    if (!res.ok || !res.url) return toast.error(res.error ?? "Couldn't create a share link.");
    const data = {
      title: "Our date plan",
      text: "I planned our date 👀 — take a look (and tweak anything):",
      url: res.url,
    };
    // Native share sheet (WhatsApp etc.) on mobile; clipboard fallback elsewhere.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(res.url);
        toast.success("Share link copied — send it to your date 💌");
      } catch {
        toast.message(res.url);
      }
    }
  }

  return (
    <section className="mt-8">
      {/* Header meta */}
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {plan.timeOfDay} · {plan.city}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{plan.headline}</h2>
        </div>
      </div>

      {plan.weatherBanner && (
        <p className="text-sm rounded-xl bg-muted px-3 py-2 mb-3">{plan.weatherBanner}</p>
      )}

      {/* The story reel */}
      <StoryReel plan={plan} onPick={setLastMove} />

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <Stat label="Duration" value={`~${hrs} hrs`} />
        <Stat label="Est. cost" value={`~${fmtMoney(plan.totalCents, plan.currency)}`} />
        {proof && <Stat label="2nd-date rate" value={`${proof.secondPct}%`} />}
      </div>
      {proof && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          📊 Built from{" "}
          <span className="text-foreground font-semibold">{proof.count} real dates</span> in{" "}
          {plan.city}.
        </p>
      )}

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <button
          onClick={onAnother}
          disabled={building}
          className="w-full rounded-full border border-primary text-primary py-2.5 font-semibold hover:bg-primary/10 transition disabled:opacity-60"
        >
          {building ? "Shuffling…" : "🔄 Try another plan"}
        </button>
        <button
          onClick={() => share(plan)}
          disabled={sharing}
          className="w-full rounded-full bg-primary text-primary-foreground py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {sharing ? "Preparing…" : "📤 Share with your date"}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        They'll see the plan (and can tweak it) — but never your budget, prompts, or moves.
      </p>

      <ReviewCard input={input} lastMove={lastMove} />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tip: log the date afterwards on your{" "}
        <Link to="/log" className="text-primary hover:underline">
          ledger
        </Link>{" "}
        to sharpen future plans.
      </p>
    </section>
  );
}

// ── The Story Reel — each stop is a full-screen, swipeable "chapter" ──────────
const REEL_BGS = [
  "linear-gradient(160deg, oklch(0.35 0.12 30), oklch(0.18 0.05 285))",
  "linear-gradient(160deg, oklch(0.28 0.08 40), oklch(0.16 0.03 260))",
  "linear-gradient(180deg, oklch(0.22 0.05 260), oklch(0.14 0.02 260))",
  "linear-gradient(160deg, oklch(0.3 0.09 350), oklch(0.16 0.04 300))",
];

function StoryReel({ plan, onPick }: { plan: DatePlan; onPick: (m: Move) => void }) {
  const stops = plan.steps.filter((s): s is RoadmapStop => s.type === "stop");
  const [idx, setIdx] = useState(0);
  const [drawer, setDrawer] = useState(true);
  const [pick, setPick] = useState<"safe" | "risky" | null>(null);
  const s = stops[idx];
  if (!s) return null;

  const go = (i: number) => {
    setIdx(Math.max(0, Math.min(stops.length - 1, i)));
    setPick(null);
    setDrawer(true);
  };
  const kind = s.title.split(" — ")[0];
  const place = s.venue?.name ?? s.title;
  const startTime = s.timeLabel?.split(" – ")[0] ?? "";
  const cost = s.estCents === 0 ? "free" : `~${fmtMoney(s.estCents ?? 0, plan.currency)}`;

  return (
    <div className="[font-family:var(--font-sans)] text-white">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-[36px] bg-[color:var(--color-reel-bg)] shadow-2xl ring-1 ring-white/10">
        {/* Chapter progress */}
        <div className="absolute inset-x-4 top-4 z-30 flex gap-1.5">
          {stops.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"
              aria-label={`Chapter ${i + 1}`}
            >
              <span
                className={`block h-full rounded-full ${i <= idx ? "w-full bg-white" : "w-0"}`}
              />
            </button>
          ))}
        </div>

        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{ background: REEL_BGS[idx % REEL_BGS.length] }}
        />
        <div className="absolute inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-t from-[color:var(--color-reel-bg)] via-[color:var(--color-reel-bg)]/60 to-transparent" />

        {/* Tap zones */}
        <button
          className="absolute left-0 top-0 z-10 h-full w-1/3"
          aria-label="Previous"
          onClick={() => go(idx - 1)}
        />
        <button
          className="absolute right-0 top-0 z-10 h-full w-1/3"
          aria-label="Next"
          onClick={() => go(idx + 1)}
        />

        {/* Content */}
        <div className="relative z-20 flex h-full flex-col p-6 pt-14">
          <p className="[font-family:var(--font-mono)] text-[11px] uppercase tracking-[0.25em] text-white/60">
            {s.emoji} Chapter {idx + 1} · {kind}
          </p>
          {startTime && (
            <span className="[font-family:var(--font-display)] mt-2 text-6xl font-extrabold leading-none tracking-tight text-white/90">
              {startTime}
            </span>
          )}
          <h3 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-tight text-balance">
            {place}
          </h3>
          <p className="mt-3 max-w-[28ch] text-sm text-white/70">{s.scene}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {s.venue?.rating != null && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
                ★ {s.venue.rating.toFixed(1)}
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
              {cost}
            </span>
            {s.venue?.area && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
                📍 {s.venue.area}
              </span>
            )}
          </div>

          {s.weatherNote && <p className="mt-3 text-[11px] text-white/60">{s.weatherNote}</p>}

          <div className="mt-auto">
            {!drawer && (
              <button
                onClick={() => setDrawer(true)}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur"
              >
                <span className="size-1.5 rounded-full bg-[color:var(--color-reel-rose)]" /> Open
                whisper
              </button>
            )}
          </div>
        </div>

        {/* Whisper drawer — the private layer (only the planner sees this) */}
        {drawer && (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-[color:var(--color-reel-surface)] p-5 pb-6 ring-1 ring-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => setDrawer(false)}
              className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/20"
              aria-label="Close whisper"
            />
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[color:var(--color-reel-rose)]" />
                <p className="[font-family:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
                  Whisper · only you
                </p>
              </div>
              <span className="[font-family:var(--font-mono)] text-[10px] text-white/40">
                {idx + 1}/{stops.length}
              </span>
            </div>

            {s.questions[0] && (
              <p className="[font-family:var(--font-serif)] mb-4 text-lg italic leading-snug text-balance">
                “{s.questions[0].text}”
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {s.safe && (
                <button
                  onClick={() => {
                    setPick("safe");
                    onPick(s.safe!);
                  }}
                  className={`-rotate-1 rounded-2xl border p-3 text-left transition ${pick === "safe" ? "border-white bg-white text-neutral-950" : "border-white/15 bg-white/[0.03] text-white/90"}`}
                >
                  <p className="[font-family:var(--font-mono)] text-[9px] font-bold uppercase tracking-widest opacity-70">
                    Safe move
                  </p>
                  <p className="mt-1 text-xs leading-snug">{s.safe.label}</p>
                </button>
              )}
              {s.risky && (
                <button
                  onClick={() => {
                    setPick("risky");
                    onPick(s.risky!);
                  }}
                  className={`rotate-1 rounded-2xl border p-3 text-left transition ${pick === "risky" ? "border-[color:var(--color-reel-rose)] bg-[color:var(--color-reel-rose)] text-neutral-950" : "border-[color:var(--color-reel-rose)]/40 bg-[color:var(--color-reel-rose-soft)]/40 text-[color:var(--color-reel-rose)]"}`}
                >
                  <p className="[font-family:var(--font-mono)] text-[9px] font-bold uppercase tracking-widest opacity-80">
                    Risky move
                  </p>
                  <p className="mt-1 text-xs leading-snug">{s.risky.label}</p>
                </button>
              )}
            </div>
            <p className="mt-3 text-center [font-family:var(--font-mono)] text-[9px] uppercase tracking-widest text-white/40">
              Only you can see this · tap sides to move
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

// Post-date review — the outcome loop that turns risk/reward labels into real stats.
function ReviewCard({
  input,
  lastMove,
}: {
  input: {
    partnerName: string;
    city: string;
    date: string;
    timeOfDay: TimeOfDay;
    ageRange: AgeRange;
  };
  lastMove?: Move;
}) {
  const [open, setOpen] = useState(false);
  const [wentWell, setWentWell] = useState(0);
  const [second, setSecond] = useState<"yes" | "no" | "maybe" | undefined>();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!wentWell) return toast.error("Rate how it went first.");
    const res = await submitReview({
      input,
      chosenMove: lastMove,
      wentWell,
      gotSecond: second,
      note,
    });
    if (res.ok) {
      setSent(true);
      toast.success("Thanks — this makes the next plan smarter 💡");
    } else toast.error(res.error ?? "Could not save your review.");
  }

  if (sent) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center">
        <p className="font-semibold">Review saved 🙏</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your outcome feeds the risk/reward ratings other daters see.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full text-left">
          <p className="font-bold">Been on the date already? Tell us how it went →</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your feedback trains the planner — which moves actually work, here, for real.
          </p>
        </button>
      ) : (
        <div className="space-y-4">
          <p className="font-bold">How did it go?</p>
          <div>
            <label className="text-xs font-semibold block mb-2 text-muted-foreground">
              Overall
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWentWell(n)}
                  className={`rounded-lg border py-2.5 text-lg transition ${wentWell === n ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
                >
                  {["😤", "😕", "😐", "😊", "😍"][n - 1]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-2 text-muted-foreground">
              Second date?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["yes", "maybe", "no"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSecond(second === s ? undefined : s)}
                  className={`rounded-lg border py-2.5 text-sm font-medium capitalize transition ${second === s ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder="What worked or flopped? (optional, anonymous)"
            className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            onClick={send}
            className="w-full rounded-full bg-primary text-primary-foreground py-2.5 font-semibold hover:opacity-90 transition"
          >
            Submit review
          </button>
        </div>
      )}
    </div>
  );
}
