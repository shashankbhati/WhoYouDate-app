import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, saveProfile, getUserId } from "@/lib/datedata/store";
import { ACTIVITY_META, type AgeRange, type Profile } from "@/lib/datedata/types";
import { BADGES, earnedBadges } from "@/lib/datedata/badges";
import { Settings, Share2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — WhoAmIDating" },
      { name: "description", content: "Your anonymous profile, badges, and dating activity summary." },
    ],
  }),
  component: ProfilePage,
});

const AGE_RANGES: AgeRange[] = ["18-24", "25-34", "35-44", "45+"];
const STAGES = ["Dating", "In a relationship", "Married", "Other"];

function ProfilePage() {
  const { entries, profile } = useStore();
  const userId = typeof window !== "undefined" ? getUserId() : "";
  const mine = entries.filter((e) => e.userId === userId);

  const [editing, setEditing] = useState(!profile);
  const [draft, setDraft] = useState<Profile>(profile ?? {
    id: userId, displayName: "Alex", ageRange: "45+", city: "Berlin", country: "Germany", relationshipStage: "In a relationship",
  });

  const earned = useMemo(() => earnedBadges(mine), [mine]);
  const earnedIds = new Set(earned.map((b) => b.id));

  const totalSpent = mine.reduce((a, e) => a + e.amountCents, 0);
  const favActivity = useMemo(() => {
    const c: Record<string, number> = {};
    mine.forEach((e) => { c[e.activity] = (c[e.activity] ?? 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return top ? ACTIVITY_META[top[0] as keyof typeof ACTIVITY_META] : null;
  }, [mine]);
  const successByActivity = useMemo(() => {
    if (!favActivity) return 0;
    const set = mine.filter((e) => ACTIVITY_META[e.activity].label === favActivity.label);
    if (set.length === 0) return 0;
    return Math.round((set.filter((e) => e.mood >= 4).length / set.length) * 100);
  }, [mine, favActivity]);
  const happyPct = mine.length ? Math.round((mine.filter((e) => e.mood >= 4).length / mine.length) * 100) : 0;
  const recent = mine.slice(0, 3);

  async function save() {
    try {
      await saveProfile(draft);
      setEditing(false);
      toast.success("Profile saved!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      toast.error(msg.includes("taken") ? "That username is already taken." : msg);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Profile</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr_280px]">
        {/* Left: recent dates + badges */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-3">RECENT DATES</h3>
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
            {recent.map((e) => (
              <div key={e.id} className="flex items-start gap-2 py-2">
                <span className="text-lg">{ACTIVITY_META[e.activity].emoji}</span>
                <div className="text-sm">
                  <div className="font-medium">{e.partnerName}</div>
                  <div className="text-xs text-muted-foreground">€{(e.amountCents / 100).toFixed(0)} {e.mood >= 4 ? "😍" : "🙂"}</div>
                  <div className="text-xs text-muted-foreground">{relTime(e.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-3">BADGES ({earned.length}/{BADGES.length})</h3>
            <ul className="space-y-1.5 text-sm">
              {BADGES.slice(0, 7).map((b) => (
                <li key={b.id} className={earnedIds.has(b.id) ? "text-foreground" : "text-muted-foreground/60"}>{b.emoji} {b.name}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Center */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 grid place-items-center text-2xl font-bold text-primary">{draft.displayName[0]?.toUpperCase() ?? "A"}</div>
              <div className="flex-1">
                {!editing ? (
                  <>
                    <h2 className="text-2xl font-bold">{draft.displayName}</h2>
                    <p className="text-sm text-muted-foreground mt-1">📍 {draft.city}, {draft.country}</p>
                    <p className="text-sm text-muted-foreground">{draft.ageRange} · {draft.relationshipStage}</p>
                  </>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="Display name" className="rounded-lg bg-input border border-border px-3 py-2 text-sm" />
                    <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="City" className="rounded-lg bg-input border border-border px-3 py-2 text-sm" />
                    <input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} placeholder="Country" className="rounded-lg bg-input border border-border px-3 py-2 text-sm" />
                    <select value={draft.ageRange} onChange={(e) => setDraft({ ...draft, ageRange: e.target.value as AgeRange })} className="rounded-lg bg-input border border-border px-3 py-2 text-sm">
                      {AGE_RANGES.map((a) => <option key={a}>{a}</option>)}
                    </select>
                    <select value={draft.relationshipStage} onChange={(e) => setDraft({ ...draft, relationshipStage: e.target.value })} className="rounded-lg bg-input border border-border px-3 py-2 text-sm sm:col-span-2">
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat value={String(mine.length)} label="Entries" />
              <Stat value={`€${(totalSpent / 100).toFixed(0)}`} label="Total Spent" />
              <Stat value={String(earned.length)} label="Badges" />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => {
                  const text = `My WhoAmIDating stats 💕\n${mine.length} dates logged • €${(totalSpent / 100).toFixed(0)} total\n${earned.map(b => b.emoji + " " + b.name).join(" • ") || "No badges yet"}\n\nwhoamidat.com`;
                  navigator.clipboard.writeText(text).catch(() => {});
                  toast.success("Stats copied to clipboard!");
                }}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Share2 className="h-4 w-4" /> Share Stats
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => editing ? save() : setEditing(true)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-muted hover:bg-muted/80 py-3 text-sm font-medium">
                <Settings className="h-4 w-4" /> {editing ? "Save Profile" : "Edit Profile"}
              </button>
              <Link to="/settings" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border hover:bg-muted px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition">
                <ExternalLink className="h-4 w-4" /> Account
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-4">Badge Collection</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {BADGES.map((b) => {
                const got = earnedIds.has(b.id);
                return (
                  <div key={b.id} className={`rounded-xl border border-border bg-background/60 p-4 flex gap-3 items-center ${got ? "" : "opacity-60"}`}>
                    <div className="text-2xl">{b.emoji}</div>
                    <div>
                      <div className="text-sm font-bold">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right: success by activity + quick stats */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-3">SUCCESS BY ACTIVITY</h3>
            {favActivity ? (
              <div>
                <div className="flex justify-between text-sm">
                  <span>{favActivity.emoji} {favActivity.label}</span>
                  <span className="text-primary font-bold">{successByActivity}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${successByActivity}%` }} />
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold tracking-wider mb-3">QUICK STATS</h3>
            <Row label="Avg spend" value={mine.length ? `€${(totalSpent / mine.length / 100).toFixed(0)}` : "€0"} />
            <Row label="Happy dates" value={`${happyPct}%`} />
            <Row label="Success rate" value={mine.length ? `${happyPct}%` : "—"} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border p-4 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
function relTime(iso: string) {
  const h = Math.floor((Date.now() - +new Date(iso)) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `about ${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
}