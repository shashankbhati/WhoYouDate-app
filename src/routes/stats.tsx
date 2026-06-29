import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useStore, getUserId, deleteEntry, editEntry } from "@/lib/datedata/store";

const DatingMap = lazy(() => import("@/components/datedata/DatingMap"));
import { ACTIVITY_META, MOOD_META, type Activity, type Mood } from "@/lib/datedata/types";
import { earnedBadges } from "@/lib/datedata/badges";
import { Calendar, DollarSign, TrendingUp, Heart, Share2, Pencil, Trash2, Check, X } from "lucide-react";
import { sharePersonalCard } from "@/lib/shareCard";
import { toast } from "sonner";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "My Dating Stats — WhoAmIDating" },
      { name: "description", content: "Your personal anonymous dating dashboard. Track spending, mood trends, partner history, and see where you've been on dates on the map." },
    ],
  }),
  component: Stats,
});

const MOOD_COLORS = ["#ec4899", "#f472b6", "#fb7185", "#fda4af", "#fecdd3"];

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-sm text-muted-foreground text-center py-10">No data yet.</p>;
  const cx = 100, cy = 100, R = 80, r = 52;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = angle;
    angle += sweep;
    return { d, start, end: angle, color: MOOD_COLORS[i % MOOD_COLORS.length] };
  });
  function arc(s: number, e: number, outerR: number, innerR: number) {
    const large = e - s > Math.PI ? 1 : 0;
    const cos = Math.cos, sin = Math.sin;
    return [
      `M${cx + outerR * cos(s)},${cy + outerR * sin(s)}`,
      `A${outerR},${outerR},0,${large},1,${cx + outerR * cos(e)},${cy + outerR * sin(e)}`,
      `L${cx + innerR * cos(e)},${cy + innerR * sin(e)}`,
      `A${innerR},${innerR},0,${large},0,${cx + innerR * cos(s)},${cy + innerR * sin(s)}`,
      "Z",
    ].join(" ");
  }
  return (
    <div className="flex items-center gap-6 h-64">
      <svg viewBox="0 0 200 200" className="w-40 h-40 shrink-0">
        {slices.map((s, i) => <path key={i} d={arc(s.start, s.end, R, r)} fill={s.color} />)}
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-muted-foreground truncate">{s.d.name}</span>
            <span className="font-bold ml-auto">{Math.round((s.d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stats() {
  const { entries, profile, loading } = useStore();
  const userId = getUserId();
  const mine = entries.filter((e) => e.userId === userId);

  const totalSpent = mine.reduce((a, e) => a + e.amountCents, 0);
  const avg = mine.length ? totalSpent / mine.length : 0;
  const happyPct = mine.length ? Math.round((mine.filter((e) => e.mood >= 4).length / mine.length) * 100) : 0;
  const successCount = mine.filter((e) => e.secondDate === "yes" || e.secondDate === "together").length;
  const successRate = mine.length ? Math.round((successCount / mine.length) * 100) : 0;

  const successByActivity = useMemo(() => {
    const map: Record<string, { total: number; success: number }> = {};
    mine.forEach((e) => {
      if (!map[e.activity]) map[e.activity] = { total: 0, success: 0 };
      map[e.activity].total++;
      if (e.secondDate === "yes" || e.secondDate === "together") map[e.activity].success++;
    });
    return Object.entries(map)
      .map(([act, d]) => ({ act: act as Activity, rate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0, total: d.total }))
      .sort((a, b) => b.rate - a.rate);
  }, [mine]);

  const successBySource = useMemo(() => {
    const map: Record<string, { total: number; success: number }> = {};
    mine.forEach((e) => {
      if (!e.meetVia) return;
      if (!map[e.meetVia]) map[e.meetVia] = { total: 0, success: 0 };
      map[e.meetVia].total++;
      if (e.secondDate === "yes" || e.secondDate === "together") map[e.meetVia].success++;
    });
    return Object.entries(map)
      .map(([src, d]) => ({ src, rate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0, total: d.total }))
      .sort((a, b) => b.rate - a.rate);
  }, [mine]);

  const favActivity = useMemo(() => {
    const c: Record<string, number> = {};
    mine.forEach((e) => { c[e.activity] = (c[e.activity] ?? 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return top ? ACTIVITY_META[top[0] as Activity] : null;
  }, [mine]);

  const platform = useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach((e) => { c[e.activity] = (c[e.activity] ?? 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ ...ACTIVITY_META[k as Activity], count: v }));
  }, [entries]);
  const platformMax = Math.max(1, ...platform.map((p) => p.count));

  const moodDist = useMemo(() => {
    const c: Record<number, number> = {};
    mine.forEach((e) => { c[e.mood] = (c[e.mood] ?? 0) + 1; });
    return Object.entries(c).map(([m, count]) => ({ name: `${MOOD_META[+m as Mood].emoji} ${MOOD_META[+m as Mood].label}`, value: count }));
  }, [mine]);

  const [mapReady, setMapReady] = useState(false);
  useEffect(() => setMapReady(true), []);

  const partnerStats = useMemo(() => {
    const map: Record<string, { count: number; total: number; moods: number[] }> = {};
    mine.forEach((e) => {
      if (!map[e.partnerName]) map[e.partnerName] = { count: 0, total: 0, moods: [] };
      map[e.partnerName].count++;
      map[e.partnerName].total += e.amountCents;
      map[e.partnerName].moods.push(e.mood);
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        count: v.count,
        avgSpend: Math.round(v.total / v.count),
        avgMood: v.moods.reduce((a, b) => a + b, 0) / v.moods.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [mine]);

  const badges = earnedBadges(mine);
  const recent = mine.slice(0, 30);

  // Detect primary currency from entries
  const currencyCount: Record<string, number> = {};
  mine.forEach((e) => { currencyCount[e.currency] = (currencyCount[e.currency] ?? 0) + 1; });
  const primaryCurrency = Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "EUR";
  const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", INR: "₹", GBP: "£", CHF: "Fr" };
  const currencySymbol = CURRENCY_SYMBOLS[primaryCurrency] ?? primaryCurrency;

  function handleShare() {
    sharePersonalCard({
      username: profile?.displayName ?? "anon",
      totalDates: mine.length,
      totalSpent,
      avgPerDate: avg,
      currencySymbol,
      happyRate: happyPct,
      successRate,
      avgMood: mine.length ? mine.reduce((a, e) => a + e.mood, 0) / mine.length : 0,
      favActivity: favActivity ? `${favActivity.emoji} ${favActivity.label}` : "—",
    });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted mb-2" />
        <div className="h-4 w-32 animate-pulse rounded-lg bg-muted mb-8" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl border border-border bg-card p-5 h-24 animate-pulse" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Dashboard</h1>
          <p className="text-muted-foreground mt-1">Hey {profile?.displayName ?? "there"} 👋</p>
        </div>
        {mine.length > 0 && (
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition shrink-0"
          >
            <Share2 className="h-4 w-4" /> share my stats
          </button>
        )}
      </div>

      {mine.length === 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-4xl mb-3">📊</p>
          <h2 className="font-bold text-lg mb-1">No dates logged yet</h2>
          <p className="text-muted-foreground text-sm mb-5">Log your first date to see your personal stats, success rate, and badges.</p>
          <Link to="/log" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-2.5 font-semibold text-sm hover:opacity-90">
            Log Your First Date →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <StatCard icon={<Calendar className="h-4 w-4 text-primary" />} label="Total Entries" value={String(mine.length)} />
            <StatCard icon={<DollarSign className="h-4 w-4 text-primary" />} label="Total Spent" value={`€${(totalSpent / 100).toFixed(0)}`} />
            <StatCard icon={<TrendingUp className="h-4 w-4 text-amber-400" />} label="Avg per Date" value={`€${(avg / 100).toFixed(0)}`} />
            <StatCard icon={<Heart className="h-4 w-4 text-emerald-400" />} label="Success Rate" value={mine.length ? `${successRate}%` : "—"} />
          </div>

          {/* Success formula */}
          {(successByActivity.length > 0 || successBySource.length > 0) && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold mb-1">🎯 Your Success Formula</h3>
              <p className="text-sm text-muted-foreground mb-4">Based on which dates led to a second date</p>
              <div className="grid sm:grid-cols-2 gap-6">
                {successByActivity.length > 0 && (
                  <div>
                    <p className="text-xs font-bold tracking-wider text-muted-foreground mb-3">BY ACTIVITY</p>
                    <div className="space-y-2">
                      {successByActivity.slice(0, 4).map((a) => (
                        <div key={a.act}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{ACTIVITY_META[a.act].emoji} {ACTIVITY_META[a.act].label}</span>
                            <span className="font-bold" style={{ color: a.rate >= 60 ? "hsl(var(--primary))" : "inherit" }}>{a.rate}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${a.rate}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {successBySource.length > 0 && (
                  <div>
                    <p className="text-xs font-bold tracking-wider text-muted-foreground mb-3">BY SOURCE</p>
                    <div className="space-y-2">
                      {successBySource.slice(0, 4).map((s) => (
                        <div key={s.src}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{s.src.replace("_", " ")}</span>
                            <span className="font-bold" style={{ color: s.rate >= 60 ? "hsl(var(--primary))" : "inherit" }}>{s.rate}% <span className="text-muted-foreground font-normal">({s.total})</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${s.rate}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {favActivity && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Favorite Activity</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xl font-bold">{favActivity.emoji} {favActivity.label}</p>
                <span className="text-3xl">{favActivity.emoji}</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Badges Earned ({badges.length})</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.length === 0 && <span className="text-sm text-muted-foreground">Log a date to start earning badges.</span>}
              {badges.map((b) => (
                <span key={b.id} className="px-3 py-1.5 rounded-full bg-muted text-sm">{b.emoji} {b.name}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-4">Mood Distribution</p>
            <DonutChart data={moodDist} />
          </div>

          {mapReady && mine.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold mb-1">🗺️ Your Dating Map</h3>
              <p className="text-sm text-muted-foreground mb-4">Cities where you've been on dates — click a pin for details</p>
              {mine.some((e) => e.lat != null) ? (
                <Suspense fallback={<div className="h-64 rounded-xl bg-muted animate-pulse" />}>
                  <DatingMap entries={mine} currencySymbol={currencySymbol} />
                </Suspense>
              ) : (
                <div className="h-48 rounded-xl bg-muted/40 border border-dashed border-border flex flex-col items-center justify-center gap-2 text-center px-6">
                  <span className="text-3xl">📍</span>
                  <p className="text-sm font-medium">No pins yet</p>
                  <p className="text-xs text-muted-foreground">Log a new date and pick a city from the autocomplete — it'll appear here as a pin on the map</p>
                </div>
              )}
            </div>
          )}

          {partnerStats.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold mb-1">💞 Your Partners</h3>
              <p className="text-sm text-muted-foreground mb-4">All your dates grouped by first name. Community stats count all users together.</p>
              <div className="space-y-3">
                {partnerStats.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 grid place-items-center text-primary font-bold shrink-0 text-sm">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-sm font-bold text-primary">{currencySymbol}{(p.avgSpend / 100).toFixed(0)}/date</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{p.count} date{p.count !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>avg mood {p.avgMood.toFixed(1)} ⭐</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-3">RECENT DATES</h3>
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
            <div className="max-h-[420px] overflow-y-auto -mx-1 px-1">
              {recent.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-1">PLATFORM TRENDS</h3>
            <p className="text-xs text-muted-foreground mb-3">{entries.length} total entries</p>
            <div className="space-y-3">
              {platform.slice(0, 5).map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{p.emoji} {p.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(p.count / platformMax) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-10 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function EntryRow({ entry: e }: { entry: ReturnType<typeof useStore>["entries"][number] }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(e.partnerName);
  const [amount, setAmount] = useState((e.amountCents / 100).toString());
  const [busy, setBusy] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!name.trim()) return toast.error("Name can't be empty.");
    if (isNaN(cents) || cents < 0) return toast.error("Enter a valid amount.");
    setBusy(true);
    await editEntry(e.id, { partnerName: name.trim(), amountCents: cents });
    setBusy(false);
    setEditing(false);
    toast.success("Date updated");
  }

  async function remove() {
    setBusy(true);
    await deleteEntry(e.id);
    toast.success("Date removed");
  }

  if (editing) {
    return (
      <div className="py-2 border-b border-border last:border-0 space-y-2">
        <div className="flex items-center gap-2">
          <span>{ACTIVITY_META[e.activity].emoji}</span>
          <input
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="First name"
            className="flex-1 min-w-0 rounded-lg bg-input border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            placeholder="0"
            className="w-20 rounded-lg bg-input border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex justify-end gap-1">
          <button onClick={save} disabled={busy} className="flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" /> Save
          </button>
          <button onClick={() => { setEditing(false); setName(e.partnerName); setAmount((e.amountCents / 100).toString()); }} className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span>{ACTIVITY_META[e.activity].emoji}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{e.partnerName} <span className="ml-1">{MOOD_META[e.mood].emoji}</span></div>
          <div className="text-xs text-muted-foreground">{relDays(e.createdAt)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-primary">€{(e.amountCents / 100).toFixed(0)}</span>
        {confirming ? (
          <div className="flex items-center gap-1">
            <button onClick={remove} disabled={busy} className="rounded-md bg-red-500/15 text-red-500 px-2 py-1 text-xs font-semibold hover:bg-red-500/25 disabled:opacity-50">Delete</button>
            <button onClick={() => setConfirming(false)} className="rounded-md bg-muted px-2 py-1 text-xs hover:text-foreground">Keep</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} title="Edit" className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setConfirming(true)} title="Delete" className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function relDays(iso: string) {
  const h = Math.floor((Date.now() - +new Date(iso)) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `about ${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
}