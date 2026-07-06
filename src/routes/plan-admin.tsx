import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthState, openAuthModal } from "@/lib/auth";
import { useDatePlanStore, addVenue, deleteVenue, venuesForCity } from "@/lib/dateplan/store";
import type { VenueKind, TimeOfDay } from "@/lib/dateplan/types";
import { toast } from "sonner";

export const Route = createFileRoute("/plan-admin")({
  head: () => ({ meta: [{ title: "Venue admin", name: "robots", content: "noindex" }] }),
  component: PlanAdmin,
});

const KINDS: VenueKind[] = [
  "cafe",
  "bar",
  "restaurant",
  "dessert",
  "activity",
  "walk",
  "park",
  "view",
];
const TODS: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

function PlanAdmin() {
  const { isReal } = useAuthState();
  const { isAdmin, venues } = useDatePlanStore();

  const [city, setCity] = useState("Dresden");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<VenueKind>("cafe");
  const [priceTier, setPriceTier] = useState(2);
  const [rating, setRating] = useState(4.5);
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [vibes, setVibes] = useState("");
  const [goodFor, setGoodFor] = useState<TimeOfDay[]>(["evening"]);
  const [saving, setSaving] = useState(false);

  const cityVenues = venuesForCity(city).filter((v) => !v.seed);

  async function save() {
    if (!name.trim()) return toast.error("Add a venue name.");
    setSaving(true);
    const res = await addVenue({
      city,
      name,
      kind,
      priceTier,
      rating,
      area: area || undefined,
      note: note || undefined,
      vibeTags: vibes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      goodFor,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Added ${name} 🎉`);
      setName("");
      setArea("");
      setNote("");
      setVibes("");
    } else {
      toast.error(res.error ?? "Could not save.");
    }
  }

  if (!isReal) {
    return (
      <Shell>
        <p className="text-muted-foreground">You need to sign in with your admin account first.</p>
        <button
          onClick={() => openAuthModal("Sign in to manage venues.")}
          className="mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-semibold"
        >
          Sign in
        </button>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <p className="text-muted-foreground">
          This account isn't on the admin list. Add your login email to the{" "}
          <code className="text-foreground">admins</code> table in Supabase:
        </p>
        <pre className="mt-3 rounded-xl bg-muted p-3 text-xs overflow-x-auto">
          INSERT INTO admins (email) VALUES ('your-login-email');
        </pre>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <L label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inp} />
          </L>
          <L label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Combo Coffee"
              className={inp}
            />
          </L>
        </div>

        <L label="Kind">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition ${kind === k ? "border-primary bg-primary/10" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>
        </L>

        <div className="grid sm:grid-cols-2 gap-4">
          <L label={`Price tier — ${"€".repeat(priceTier)}`}>
            <input
              type="range"
              min={1}
              max={4}
              value={priceTier}
              onChange={(e) => setPriceTier(+e.target.value)}
              className="w-full"
            />
          </L>
          <L label={`Your rating — ${rating.toFixed(1)}★`}>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={rating}
              onChange={(e) => setRating(+e.target.value)}
              className="w-full"
            />
          </L>
        </div>

        <L label="Good for">
          <div className="flex flex-wrap gap-1.5">
            {TODS.map((t) => {
              const on = goodFor.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGoodFor((g) => (on ? g.filter((x) => x !== t) : [...g, t]))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition ${on ? "border-primary bg-primary/10" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </L>

        <div className="grid sm:grid-cols-2 gap-4">
          <L label="Area (optional)">
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Neustadt, Altstadt…"
              className={inp}
            />
          </L>
          <L label="Vibe tags (comma-sep)">
            <input
              value={vibes}
              onChange={(e) => setVibes(e.target.value)}
              placeholder="cozy, romantic, lively"
              className={inp}
            />
          </L>
        </div>

        <L label="One-line tip (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Grab the window seat overlooking the river."
            className={inp}
          />
        </L>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add venue"}
        </button>
      </div>

      <h2 className="mt-8 mb-3 font-bold">
        Curated in {city} ({cityVenues.length})
      </h2>
      {cityVenues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None yet — add your first above. (Starter examples show on the planner until you do.)
        </p>
      ) : (
        <ul className="space-y-2">
          {cityVenues.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {v.name}{" "}
                  <span className="text-xs text-muted-foreground font-normal capitalize">
                    · {v.kind}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.rating?.toFixed(1)}★ · {"€".repeat(v.priceTier ?? 0)} · {v.goodFor.join(", ")}
                </p>
              </div>
              <button
                onClick={() => deleteVenue(v.id)}
                className="text-xs text-rose-500 hover:underline shrink-0"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

const inp =
  "w-full rounded-xl bg-input border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring/40";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold block mb-2">{label}</label>
      {children}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted-foreground mb-3">
        <Link to="/plan" className="hover:text-foreground">
          ← back to planner
        </Link>
      </p>
      <h1 className="text-2xl font-bold mb-1">Venue admin 🛠️</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Curate the places the date planner recommends.
      </p>
      {children}
    </main>
  );
}
