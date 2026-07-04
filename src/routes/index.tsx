import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, addPost, addComment, voteOnPost, getUserId, deletePost, deleteComment, editPost, editComment } from "@/lib/datedata/store";
import { FEMALE_NAMES_ALL, MALE_NAMES_ALL } from "@/lib/datedata/seed";
import { ACTIVITY_META } from "@/lib/datedata/types";
import { detectPII } from "@/lib/datedata/pii";
import { isRealUser, openAuthModal } from "@/lib/auth";
import { useCountry, setCountry } from "@/lib/country";
import { COUNTRY_CONFIG, fmtAmount, currencySymbol, type CountryCode } from "@/lib/datedata/countries";
import { Plus, MessageSquare, Share2, ArrowUp, ArrowDown, Flame, Send, Search, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { shareCard, shareTrendingCard, shareNameCard } from "@/lib/shareCard";
import { computeInsights } from "@/lib/datedata/insights";
import { NotifyOptIn } from "@/components/datedata/NotifyOptIn";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WhoAmIDating — Dating Costs, Reviews & Community Ledger" },
      { name: "description", content: "How much do people spend on dates in Berlin, Delhi, New York? Search any name to see real anonymous dating data. Community feed, city comparisons, and more." },
      { name: "keywords", content: "dating cost tracker, how much does a date cost, dating in Berlin, dating in Delhi, dating expenses, anonymous dating app, date cost India, date cost Germany" },
    ],
  }),
  component: Home,
});

const FEATURED_NAMES: Record<CountryCode, string[]> = {
  all: ["Sophie", "Lina", "Thomas", "Anna", "Johanna"],
  DE: ["Sophie", "Lina", "Thomas", "Anna", "Johanna"],
  IN: ["Priya", "Rahul", "Anjali", "Ananya", "Neha"],
  US: ["Ashley", "Tyler", "Emma", "Jordan"],
};

const BAR_HEIGHT = 132; // px — tall enough to read, compact enough to sit side-by-side

function BarChart({ data, highlightFirst = true, format, onNameClick }: { data: { name: string; value: number }[]; highlightFirst?: boolean; format?: (v: number) => string; onNameClick?: (name: string) => void }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = format ?? ((v: number) => String(Math.round(v)));
  const cols = Math.max(data.length, 1);
  const gridCols = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  return (
    <div className="mt-4 px-1">
      {/* Bar area — value label sits above each bar so the chart reads clearly
          even when one outlier dominates the scale */}
      <div className="grid gap-2 items-end" style={{ height: BAR_HEIGHT, ...gridCols }}>
        {data.map((d, i) => {
          // Proportional height, reserving room for the value label, with a
          // visible floor so no bar ever looks empty/broken.
          const barH = Math.max(Math.round((d.value / max) * (BAR_HEIGHT - 24)), 14);
          const isTop = highlightFirst && i === 0;
          const bar = (
            <>
              <span className={`text-[10px] font-bold leading-none mb-1 ${isTop ? "text-primary" : "text-muted-foreground"}`}>
                {fmt(d.value)}
              </span>
              <div
                className={`w-full rounded-t-md transition-all ${isTop ? "bg-primary" : "bg-primary/30"} ${onNameClick ? "group-hover:opacity-80" : ""}`}
                style={{ height: barH }}
              />
            </>
          );
          return onNameClick ? (
            <button key={d.name} onClick={() => onNameClick(d.name)} className="group flex flex-col items-center justify-end h-full cursor-pointer">
              {bar}
            </button>
          ) : (
            <div key={d.name} className="flex flex-col items-center justify-end h-full">
              {bar}
            </div>
          );
        })}
      </div>
      {/* Labels below bars */}
      <div className="grid gap-2 mt-1.5" style={gridCols}>
        {data.map((d) => (
          onNameClick ? (
            <button key={d.name} onClick={() => onNameClick(d.name)} className="text-xs font-semibold text-primary hover:underline truncate text-center block">{d.name}</button>
          ) : (
            <span key={d.name} className="text-xs text-muted-foreground truncate text-center block">{d.name}</span>
          )
        ))}
      </div>
    </div>
  );
}

// Skeleton pulse block
function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} style={style} />;
}

function Home() {
  const { entries, posts, loading, profile } = useStore();
  const { country, config } = useCountry();
  const [city, setCity] = useState<string>(config.defaultCity);
  const [costliestGender, setCostliestGender] = useState<"all" | "f" | "m">("all");
  const [trendingGender, setTrendingGender] = useState<"all" | "f" | "m">("all");
  const [partnerMetric, setPartnerMetric] = useState<"cost" | "happy" | "dates">("cost");
  const [tab, setTab] = useState<"feed" | "lookup">("feed");
  const [feedSort, setFeedSort] = useState<"hot" | "new" | "top">("hot");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLInputElement>(null);
  const [heroName, setHeroName] = useState("");
  const [lookupSeed, setLookupSeed] = useState<{ q: string; n: number } | null>(null);

  function runHeroSearch(name?: string) {
    const v = (name ?? heroName).trim();
    if (!v) return;
    setHeroName(v);
    setTab("lookup");
    setLookupSeed({ q: v, n: Date.now() }); // nonce forces re-trigger on repeat searches
    setTimeout(() => document.getElementById("ledger-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  // Reset selected city when country changes
  useEffect(() => { setCity(config.defaultCity); }, [country, config.defaultCity]);

  // Entries filtered to the selected country's cities
  const displayEntries = useMemo(() =>
    country === "all" ? entries : entries.filter((e) => (config.cities as readonly string[]).includes(e.city)),
    [entries, country, config]
  );

  const totalEntries = displayEntries.length;
  const totalSpent = displayEntries.reduce((a, e) => a + e.amountCents, 0);
  const avgMood = displayEntries.length ? displayEntries.reduce((a, e) => a + e.mood, 0) / displayEntries.length : 0;
  const spentLabel = `${config.currencySymbol}${(totalSpent / 100000).toFixed(1)}K`;

  function genderFilter(g: "all" | "f" | "m") {
    return (name: string) =>
      g === "all" ? true : g === "f" ? FEMALE_NAMES_ALL.has(name) : MALE_NAMES_ALL.has(name);
  }

  const costliest = useMemo(() => {
    const inCity = displayEntries.filter((e) => e.city === city && genderFilter(costliestGender)(e.partnerName));
    const byName: Record<string, { sum: number; count: number }> = {};
    inCity.forEach((e) => { (byName[e.partnerName] ??= { sum: 0, count: 0 }); byName[e.partnerName].sum += e.amountCents; byName[e.partnerName].count++; });
    return Object.entries(byName)
      .filter(([, v]) => v.count >= 3)
      .map(([name, v]) => ({ name, value: v.sum / v.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayEntries, city, costliestGender]);

  const trendingPartner = useMemo(() => {
    const filtered = displayEntries.filter((e) => genderFilter(trendingGender)(e.partnerName));
    const byName: Record<string, { sum: number; happy: number; count: number }> = {};
    filtered.forEach((e) => { (byName[e.partnerName] ??= { sum: 0, happy: 0, count: 0 }); byName[e.partnerName].sum += e.amountCents; if (e.mood >= 4) byName[e.partnerName].happy++; byName[e.partnerName].count++; });
    return Object.entries(byName).map(([name, v]) => ({
      name,
      value: partnerMetric === "cost" ? v.sum / v.count : partnerMetric === "happy" ? (v.happy / v.count) * 100 : v.count,
    })).sort((a, b) => b.value - a.value).slice(0, 6);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayEntries, partnerMetric, trendingGender]);

  const insights = useMemo(
    () => computeInsights(displayEntries, { currencySymbol: config.currencySymbol, includeCost: country !== "all" }),
    [displayEntries, config.currencySymbol, country]
  );

  const trendingActivity = useMemo(() => {
    const c: Record<string, number> = {};
    displayEntries.forEach((e) => { c[e.activity] = (c[e.activity] ?? 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return top ? { ...ACTIVITY_META[top[0] as keyof typeof ACTIVITY_META], count: top[1] } : null;
  }, [displayEntries]);

  function submitPost() {
    if (!isRealUser()) {
      openAuthModal("Sign in to post and join the community.");
      return;
    }
    const content = draft.trim();
    if (!content) return;
    const pii = detectPII(content);
    if (pii) { toast.error(`Looks like you included a ${pii}. Please remove and try again.`); return; }
    if (content.length > 500) { toast.error("Posts max 500 chars."); return; }
    const tags = [...new Set((content.match(/#[\w]+/g) ?? []).map((t) => t.slice(1).toLowerCase()))];
    addPost({ id: Math.random().toString(36).slice(2), author: profile?.displayName ?? "anon", type: "experience", tags: tags.length ? tags : ["experience"], content, upvotes: 1, downvotes: 0, comments: [], createdAt: new Date().toISOString() });
    setDraft("");
    toast.success("Posted anonymously");
  }

  const visiblePosts = useMemo(() => {
    let arr = [...posts];
    if (tagFilter) {
      const f = tagFilter.toLowerCase();
      arr = arr.filter((p) =>
        p.tags.some((t) => t.toLowerCase().includes(f)) ||
        p.content.toLowerCase().includes("#" + f)
      );
    }
    if (feedSort === "new") arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else if (feedSort === "top") arr.sort((a, b) => b.upvotes - a.upvotes);
    else arr.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    return arr;
  }, [posts, feedSort, tagFilter]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero */}
      <section className="py-8 sm:py-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary mb-5">VOL. 01 —— THE COMMUNITY LEDGER</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            How much does <em>dating</em> really cost?
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
            Search any first name and see what the community anonymously logged — average spend, happy rate, second dates, and more. No real names, no numbers, no apps tracking you back.
          </p>
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <Link to="/log" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-semibold text-sm hover:opacity-90 transition">
              Log an entry
            </Link>
            <Link to="/privacy" className="inline-flex items-center gap-2 rounded-full border border-border text-foreground px-5 py-2.5 font-semibold text-sm hover:bg-muted transition">
              How anonymity works
            </Link>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              {totalEntries.toLocaleString()} dates in the ledger
            </span>
          </div>
        </div>

        {/* Hero name search — the hook, front and center */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔍</span>
            <h2 className="font-bold text-lg">Search a name</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">What does the community say about dating a…</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runHeroSearch(); }}
                placeholder="Type any first name…"
                className="w-full rounded-full bg-input border border-border pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <button onClick={() => runHeroSearch()} className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 shrink-0">
              Search
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs text-muted-foreground self-center">Try:</span>
            {FEATURED_NAMES[country].map((n) => (
              <button key={n} onClick={() => runHeroSearch(n)} className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition">
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid gap-px bg-border border border-border rounded-2xl overflow-hidden md:grid-cols-3 mb-6">
        {[
          { num: "01", title: "Log anonymously", desc: "An auto-generated handle, no email, no signup. Stored locally on your device." },
          { num: "02", title: "We scrub PII", desc: "Names, numbers, addresses, and handles are detected and rejected at entry." },
          { num: "03", title: "The community learns", desc: "Aggregated, never identifying. Stats under 25 entries are flagged as thin." },
        ].map((f) => (
          <div key={f.num} className="bg-card p-5">
            <span className="text-xs text-muted-foreground font-medium">{f.num}</span>
            <h3 className="font-semibold mt-2 mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Country selector */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">🌐 View:</span>
        {(Object.entries(COUNTRY_CONFIG) as [CountryCode, typeof COUNTRY_CONFIG[CountryCode]][]).map(([code, cfg]) => (
          <button
            key={code}
            onClick={() => setCountry(code)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${country === code ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {cfg.flag} {cfg.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton for graphs */}
      {loading && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-40 mb-3" />
              <div className="flex items-end gap-2 mt-4" style={{ height: 120 }}>
                {[80, 60, 100, 45, 70, 55].map((h, j) => <Skeleton key={j} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />)}
              </div>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {[...Array(6)].map((_, j) => <Skeleton key={j} className="h-3" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tap-a-name nudge */}
      {!loading && (
        <p className="mt-6 -mb-2 text-center text-sm text-muted-foreground">
          👆 Tap any name below to see what dating them is really like
        </p>
      )}

      {/* Costliest names + Trending — side by side */}
      {!loading && <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold tracking-wider">💸 COSTLIEST NAMES TO DATE</h2>
            <div className="flex flex-wrap gap-1">
              {(["all", "f", "m"] as const).map((g) => (
                <button key={g} onClick={() => setCostliestGender(g)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${costliestGender === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {g === "all" ? "All" : g === "f" ? "👩 Girls" : "👦 Boys"}
                </button>
              ))}
              <div className="w-px bg-border mx-0.5" />
              {(config.cities as readonly string[]).map((c) => (
                <button key={c} onClick={() => setCity(c)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${city === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c}</button>
              ))}
            </div>
          </div>
          {costliest.length > 0 ? <BarChart data={costliest} format={(v) => `${config.currencySymbol}${(v / 100).toFixed(0)}`} onNameClick={(n) => runHeroSearch(n)} /> : <p className="text-sm text-muted-foreground py-6 text-center">Need 3+ entries per name.</p>}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">Avg {config.currencySymbol}/date. Min 3 entries per name.</p>
            {costliest.length > 0 && (
              <button
                onClick={() => shareCard(costliest, city, config.currencySymbol)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
              >
                <Share2 className="h-3.5 w-3.5" /> share
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold tracking-wider">📈 TRENDING PARTNER NAMES</h2>
            <div className="flex flex-wrap gap-1">
              {(["all", "f", "m"] as const).map((g) => (
                <button key={g} onClick={() => setTrendingGender(g)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${trendingGender === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {g === "all" ? "All" : g === "f" ? "👩 Girls" : "👦 Boys"}
                </button>
              ))}
              <div className="w-px bg-border mx-0.5" />
              {[["cost", "💸 Cost"], ["happy", "😍 Happy"], ["dates", "💗 Dates"]].map(([k, l]) => (
                <button key={k} onClick={() => setPartnerMetric(k as typeof partnerMetric)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${partnerMetric === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{l}</button>
              ))}
            </div>
          </div>
          <BarChart data={trendingPartner} format={(v) => partnerMetric === "cost" ? `${config.currencySymbol}${(v / 100).toFixed(0)}` : partnerMetric === "happy" ? `${Math.round(v)}%` : String(Math.round(v))} onNameClick={(n) => runHeroSearch(n)} />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => shareTrendingCard(trendingPartner, partnerMetric, config.currencySymbol)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
            >
              <Share2 className="h-3.5 w-3.5" /> share
            </button>
          </div>
        </section>
      </div>}

      {/* What the data says — community insights */}
      {!loading && insights.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-bold tracking-wider">💡 WHAT THE DATA SAYS</h2>
            <span className="text-xs text-muted-foreground">— patterns from the community ledger</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.slice(0, 4).map((ins, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                <span className="text-xl leading-none shrink-0">{ins.emoji}</span>
                <p className="text-sm leading-snug">{ins.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feed + sidebar */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Tabs */}
          <div id="ledger-tabs" className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card p-2 mb-4 scroll-mt-20">
            {([["feed", "Feed"], ["lookup", "Name Lookup"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === k ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>

          {tab === "lookup" ? (
            <div className="space-y-4">
              <NameAnalyticsPanel entries={entries} currency={config.defaultCurrency} featuredNames={FEATURED_NAMES[country]} seed={lookupSeed} />
              <CityHotspotsPanel entries={displayEntries} />
              <CityComparisonPanel entries={displayEntries} config={config} />
            </div>
          ) : (
            <>
              {/* Composer */}
              <div className="rounded-2xl border border-border bg-card p-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted grid place-items-center shrink-0">👤</div>
                  <input ref={composerRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPost()} placeholder="what happened on your date..." className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-w-0" />
                  <button onClick={submitPost} className="h-9 w-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground grid place-items-center transition shrink-0"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="flex gap-1 mt-2 pl-12 flex-wrap">
                  {["💸", "😭", "💀", "🤡", "😅", "👀", "🔥", "💕", "😍", "🙏", "💔", "🤣"].map((e) => (
                    <button key={e} onClick={() => setDraft((d) => d + e)} className="text-base hover:scale-125 transition-transform leading-none">{e}</button>
                  ))}
                </div>
              </div>

              {/* Posts */}
              {loading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {visiblePosts.map((p) => <PostCard key={p.id} post={p} onTagFilter={setTagFilter} />)}
                {!loading && visiblePosts.length === 0 && (
                  <div className="rounded-2xl border border-border bg-card p-10 text-center">
                    <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">SORT</h3>
            <div className="space-y-1">
              {([["hot", "Hot"], ["new", "New"], ["top", "Top"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFeedSort(k)} className={`block w-full text-left px-2 py-1 text-sm rounded transition ${feedSort === k ? "text-primary font-semibold" : "text-foreground hover:text-primary"}`}>{l}</button>
              ))}
              <span className="block px-2 py-1 text-sm text-muted-foreground">Rising</span>
            </div>

            <h3 className="text-xs font-bold tracking-widest text-muted-foreground mt-5 mb-3">TOPICS</h3>
            <div className="space-y-1">
              {([
                { label: "All entries", tag: null },
                { label: "firstdate", tag: "firstdate" },
                { label: "redflag", tag: "redflag" },
                { label: "win", tag: "win" },
                { label: "ghosted", tag: "ghosted" },
                { label: "splitthebill", tag: "splitthebill" },
                { label: "advice", tag: "advice" },
              ] as const).map(({ label, tag }) => {
                const active = tag === null ? tagFilter === null : tagFilter === tag;
                return (
                  <button
                    key={label}
                    onClick={() => setTagFilter(tag)}
                    className={`flex items-center gap-2 w-full text-left px-2 py-1 text-sm rounded transition ${active ? "text-primary font-semibold" : "text-foreground hover:text-primary"}`}
                  >
                    <span className="text-muted-foreground">#</span>{label}
                  </button>
                );
              })}
            </div>

            <h3 className="text-xs font-bold tracking-widest text-muted-foreground mt-5 mb-3">YOU</h3>
            <div className="space-y-1">
              <Link to="/stats" className="block px-2 py-1 text-sm text-foreground hover:text-primary transition">Your ledger</Link>
              <Link to="/profile" className="block px-2 py-1 text-sm text-foreground hover:text-primary transition">Profile &amp; badges</Link>
            </div>
          </div>

          {trendingActivity && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">TRENDING ACTIVITY</h3>
              <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-primary" /><span className="font-bold">{trendingActivity.label}</span><span className="text-muted-foreground text-sm">({trendingActivity.count} logs)</span></div>
            </div>
          )}

          <LiveFeed entries={displayEntries} />

          <NotifyOptIn mode="digest" />

          <p className="text-xs text-muted-foreground text-center pb-2">
            <Link to="/privacy" className="hover:text-foreground transition">Privacy &amp; data</Link>
            {" · "}Anonymous by design
          </p>
        </aside>
      </section>
    </main>
  );
}

function renderContent(text: string, onTag?: (t: string) => void) {
  return text.split(/(#[\w]+)/g).map((part, i) =>
    part.startsWith("#")
      ? <button key={i} type="button" onClick={() => onTag?.(part.slice(1).toLowerCase())} className="text-primary hover:underline font-medium">{part}</button>
      : <span key={i}>{part}</span>
  );
}

function PostCard({ post: p, onTagFilter }: { post: ReturnType<typeof useStore>["posts"][0]; onTagFilter?: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(p.content);
  const { profile } = useStore();
  const myId = typeof window !== "undefined" ? getUserId() : "";
  const isOwn = !!myId && p.userId === myId;

  function submitComment() {
    if (!isRealUser()) {
      openAuthModal("Sign in to comment.");
      return;
    }
    const text = commentDraft.trim();
    if (!text) return;
    const pii = detectPII(text);
    if (pii) { toast.error(`Looks like you included a ${pii}.`); return; }
    addComment(p.id, text, profile?.displayName ?? "anon");
    setCommentDraft("");
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + "/?post=" + p.id).catch(() => {});
    toast.success("Link copied!");
  };

  async function handleSaveEdit() {
    const content = editDraft.trim();
    if (!content || content === p.content) { setEditing(false); return; }
    if (content.length > 500) { toast.error("Max 500 chars."); return; }
    await editPost(p.id, content);
    setEditing(false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    await deletePost(p.id);
    toast.success("Post removed.");
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 text-muted-foreground shrink-0">
          <button onClick={() => voteOnPost(p.id, 1)} className="hover:text-primary transition"><ArrowUp className="h-4 w-4" /></button>
          <span className="text-sm font-bold text-primary">{p.upvotes - p.downvotes}</span>
          <button onClick={() => voteOnPost(p.id, -1)} className="hover:text-foreground transition"><ArrowDown className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
            <span>u/{p.author}</span>
            <span>·</span>
            <span>{relTime(p.createdAt)}</span>
            {p.tags[0] && <><span>·</span><span className="px-2 py-0.5 rounded-full bg-muted text-foreground">{p.tags[0]}</span></>}
            {isOwn && (
              <div className="relative ml-auto">
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded hover:bg-muted transition">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-6 z-10 w-28 rounded-xl border border-border bg-card shadow-lg py-1">
                    <button
                      onClick={() => { setEditing(true); setEditDraft(p.content); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted transition"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="w-full rounded-xl bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                rows={3}
                maxLength={500}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold hover:opacity-90">
                  <Check className="h-3 w-3" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs hover:text-foreground">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{renderContent(p.content, onTagFilter)}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1 hover:text-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> {p.comments.length} comment{p.comments.length !== 1 ? "s" : ""}
            </button>
            <button onClick={handleShare} className="inline-flex items-center gap-1 hover:text-foreground"><Share2 className="h-3.5 w-3.5" /> Share</button>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              {p.comments.map((c) => (
                <CommentRow key={c.id} postId={p.id} comment={c} myId={myId} />
              ))}
              {p.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet — be first!</p>}
              <div className="flex gap-2 mt-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-full bg-input border border-border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 min-w-0"
                  maxLength={300}
                />
                <button onClick={submitComment} className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0 hover:opacity-90">
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CommentRow({ postId, comment: c, myId }: { postId: string; comment: ReturnType<typeof useStore>["posts"][0]["comments"][0]; myId: string }) {
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(c.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = !!myId && c.userId === myId;

  async function handleSave() {
    const content = editDraft.trim();
    if (!content || content === c.content) { setEditing(false); return; }
    await editComment(postId, c.id, content);
    setEditing(false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    await deleteComment(postId, c.id);
  }

  return (
    <div className="flex gap-2 text-xs">
      <div className="h-6 w-6 rounded-full bg-muted grid place-items-center shrink-0 text-[10px]">u</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">u/{c.author}</span>
          <span className="text-muted-foreground ml-1">{relTime(c.createdAt)}</span>
          {isOwn && (
            <div className="relative ml-auto">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-0.5 rounded hover:bg-muted transition">
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-5 z-10 w-24 rounded-xl border border-border bg-card shadow-lg py-1">
                  <button
                    onClick={() => { setEditing(true); setEditDraft(c.content); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-muted transition"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-1 space-y-1">
            <input
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
              maxLength={300}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <div className="flex gap-1">
              <button onClick={handleSave} className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold hover:opacity-90">
                <Check className="h-2.5 w-2.5" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                <X className="h-2.5 w-2.5" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground mt-0.5">{c.content}</p>
        )}
      </div>
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-primary mt-0.5">{sub}</div>}
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

const MEET_LABELS: Record<string, string> = {
  bumble: "Bumble", hinge: "Hinge", tinder: "Tinder", friends: "Friends",
  work_school: "Work/School", in_person: "IRL", other_app: "Other App",
};

// City → country code lookup for fallback cascade
const CITY_COUNTRY: Record<string, string> = {
  Berlin: "DE", Munich: "DE", Hamburg: "DE", Cologne: "DE", Frankfurt: "DE", Dresden: "DE",
  Delhi: "IN", Mumbai: "IN", Bangalore: "IN", Hyderabad: "IN", Pune: "IN", Chennai: "IN",
  "New York": "US", "Los Angeles": "US", Chicago: "US", Austin: "US", Miami: "US",
};
const COUNTRY_NAMES: Record<string, string> = { DE: "Germany", IN: "India", US: "United States" };
// Units of each currency per 1 EUR (approximate — labeled with ~ on display)
const RATES_PER_EUR: Record<string, number> = { EUR: 1, USD: 1.08, INR: 89, GBP: 0.86, CHF: 0.96 };

function convertCents(cents: number, from: string, to: string): number {
  if (from === to) return cents;
  return (cents / (RATES_PER_EUR[from] ?? 1)) * (RATES_PER_EUR[to] ?? 1);
}

function NameAnalyticsPanel({ entries, currency, featuredNames, seed }: { entries: ReturnType<typeof useStore>["entries"]; currency: string; featuredNames: string[]; seed?: { q: string; n: number } | null }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  // When the hero search drives a lookup, adopt its query (nonce re-triggers)
  useEffect(() => {
    if (seed && seed.q) { setInput(seed.q); setQuery(seed.q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.n]);

  // Derive popular cities from all entries for chips
  const popularCities = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => { map[e.city] = (map[e.city] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  }, [entries]);

  const analytics = useMemo(() => {
    if (!query) return null;

    // All global matches for this name
    const nameMatches = entries.filter((e) => e.partnerName.toLowerCase() === query.toLowerCase());

    let useEntries = nameMatches;
    let scope: { type: "city"; label: string } | { type: "country"; label: string; cityCount: number; cityName: string } | { type: "global"; cityCount?: number; cityName?: string } = { type: "global" };

    if (cityQuery) {
      const cityMatches = nameMatches.filter((e) => e.city.toLowerCase() === cityQuery.toLowerCase());
      if (cityMatches.length >= 20) {
        useEntries = cityMatches;
        scope = { type: "city", label: cityQuery };
      } else {
        // Determine country from city name, then fall back to country-level
        const countryCode = CITY_COUNTRY[cityQuery] ?? Object.keys(CITY_COUNTRY).find((c) => c.toLowerCase() === cityQuery.toLowerCase() && CITY_COUNTRY[c]);
        if (countryCode) {
          const countryMatches = nameMatches.filter((e) => CITY_COUNTRY[e.city] === countryCode);
          if (countryMatches.length >= 20) {
            useEntries = countryMatches;
            scope = { type: "country", label: COUNTRY_NAMES[countryCode] ?? countryCode, cityCount: cityMatches.length, cityName: cityQuery };
          } else {
            useEntries = nameMatches;
            scope = { type: "global", cityCount: cityMatches.length, cityName: cityQuery };
          }
        } else {
          useEntries = nameMatches;
          scope = { type: "global", cityCount: cityMatches.length, cityName: cityQuery };
        }
      }
    }

    if (useEntries.length < 3) return { insufficient: true as const, count: nameMatches.length, scope };

    const count = useEntries.length;
    // Convert all amounts to viewer's currency; flag if cross-currency conversion happened
    const hasMixedCurrencies = new Set(useEntries.map((e) => e.currency)).size > 1 || (useEntries[0]?.currency ?? currency) !== currency;
    const totalConverted = useEntries.reduce((a, e) => a + convertCents(e.amountCents, e.currency, currency), 0);
    const avgSpend = totalConverted / count;

    const happyRate = useEntries.filter((e) => e.mood >= 4).length / count;
    const secondDateRate = useEntries.filter((e) => e.secondDate !== "no").length / count;
    const avgMood = useEntries.reduce((a, e) => a + e.mood, 0) / count;

    const cityMap: Record<string, number> = {};
    useEntries.forEach((e) => { cityMap[e.city] = (cityMap[e.city] ?? 0) + 1; });
    const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })).slice(0, 6);

    const actMap: Record<string, number> = {};
    useEntries.forEach((e) => { actMap[e.activity] = (actMap[e.activity] ?? 0) + 1; });
    const activities = Object.entries(actMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: ACTIVITY_META[k as keyof typeof ACTIVITY_META]?.label ?? k, value: v })).slice(0, 6);

    const meetMap: Record<string, number> = {};
    useEntries.forEach((e) => { if (e.meetVia) { meetMap[e.meetVia] = (meetMap[e.meetVia] ?? 0) + 1; } });
    const meetVias = Object.entries(meetMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: MEET_LABELS[k] ?? k, value: v })).slice(0, 5);

    const moodDist = [1, 2, 3, 4, 5].map((mood) => ({ name: "★".repeat(mood), value: useEntries.filter((e) => e.mood === mood).length }));

    return { insufficient: false as const, count, avgSpend, happyRate, secondDateRate, avgMood, cities, activities, meetVias, moodDist, scope, hasMixedCurrencies };
  }, [entries, query, cityQuery, currency]);

  // How much people who ARE named `query` spend when THEY date — aggregated from
  // their own logged entries (loggerFirstName), first-name-only, min-sample
  // guarded so it never resolves to a single identifiable person.
  const spenderStat = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    const rows = entries.filter((e) => e.loggerFirstName && e.loggerFirstName.toLowerCase() === q);
    if (rows.length < 5) return null;
    const total = rows.reduce((a, e) => a + convertCents(e.amountCents, e.currency, currency), 0);
    const approx = rows.some((e) => e.currency !== currency);
    return { count: rows.length, avg: total / rows.length, approx };
  }, [entries, query, currency]);

  function search(name: string) {
    const trimmed = name.trim();
    setInput(trimmed);
    setQuery(trimmed);
  }

  function pickCity(c: string) {
    setCityInput(c === cityQuery ? "" : c);
    setCityQuery(c === cityQuery ? "" : c);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xs font-bold tracking-wider mb-1">🔍 NAME ANALYTICS</h2>
        <p className="text-xs text-muted-foreground mb-3">search any name globally — see what the community says. completely anon.</p>

        {/* Name search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(input); }}
              placeholder="Search a name..."
              className="w-full rounded-full bg-input border border-border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button onClick={() => search(input)} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 shrink-0">
            Search
          </button>
        </div>

        {/* City filter */}
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1.5">Filter by city <span className="opacity-60">(optional — shows city→country→global based on data)</span></p>
          <input
            value={cityInput}
            onChange={(e) => { setCityInput(e.target.value); setCityQuery(e.target.value.trim()); }}
            placeholder="e.g. Berlin, Delhi, New York..."
            className="w-full rounded-full bg-input border border-border px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          {popularCities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {popularCities.map((c) => (
                <button key={c} onClick={() => pickCity(c)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition ${cityQuery.toLowerCase() === c.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c}</button>
              ))}
            </div>
          )}
        </div>

        {/* Featured name chips */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground self-center">Popular:</span>
          {featuredNames.map((n) => (
            <button
              key={n}
              onClick={() => search(n)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${query.toLowerCase() === n.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {!query && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-semibold">search any name above</p>
          <p className="text-sm text-muted-foreground mt-1">results pull from the entire global ledger</p>
        </div>
      )}

      {/* How much people named X spend when THEY date (self-reported, anonymous) */}
      {query && spenderStat && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">💰</span>
          <div className="min-w-0">
            <p className="text-sm">
              People named <span className="font-bold">{query}</span> spend{" "}
              <span className="font-bold text-primary">{spenderStat.approx ? "~" : ""}{currencySymbol(currency)}{(spenderStat.avg / 100).toFixed(0)}</span>{" "}
              per date, on average — when they're the one dating.
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Anonymous · self-reported by {spenderStat.count} people named {query}</p>
          </div>
        </div>
      )}

      {query && analytics?.insufficient && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Not enough data for <span className="font-semibold text-foreground">"{query}"</span>
            {cityQuery ? ` (globally)` : ""} — need at least 3 entries. {analytics.count > 0 ? `Found ${analytics.count} so far.` : ""}
          </p>
        </div>
      )}

      {query && analytics && !analytics.insufficient && (
        <>
          <div className="flex items-start justify-between gap-2 px-1">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{query}</h3>
                <span className="text-sm text-muted-foreground">— {analytics.count} dates</span>
              </div>
              {/* Scope banner */}
              {analytics.scope.type === "city" && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">📍 Showing {analytics.scope.label}-only results</p>
              )}
              {analytics.scope.type === "country" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Only {analytics.scope.cityCount} date{analytics.scope.cityCount !== 1 ? "s" : ""} in {analytics.scope.cityName} — showing {analytics.scope.label}-wide results
                </p>
              )}
              {analytics.scope.type === "global" && analytics.scope.cityName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only {analytics.scope.cityCount} date{analytics.scope.cityCount !== 1 ? "s" : ""} in {analytics.scope.cityName} — showing global results
                </p>
              )}
              {analytics.scope.type === "global" && !analytics.scope.cityName && (
                <p className="text-xs text-muted-foreground mt-0.5">Global results</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {analytics.hasMixedCurrencies && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">~{currencySymbol(currency)} approx</span>
              )}
              <button
                onClick={() => shareNameCard({
                  name: query,
                  count: analytics.count,
                  avgSpend: analytics.avgSpend,
                  happyRate: analytics.happyRate,
                  secondDateRate: analytics.secondDateRate,
                  avgMood: analytics.avgMood,
                  currencySymbol: currencySymbol(currency),
                  approx: analytics.hasMixedCurrencies,
                  scopeLabel: analytics.scope.type === "city" ? analytics.scope.label : analytics.scope.type === "country" ? `${analytics.scope.label}-wide` : "Global",
                  topActivities: analytics.activities,
                  topCities: analytics.cities,
                })}
                className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={`Avg ${analytics.hasMixedCurrencies ? "~" : ""}${currencySymbol(currency)}/date`} value={fmtAmount(analytics.avgSpend, currency)} />
            <StatCard label="Happy rate" value={`${(analytics.happyRate * 100).toFixed(0)}%`} sub="mood 4 or 5" />
            <StatCard label="2nd date rate" value={`${(analytics.secondDateRate * 100).toFixed(0)}%`} />
            <StatCard label="Avg mood" value={`${analytics.avgMood.toFixed(1)} / 5`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider mb-2">🎯 ACTIVITIES</h3>
              <BarChart data={analytics.activities} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider mb-2">📍 BY CITY</h3>
              <BarChart data={analytics.cities} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider mb-4">💘 HOW THEY MEET</h3>
              <div className="space-y-3">
                {analytics.meetVias.map((mv) => (
                  <div key={mv.name} className="flex items-center gap-3">
                    <span className="text-sm w-24 truncate shrink-0">{mv.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(mv.value / analytics.count) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{((mv.value / analytics.count) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider mb-4">😊 MOOD BREAKDOWN</h3>
              <div className="space-y-3">
                {analytics.moodDist.map((md) => (
                  <div key={md.name} className="flex items-center gap-3">
                    <span className="text-xs w-16 shrink-0">{md.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(md.value / analytics.count) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{md.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contextual log CTA — they're engaged now, so ask */}
          <Link to="/log" className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition">
            <span className="text-sm font-semibold">Curious how <em>you</em> compare? Log your last date to see your own stats.</span>
            <span className="shrink-0 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Log a date →</span>
          </Link>

          {/* Watch this name — retention hook */}
          <NotifyOptIn mode="watch" watchName={query} />
        </>
      )}
    </div>
  );
}

function CityHotspotsPanel({ entries }: { entries: ReturnType<typeof useStore>["entries"] }) {
  const cityData = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => { map[e.city] = (map[e.city] ?? 0) + 1; });
    return Object.entries(map)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  if (cityData.length < 2) return null;

  const max = Math.max(1, ...cityData.map((c) => c.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xs font-bold tracking-wider mb-1">🗺️ DATING HOTSPOTS</h2>
      <p className="text-xs text-muted-foreground mb-5">Where people are dating most — bubble size = activity</p>
      <div className="flex flex-wrap gap-4 items-end justify-center py-2">
        {cityData.map(({ city, count }) => {
          const size = Math.round(28 + (count / max) * 72);
          return (
            <div key={city} className="flex flex-col items-center gap-2">
              <div
                className="rounded-full bg-primary/20 border-2 border-primary/60 grid place-items-center text-primary font-bold transition-all"
                style={{ width: size, height: size, fontSize: Math.max(9, size * 0.22) }}
              >
                {count}
              </div>
              <span className="text-xs text-muted-foreground text-center max-w-[64px] truncate">{city}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CityComparisonPanel({ entries, config }: { entries: ReturnType<typeof useStore>["entries"]; config: ReturnType<typeof useCountry>["config"] }) {
  const cities = useMemo(() => {
    const map: Record<string, { count: number; total: number; happy: number }> = {};
    entries.forEach((e) => {
      (map[e.city] ??= { count: 0, total: 0, happy: 0 });
      map[e.city].count++;
      map[e.city].total += e.amountCents;
      if (e.mood >= 4) map[e.city].happy++;
    });
    return Object.entries(map)
      .filter(([, v]) => v.count >= 5)
      .map(([city, v]) => ({ city, avg: Math.round(v.total / v.count / 100), happy: Math.round((v.happy / v.count) * 100), count: v.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [entries]);

  if (cities.length < 2) return null;

  const maxAvg = Math.max(...cities.map((c) => c.avg));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xs font-bold tracking-wider mb-4">🏙️ CITY BATTLE — AVG SPEND PER DATE</h2>
      <div className="space-y-3">
        {cities.map((c) => (
          <div key={c.city}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{c.city}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="text-foreground font-bold">{config.currencySymbol}{c.avg}</span>
                <span>😊 {c.happy}%</span>
                <span>{c.count} dates</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((c.avg / maxAvg) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveFeed({ entries }: { entries: ReturnType<typeof useStore>["entries"] }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8), [entries]);
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(id); }, []);
  // suppress unused warning
  void tick;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <h3 className="text-xs font-bold tracking-wider text-red-500">LIVE ACTIVITY</h3>
      </div>
      <div className="space-y-2">
        {sorted.map((e, i) => {
          const meta = ACTIVITY_META[e.activity];
          const mins = Math.max(1, Math.floor((Date.now() - +new Date(e.createdAt)) / 60000));
          const display = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
          return (
            <div key={e.id + i} className="flex items-center gap-2 text-sm">
              <span>{meta.emoji}</span>
              <span className="font-medium text-primary">{fmtAmount(e.amountCents, e.currency)}</span>
              <span className="text-muted-foreground flex-1 truncate">{meta.label} in {e.city}</span>
              <span className="text-xs text-muted-foreground shrink-0">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}