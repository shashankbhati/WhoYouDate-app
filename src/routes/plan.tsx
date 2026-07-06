import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/datedata/store";
import { useDatePlanStore, venuesForCity, submitReview } from "@/lib/dateplan/store";
import { buildPlan } from "@/lib/dateplan/engine";
import { nameSignal } from "@/lib/dateplan/nameStats";
import { getWeather } from "@/lib/dateplan/weather";
import { hasCuratedTemplate } from "@/lib/dateplan/templates";
import { fmtMoney } from "@/lib/dateplan/cost";
import { getCountryConfig } from "@/lib/country";
import {
  TIME_META,
  LEVEL_META,
  REWARD_LABEL,
  BUDGET_META,
  type TimeOfDay,
  type AgeRange,
  type Budget,
  type DatePlan,
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
function durationLabel(h: number): string {
  if (h >= 8) return "Whole day";
  if (h >= 5) return "Half day";
  return `${h} hr${h > 1 ? "s" : ""}`;
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
  const [durationHours, setDurationHours] = useState(3);

  const [plan, setPlan] = useState<DatePlan | null>(null);
  const [building, setBuilding] = useState(false);
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
    // Only that city's venues — never fall back to another city's places.
    const cityVenues = venuesForCity(city);
    setPlan(buildPlan(input, cityVenues, signal, weather, nonce));
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Plan the date</h1>
      <p className="text-muted-foreground mt-1">
        A full roadmap — where to go, what to ask, what it costs, and your next move rated by risk.
      </p>

      {/* ── Inputs ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          build(0);
        }}
        className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold block mb-2">
              Your date's first name{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lena, Priya…"
              className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="relative">
            <label className="text-sm font-semibold block mb-2">City</label>
            <input
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
              placeholder="Search a city…"
              className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {showSug && suggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      onMouseDown={() => pickCity(r)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted transition"
                    >
                      <div className="text-sm font-medium">{cityNameFrom(r)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[r.address.state, r.address.country].filter(Boolean).join(", ")}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Time of day</label>
          <div className="grid grid-cols-4 gap-2">
            {TODS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTod(t)}
                className={`rounded-xl border py-3 flex flex-col items-center gap-1 transition ${tod === t ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
              >
                <span className="text-xl">{TIME_META[t].emoji}</span>
                <span className="text-xs font-medium">{TIME_META[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Budget</label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(b)}
                className={`rounded-xl border py-3 flex flex-col items-center gap-1 transition ${budget === b ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
              >
                <span className="text-xl">{BUDGET_META[b].emoji}</span>
                <span className="text-xs font-medium">{BUDGET_META[b].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold flex items-center justify-between mb-2">
            <span>How long?</span>
            <span className="text-primary font-bold">{durationLabel(durationHours)}</span>
          </label>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={durationHours}
            onChange={(e) => setDurationHours(+e.target.value)}
            className="w-full accent-[var(--primary)]"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
            <span>Quick (1h)</span>
            <span>Half day</span>
            <span>Whole day</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold block mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">Age range</label>
            <div className="grid grid-cols-4 gap-1.5">
              {AGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAge(a)}
                  className={`rounded-lg border py-2.5 text-xs font-semibold transition ${age === a ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
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
          className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {building ? "Planning…" : "Plan a date 🗺️"}
        </button>
      </form>

      {!hasCuratedTemplate(city) && (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Dresden is fully curated. Other cities use a general roadmap for now — more cities coming.
        </p>
      )}

      {/* Empty state before the first plan — keeps the page from feeling blank. */}
      {!plan && !building && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-4xl">🗺️</p>
          <p className="mt-3 font-semibold">Your date roadmap appears here</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Set the vibe above and tap{" "}
            <span className="text-foreground font-medium">Plan a date</span> — you'll get where to
            go, what to ask, what it costs, and your best moves.
          </p>
        </div>
      )}

      {/* ── The plan ── */}
      {plan && (
        <PlanView
          plan={plan}
          proof={cityProof}
          onAnother={() => build(variant.current + 1)}
          building={building}
          input={{ partnerName: name, city, date, timeOfDay: tod, ageRange: age }}
        />
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
}) {
  const [chosen, setChosen] = useState<Record<number, Move>>({});
  const totalMin = plan.steps.reduce((a, s) => a + (s.type === "stop" ? s.minutes : 0), 0);
  const hrs = Math.round((totalMin / 60) * 10) / 10;

  return (
    <section className="mt-8">
      {/* Result header — the "this is a real thing, not a chatbot reply" block */}
      <div className="rounded-2xl border border-border bg-gradient-to-b from-primary/[0.06] to-transparent p-5">
        <h2 className="text-2xl font-bold">{plan.headline}</h2>
        {plan.weatherBanner && (
          <p className="mt-2 text-sm rounded-xl bg-muted px-3 py-2">{plan.weatherBanner}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Stat label="Duration" value={`~${hrs} hrs`} />
          <Stat label="Est. cost" value={`~${fmtMoney(plan.totalCents, plan.currency)}`} />
          {proof && <Stat label="2nd-date rate here" value={`${proof.secondPct}%`} />}
        </div>
        {proof ? (
          <p className="mt-3 text-xs text-muted-foreground">
            📊 Built from{" "}
            <span className="text-foreground font-semibold">{proof.count} real dates</span> logged
            in {plan.city}, weighted to your budget and age.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{plan.subline}</p>
        )}
      </div>

      {/* The timeline */}
      <ol className="relative mt-6 ml-3 border-l border-border/70 pl-6 space-y-6">
        {plan.steps.map((step) =>
          step.type === "stop" ? (
            <li key={step.order} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-background" />
              {step.timeLabel && (
                <div className="text-xs font-mono text-muted-foreground mb-1">{step.timeLabel}</div>
              )}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">
                    <span className="mr-1.5">{step.emoji}</span>
                    {step.title}
                  </h3>
                  <span className="text-xs text-muted-foreground shrink-0 text-right">
                    {step.minutes} min
                    {step.estCents != null && (
                      <div className="text-foreground font-semibold">
                        {step.estCents === 0
                          ? "free"
                          : `~${fmtMoney(step.estCents, plan.currency)}`}
                      </div>
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{step.scene}</p>

                {step.venue && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {step.venue.rating != null && (
                      <span className="text-amber-500 font-semibold">
                        ★ {step.venue.rating.toFixed(1)}
                      </span>
                    )}
                    {step.venue.priceTier != null && (
                      <span className="text-muted-foreground">
                        {"€".repeat(step.venue.priceTier)}
                      </span>
                    )}
                    {step.venue.area && (
                      <span className="text-muted-foreground">📍 {step.venue.area}</span>
                    )}
                    {step.venue.seed && (
                      <span className="text-muted-foreground/70 italic">starter pick</span>
                    )}
                  </div>
                )}
                {step.venue?.note && (
                  <p className="text-xs text-muted-foreground mt-1">💡 {step.venue.note}</p>
                )}

                {step.weatherNote && (
                  <p className="mt-2 text-xs rounded-lg bg-muted px-3 py-2">{step.weatherNote}</p>
                )}

                {step.questions.length > 0 && (
                  <div className="mt-3 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-primary/80">
                      Ask here
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {step.questions.map((q) => (
                        <li key={q.text} className="text-sm flex gap-2">
                          <span className="text-primary/50 shrink-0">›</span>
                          <span>“{q.text}”</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </li>
          ) : (
            <li key={step.order} className="relative">
              <span className="absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-2 border-dashed border-primary bg-background" />
              <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/[0.03] p-4">
                <p className="font-bold text-sm">🎯 {step.prompt}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick the one that fits the vibe — each is rated by risk and payoff.
                </p>
                <div className="mt-3 grid gap-2.5">
                  {step.options.map((m) => {
                    const isPicked = chosen[step.order]?.id === m.id;
                    const lm = LEVEL_META[m.risk];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setChosen((c) => ({ ...c, [step.order]: isPicked ? undefined! : m }))
                        }
                        className={`text-left rounded-xl border p-3.5 transition ${isPicked ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{lm.dot}</span>
                          <span className={`text-xs font-bold ${lm.color}`}>{lm.label}</span>
                          <span className="text-xs text-muted-foreground">
                            · {REWARD_LABEL[m.reward]}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1.5">{m.label}</p>
                        {m.hint && <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ),
        )}
      </ol>

      <button
        onClick={onAnother}
        disabled={building}
        className="mt-6 w-full rounded-full border border-primary text-primary py-2.5 font-semibold hover:bg-primary/10 transition disabled:opacity-60"
      >
        {building ? "Shuffling…" : "🔄 Try another plan"}
      </button>

      <ReviewCard input={input} chosen={chosen} />

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
  chosen,
}: {
  input: {
    partnerName: string;
    city: string;
    date: string;
    timeOfDay: TimeOfDay;
    ageRange: AgeRange;
  };
  chosen: Record<number, Move>;
}) {
  const [open, setOpen] = useState(false);
  const [wentWell, setWentWell] = useState(0);
  const [second, setSecond] = useState<"yes" | "no" | "maybe" | undefined>();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!wentWell) return toast.error("Rate how it went first.");
    const lastMove = Object.values(chosen).filter(Boolean).slice(-1)[0];
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
