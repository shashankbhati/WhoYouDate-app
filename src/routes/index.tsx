import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, addPost, addComment, voteOnPost, getUserId } from "@/lib/datedata/store";
import { ACTIVITY_META } from "@/lib/datedata/types";
import { detectPII } from "@/lib/datedata/pii";
import { isRealUser, openAuthModal } from "@/lib/auth";
import { useCountry, setCountry } from "@/lib/country";
import { COUNTRY_CONFIG, fmtAmount, currencySymbol, type CountryCode } from "@/lib/datedata/countries";
import { Plus, MessageSquare, Share2, ArrowUp, ArrowDown, Flame, Send, Search } from "lucide-react";
import { shareCard } from "@/lib/shareCard";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WhoAmIDating — Home" },
      { name: "description", content: "Anonymous dating analytics community. See what people spend, where they meet, and how it goes." },
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

const BAR_HEIGHT = 120; // px — tall enough to read, compact enough to sit side-by-side

function BarChart({ data, highlightFirst = true }: { data: { name: string; value: number }[]; highlightFirst?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="mt-4 px-1">
      {/* Bar area */}
      <div className="grid grid-cols-6 gap-2 items-end" style={{ height: BAR_HEIGHT }}>
        {data.map((d, i) => {
          const barH = Math.max(Math.round((d.value / max) * BAR_HEIGHT), 6);
          return (
            <div key={d.name} className="flex items-end justify-center h-full">
              <div
                className={`w-full rounded-t-md transition-all ${highlightFirst && i === 0 ? "bg-primary" : "bg-muted"}`}
                style={{ height: barH }}
                title={String(Math.round(d.value))}
              />
            </div>
          );
        })}
      </div>
      {/* Labels below bars */}
      <div className="grid grid-cols-6 gap-2 mt-1.5 px-0">
        {data.map((d) => (
          <span key={d.name} className="text-xs text-muted-foreground truncate text-center block">{d.name}</span>
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
  const [partnerMetric, setPartnerMetric] = useState<"cost" | "happy" | "dates">("cost");
  const [tab, setTab] = useState<"feed" | "community" | "hot" | "new" | "top">("hot");
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLInputElement>(null);

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

  const costliest = useMemo(() => {
    const inCity = displayEntries.filter((e) => e.city === city);
    const byName: Record<string, { sum: number; count: number }> = {};
    inCity.forEach((e) => { (byName[e.partnerName] ??= { sum: 0, count: 0 }); byName[e.partnerName].sum += e.amountCents; byName[e.partnerName].count++; });
    return Object.entries(byName)
      .filter(([, v]) => v.count >= 3)
      .map(([name, v]) => ({ name, value: v.sum / v.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [displayEntries, city]);

  const trendingPartner = useMemo(() => {
    const byName: Record<string, { sum: number; happy: number; count: number }> = {};
    displayEntries.forEach((e) => { (byName[e.partnerName] ??= { sum: 0, happy: 0, count: 0 }); byName[e.partnerName].sum += e.amountCents; if (e.mood >= 4) byName[e.partnerName].happy++; byName[e.partnerName].count++; });
    return Object.entries(byName).map(([name, v]) => ({
      name,
      value: partnerMetric === "cost" ? v.sum / v.count : partnerMetric === "happy" ? (v.happy / v.count) * 100 : v.count,
    })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [displayEntries, partnerMetric]);

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
    addPost({ id: Math.random().toString(36).slice(2), author: profile?.displayName ?? "anon", type: "experience", tags: ["Experience"], content, upvotes: 1, downvotes: 0, comments: [], createdAt: new Date().toISOString() });
    setDraft("");
    toast.success("Posted anonymously");
  }

  const visiblePosts = useMemo(() => {
    const arr = [...posts];
    if (tab === "new") arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else if (tab === "top") arr.sort((a, b) => b.upvotes - a.upvotes);
    else arr.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    return arr;
  }, [posts, tab]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Banner + header */}
      <section className="rounded-2xl overflow-hidden border border-border bg-card">
        <div className="h-24" style={{ background: "var(--gradient-banner)" }} />
        <div className="flex items-center justify-between gap-4 p-5 -mt-10">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 rounded-full bg-primary grid place-items-center text-2xl font-bold text-primary-foreground ring-4 ring-background">D</div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold">r/WhoAmIDating</h1>
              <p className="text-sm text-muted-foreground">who are you even spending money on 👀</p>
            </div>
          </div>
          <Link to="/log" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-semibold text-sm hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Log a Date
          </Link>
        </div>
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

      {/* Costliest names + Trending — side by side */}
      {!loading && <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold tracking-wider">💸 COSTLIEST NAMES TO DATE</h2>
            <div className="flex flex-wrap gap-1">
              {(config.cities as readonly string[]).map((c) => (
                <button key={c} onClick={() => setCity(c)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${city === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c}</button>
              ))}
            </div>
          </div>
          {costliest.length > 0 ? <BarChart data={costliest} /> : <p className="text-sm text-muted-foreground py-6 text-center">Need 3+ entries per name.</p>}
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
            <div className="flex gap-1">
              {[["cost", "💸 Cost"], ["happy", "😍 Happy"], ["dates", "💗 Dates"]].map(([k, l]) => (
                <button key={k} onClick={() => setPartnerMetric(k as typeof partnerMetric)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${partnerMetric === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{l}</button>
              ))}
            </div>
          </div>
          <BarChart data={trendingPartner} />
        </section>
      </div>}

      {/* Feed + sidebar */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card p-2 mb-4">
            {[["feed", "🗂️ Feed"], ["community", "💬 Community"], ["hot", "🔥 Hot"], ["new", "✨ New"], ["top", "📈 Top"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k as typeof tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === k ? (k === "hot" ? "bg-primary/20 text-primary" : "bg-muted text-foreground") : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>

          {tab === "community" ? (
            <NameAnalyticsPanel entries={displayEntries} currency={config.defaultCurrency} featuredNames={FEATURED_NAMES[country]} />
          ) : (
            <>
              {/* Composer */}
              <div className="rounded-2xl border border-border bg-card p-3 mb-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted grid place-items-center shrink-0">👤</div>
                <input ref={composerRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPost()} placeholder="was ist auf deinem date passiert... 👀" className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-w-0" />
                <button onClick={submitPost} className="h-9 w-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground grid place-items-center transition shrink-0"><Plus className="h-4 w-4" /></button>
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
                {visiblePosts.map((p) => <PostCard key={p.id} post={p} />)}
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
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="h-16" style={{ background: "var(--gradient-banner)" }} />
            <div className="p-5">
              <h3 className="font-bold">About r/WhoAmIDating</h3>
              <p className="text-sm text-muted-foreground mt-2">track what you spend on dates. see who's trending in your city. stay completely anon — no real names, no data sold.</p>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div><div className="text-xl font-bold">{totalEntries}</div><div className="text-xs text-muted-foreground">Dates logged</div></div>
                <div><div className="text-xl font-bold">{posts.length}</div><div className="text-xs text-muted-foreground">Posts</div></div>
                <div><div className="text-xl font-bold">{spentLabel}</div><div className="text-xs text-muted-foreground">Total spent</div></div>
                <div><div className="text-xl font-bold">{avgMood.toFixed(1)} / 5</div><div className="text-xs text-muted-foreground">Avg mood</div></div>
              </div>
              <Link to="/log" className="mt-5 block text-center rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90">Log a Date</Link>
              <button onClick={() => { composerRef.current?.focus(); composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mt-2 w-full rounded-full border border-primary text-primary py-2.5 text-sm font-semibold hover:bg-primary/10">Create Post</button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-3">COMMUNITY RULES</h3>
            <ol className="space-y-2 text-sm">
              {["keine echten namen. nicknames only.", "what happens here stays here 🤐", "kein talk-shit über dates. be cool.", "zahlen > feelings (aber feelings auch ok)", "kein spam kein selbstpromo danke"].map((r, i) => (
                <li key={i} className="flex gap-2"><span className="text-muted-foreground font-bold">{i + 1}.</span><span>{r}</span></li>
              ))}
            </ol>
          </div>

          {trendingActivity && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-bold tracking-wider mb-3">TRENDING ACTIVITY</h3>
              <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-primary" /><span className="font-bold">{trendingActivity.label}</span><span className="text-muted-foreground text-sm">({trendingActivity.count} logs)</span></div>
            </div>
          )}

          <LiveFeed entries={displayEntries} />

          <p className="text-xs text-muted-foreground text-center pb-2">
            <Link to="/privacy" className="hover:text-foreground transition">Privacy Policy</Link>
            {" · "}Anonymous by design
          </p>
        </aside>
      </section>
    </main>
  );
}

function PostCard({ post: p }: { post: ReturnType<typeof useStore>["posts"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const { profile } = useStore();

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
          </div>
          <p className="text-sm leading-relaxed">{p.content}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1 hover:text-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> {p.comments.length} comment{p.comments.length !== 1 ? "s" : ""}
            </button>
            <button onClick={handleShare} className="inline-flex items-center gap-1 hover:text-foreground"><Share2 className="h-3.5 w-3.5" /> Share</button>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              {p.comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-xs">
                  <div className="h-6 w-6 rounded-full bg-muted grid place-items-center shrink-0 text-[10px]">u</div>
                  <div>
                    <span className="font-semibold text-foreground">u/{c.author}</span>
                    <span className="text-muted-foreground ml-2">{relTime(c.createdAt)}</span>
                    <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                  </div>
                </div>
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

function NameAnalyticsPanel({ entries, currency, featuredNames }: { entries: ReturnType<typeof useStore>["entries"]; currency: string; featuredNames: string[] }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const analytics = useMemo(() => {
    if (!query) return null;
    const m = entries.filter((e) => e.partnerName.toLowerCase() === query.toLowerCase());
    if (m.length < 3) return { insufficient: true as const, count: m.length };

    const count = m.length;
    const avgSpend = m.reduce((a, e) => a + e.amountCents, 0) / count;
    const happyRate = m.filter((e) => e.mood >= 4).length / count;
    const secondDateRate = m.filter((e) => e.secondDate !== "no").length / count;
    const avgMood = m.reduce((a, e) => a + e.mood, 0) / count;

    const cityMap: Record<string, number> = {};
    m.forEach((e) => { cityMap[e.city] = (cityMap[e.city] ?? 0) + 1; });
    const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })).slice(0, 5);

    const actMap: Record<string, number> = {};
    m.forEach((e) => { actMap[e.activity] = (actMap[e.activity] ?? 0) + 1; });
    const activities = Object.entries(actMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: ACTIVITY_META[k as keyof typeof ACTIVITY_META]?.label ?? k, value: v })).slice(0, 6);

    const meetMap: Record<string, number> = {};
    m.forEach((e) => { if (e.meetVia) { meetMap[e.meetVia] = (meetMap[e.meetVia] ?? 0) + 1; } });
    const meetVias = Object.entries(meetMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: MEET_LABELS[k] ?? k, value: v })).slice(0, 5);

    const moodDist = [1, 2, 3, 4, 5].map((mood) => ({ name: "★".repeat(mood), value: m.filter((e) => e.mood === mood).length }));

    return { insufficient: false as const, count, avgSpend, happyRate, secondDateRate, avgMood, cities, activities, meetVias, moodDist };
  }, [entries, query]);

  function search(name: string) {
    const trimmed = name.trim();
    setInput(trimmed);
    setQuery(trimmed);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xs font-bold tracking-wider mb-1">🔍 NAME ANALYTICS</h2>
        <p className="text-xs text-muted-foreground mb-3">search a name. see what the community says. completely anon.</p>
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
        <div className="flex flex-wrap gap-2 mt-3">
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
          <p className="font-semibold">search a name above</p>
          <p className="text-sm text-muted-foreground mt-1">oder tippe einen der namen unten an — was sagt die community?</p>
        </div>
      )}

      {query && analytics?.insufficient && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Not enough data for <span className="font-semibold text-foreground">"{query}"</span> — need at least 3 entries.
          </p>
        </div>
      )}

      {query && analytics && !analytics.insufficient && (
        <>
          <div className="flex items-center gap-2 px-1">
            <h3 className="font-bold text-lg">{query}</h3>
            <span className="text-sm text-muted-foreground">— {analytics.count} dates logged</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={`Avg ${currencySymbol(currency)}/date`} value={fmtAmount(analytics.avgSpend, currency)} />
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
        </>
      )}
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