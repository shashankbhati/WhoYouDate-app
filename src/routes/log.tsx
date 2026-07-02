import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { addEntry, getUserId, getProfile } from "@/lib/datedata/store";
import { ACTIVITY_META, LOG_ACTIVITIES, MOOD_META, type Activity, type Mood } from "@/lib/datedata/types";
import { detectPII } from "@/lib/datedata/pii";
import { isRealUser, openAuthModal } from "@/lib/auth";
import { getCountryConfig } from "@/lib/country";
import { toast } from "sonner";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Log a Date — Track Your Dating Expenses Anonymously | WhoAmIDating" },
      { name: "description", content: "Log your date anonymously — what you spent, where you went, your mood, and whether you'd go again. No personal data. Contribute to real dating cost statistics." },
    ],
  }),
  component: LogDate,
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: { city?: string; town?: string; village?: string; county?: string; state?: string; country?: string };
}

function cityNameFrom(r: NominatimResult): string {
  return r.address.city ?? r.address.town ?? r.address.village ?? r.address.county ?? r.display_name.split(",")[0].trim();
}

const CURRENCIES = ["EUR", "USD", "INR", "GBP", "CHF"];
const MEET = [
  { id: "bumble", label: "🐝 Bumble" },
  { id: "hinge", label: "⚙️ Hinge" },
  { id: "tinder", label: "🔥 Tinder" },
  { id: "friends", label: "👥 Through friends" },
  { id: "work", label: "🏢 Work / School" },
  { id: "irl", label: "🌍 Met in person" },
  { id: "app", label: "📱 Other app" },
  { id: "other", label: "💫 Other" },
];
const SECOND = [
  { id: "yes" as const, label: "✅ Yes!", sub: "Would go again" },
  { id: "no" as const, label: "❌ No", sub: "Not feeling it" },
  { id: "together" as const, label: "💗 Together", sub: "Already a couple" },
];
// Quick-tap "what made or broke it" tags — tappable so it's zero-friction
const TURNING_POINTS = ["Chemistry", "Money", "Kids", "His ex", "Her ex", "Distance", "Vibe", "Ghosted", "Looks", "Politics", "Values", "Timing"];

function LogDate() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(() => getCountryConfig().defaultCurrency);
  const [partner, setPartner] = useState("");
  const [cityInput, setCityInput] = useState<string>(() => getProfile()?.city ?? getCountryConfig().defaultCity);
  const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [meet, setMeet] = useState<string | undefined>();
  const [mood, setMood] = useState<Mood | null>(null);
  const [second, setSecond] = useState<typeof SECOND[number]["id"] | undefined>();
  const [turningPoint, setTurningPoint] = useState<string>("");
  const [note, setNote] = useState<string>("");

  function handleCityChange(val: string) {
    setCityInput(val);
    setSelectedCity(null);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1`
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function pickSuggestion(r: NominatimResult) {
    const name = cityNameFrom(r);
    setSelectedCity({ name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) });
    setCityInput(name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!isRealUser()) {
      openAuthModal("Sign in to log your dates and track your history.");
      return;
    }
    if (!activity) return toast.error("Pick an activity.");
    if (!amount || isNaN(+amount)) return toast.error("Enter an amount.");
    if (!partner.trim()) return toast.error("Add a partner first name.");
    if (!cityInput.trim()) return toast.error("Enter a city.");
    if (!mood) return toast.error("Pick an overall vibe.");
    const pii = detectPII(partner);
    if (pii) return toast.error(`Looks like you included a ${pii}. Use a first name only.`);
    addEntry({
      id: Math.random().toString(36).slice(2),
      userId: getUserId(),
      activity,
      amountCents: Math.round(+amount * 100),
      currency,
      partnerName: partner.trim(),
      mood,
      meetVia: meet,
      secondDate: second,
      turningPoint: turningPoint.trim() || undefined,
      note: note.trim() || undefined,
      city: selectedCity?.name ?? cityInput.trim(),
      lat: selectedCity?.lat,
      lon: selectedCity?.lon,
      entryDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    toast.success("Date logged anonymously 🎉");
    navigate({ to: "/stats" });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Log a Date</h1>
      <p className="text-muted-foreground mt-1">Record your dating activity anonymously</p>

      <form onSubmit={submit} className="mt-8 space-y-8">
        <Field label="Activity" required>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LOG_ACTIVITIES.map((k) => (
              <PickButton key={k} active={activity === k} onClick={() => setActivity(k)}>
                {ACTIVITY_META[k].emoji} {ACTIVITY_META[k].label}
              </PickButton>
            ))}
          </div>
        </Field>

        <div className="grid sm:grid-cols-[1fr_140px] gap-4">
          <Field label="Amount" required>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Partner First Name" required>
          <input value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="First name only, e.g. Sam, Luna..." className="w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </Field>

        <Field label="City (where did the date happen?)" required>
          <div className="relative">
            <input
              value={cityInput}
              onChange={(e) => handleCityChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search any city in the world..."
              className="w-full rounded-xl bg-input border border-border px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {searching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">searching…</span>
            )}
            {!searching && selectedCity && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-green-500 font-medium">📍 on map</span>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      onMouseDown={() => pickSuggestion(r)}
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
          {!selectedCity && cityInput.length > 1 && !searching && (
            <p className="text-xs text-muted-foreground mt-1.5">Pick a suggestion above to pin this date on your map</p>
          )}
        </Field>

        <Field label="How did you meet?" optional>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MEET.map((m) => (
              <PickButton key={m.id} active={meet === m.id} onClick={() => setMeet(meet === m.id ? undefined : m.id)}>{m.label}</PickButton>
            ))}
          </div>
        </Field>

        <Field label="Overall vibe?" required>
          <div className="grid grid-cols-5 gap-3">
            {([5, 4, 3, 2, 1] as Mood[]).map((m) => {
              const meta = MOOD_META[m];
              return (
                <button key={m} type="button" onClick={() => setMood(m)} className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition ${mood === m ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}>
                  <span className="text-3xl">{meta.emoji}</span>
                  <span className="text-xs text-muted-foreground">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Want a second date?" optional>
          <div className="grid grid-cols-3 gap-3">
            {SECOND.map((s) => (
              <button key={s.id} type="button" onClick={() => setSecond(second === s.id ? undefined : s.id)} className={`rounded-xl border p-4 text-center transition ${second === s.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}>
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="In one word — what made it or broke it?" optional>
          <div className="flex flex-wrap gap-2">
            {TURNING_POINTS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTurningPoint(turningPoint === t ? "" : t)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${turningPoint === t ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="💬 The line or move that landed" optional>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder="The exact thing you said or did that won them over — e.g. &quot;joked about my terrible cooking and offered to learn together&quot;"
            className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground mt-1.5">Anonymous — the best lines become community gold. {note.length > 0 && `${140 - note.length} left`}</p>
        </Field>

        <button type="submit" className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition">Log this date 🎉</button>
      </form>
    </main>
  );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold block mb-3">
        {label}{required && <span className="text-primary"> *</span>}
        {optional && <span className="text-muted-foreground font-normal"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

function PickButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
      {children}
    </button>
  );
}
