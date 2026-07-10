import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuthState, openAuthModal } from "@/lib/auth";
import { useDatePlanStore, venuesForCity, ensureCityVenues } from "@/lib/dateplan/store";
import {
  loadSharedPlan,
  saveSharedSteps,
  acceptSharedPlan,
  postSharedMessage,
  markOwnerSeen,
  subscribeSharedPlan,
  whoAmI,
  type SharedPlan,
  type SharedStep,
} from "@/lib/dateplan/share";
import type { Venue } from "@/lib/dateplan/types";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$id")({
  head: () => ({ meta: [{ title: "A date plan for you 💌", name: "robots", content: "noindex" }] }),
  component: SharedPlanPage,
});

function SharedPlanPage() {
  const { id } = Route.useParams();
  const { isReal, loading: authLoading } = useAuthState();

  if (!isReal) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-4xl">💌</p>
          <h1 className="mt-3 text-xl font-bold">Someone planned a date for you</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Sign in to open the plan — you'll see where you're going and can tweak anything you
            like.
          </p>
          <button
            onClick={() => openAuthModal("Sign in to open this date plan.")}
            className="mt-5 rounded-full bg-primary text-primary-foreground px-6 py-2.5 font-semibold hover:opacity-90 transition"
          >
            Sign in to open
          </button>
          {authLoading && (
            <p className="mt-3 text-xs text-muted-foreground">Checking your session…</p>
          )}
        </div>
      </Shell>
    );
  }
  return <SharedPlanView id={id} />;
}

function SharedPlanView({ id }: { id: string }) {
  useDatePlanStore(); // subscribe so alternatives re-render once this city's venues load
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = !!plan && !!me && plan.ownerId === me.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, who] = await Promise.all([loadSharedPlan(id), whoAmI()]);
      if (!alive) return;
      setPlan(p);
      setMe(who);
      setLoading(false);
      if (p) {
        ensureCityVenues(p.city);
        if (who && p.ownerId === who.id) markOwnerSeen(id); // clear owner's "new update" flag
      }
    })();
    // Live updates from the other side (edits, messages, accept).
    const unsub = subscribeSharedPlan(id, (fresh) => {
      if (alive) setPlan(fresh);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [id]);

  const cityVenues = plan ? venuesForCity(plan.city) : [];

  async function swap(stepOrder: number, v: Venue) {
    if (!plan) return;
    const steps: SharedStep[] = plan.steps.map((s) => {
      if (s.order !== stepOrder || !s.venue) return s;
      const oldName = s.venue.name;
      return {
        ...s,
        title: s.title.split(oldName).join(v.name),
        scene: s.scene.split(oldName).join(v.name),
        venue: { id: v.id, name: v.name, kind: v.kind, area: v.area, rating: v.rating },
      };
    });
    setPlan({ ...plan, steps, status: "changed" });
    const ok = await saveSharedSteps(id, steps, me?.name ?? "Your date");
    if (!ok) toast.error("Couldn't save the change — try again.");
  }

  async function accept() {
    if (!plan) return;
    setPlan({ ...plan, status: "accepted" });
    const ok = await acceptSharedPlan(id);
    if (ok) toast.success("Plan accepted 💗");
    else toast.error("Couldn't save — try again.");
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-muted-foreground py-10">Opening the plan…</p>
      </Shell>
    );
  }
  if (!plan) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-3xl">🕳️</p>
          <p className="mt-3 font-semibold">This plan couldn't be found</p>
          <p className="text-sm text-muted-foreground mt-1">The link may be wrong or removed.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-5">
        <p className="text-3xl">💌</p>
        <h1 className="mt-2 text-2xl font-bold">
          {isOwner
            ? "Your shared plan"
            : plan.ownerName
              ? `${plan.ownerName} planned a date`
              : "A date, planned for you"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          in {plan.city} · tweak anything you like
        </p>
      </div>

      <StatusStrip plan={plan} isOwner={isOwner} />

      {plan.weatherBanner && (
        <p className="text-sm rounded-xl bg-muted px-3 py-2 my-5 text-center">
          {plan.weatherBanner}
        </p>
      )}

      <SharedReel plan={plan} cityVenues={cityVenues} onSwap={swap} />

      {/* Accept (recipient only, until accepted) */}
      {!isOwner && plan.status !== "accepted" && (
        <button
          onClick={accept}
          className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition"
        >
          💗 Accept this plan
        </button>
      )}

      <MessageThread
        plan={plan}
        isOwner={isOwner}
        onPosted={(msgs) => setPlan({ ...plan, messages: msgs })}
        id={id}
      />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Want to plan your own?{" "}
        <Link to="/plan" className="text-primary hover:underline">
          Make a date plan →
        </Link>
      </p>
    </Shell>
  );
}

function StatusStrip({ plan, isOwner }: { plan: SharedPlan; isOwner: boolean }) {
  const label =
    plan.status === "accepted"
      ? `💗 ${plan.lastActor ?? "Your date"} accepted the plan`
      : plan.status === "changed"
        ? `✏️ ${plan.lastActor ?? "Someone"} tweaked the plan`
        : isOwner
          ? "⏳ Waiting for your date to open it"
          : "Take a look — change anything you like";
  const tone =
    plan.status === "accepted"
      ? "border-primary/40 bg-primary/10 text-foreground"
      : plan.status === "changed"
        ? "border-amber-500/40 bg-amber-500/10 text-foreground"
        : "border-border bg-card text-muted-foreground";
  return <div className={`rounded-xl border px-4 py-2.5 text-sm text-center ${tone}`}>{label}</div>;
}

function MessageThread({
  plan,
  isOwner,
  onPosted,
  id,
}: {
  plan: SharedPlan;
  isOwner: boolean;
  onPosted: (m: SharedPlan["messages"]) => void;
  id: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [plan.messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const msgs = await postSharedMessage(id, t, isOwner);
    setSending(false);
    if (msgs) {
      onPosted(msgs);
      setText("");
    } else toast.error("Couldn't send — try again.");
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-bold mb-3">Chat about it</p>
      {plan.messages.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">
          No messages yet — say hi or ask about a spot.
        </p>
      ) : (
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
          {plan.messages.map((m, i) => {
            const mine = m.owner === isOwner;
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {!mine && (
                    <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.actor}</p>
                  )}
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 rounded-full bg-input border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-full bg-primary text-primary-foreground px-4 font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Recipient's Story Reel (venues + timing only; swap in a drawer) ───────────
const REEL_BGS = [
  "linear-gradient(160deg, oklch(0.35 0.12 30), oklch(0.18 0.05 285))",
  "linear-gradient(160deg, oklch(0.28 0.08 40), oklch(0.16 0.03 260))",
  "linear-gradient(180deg, oklch(0.22 0.05 260), oklch(0.14 0.02 260))",
  "linear-gradient(160deg, oklch(0.3 0.09 350), oklch(0.16 0.04 300))",
];

function SharedReel({
  plan,
  cityVenues,
  onSwap,
}: {
  plan: SharedPlan;
  cityVenues: Venue[];
  onSwap: (order: number, v: Venue) => void;
}) {
  const stops = plan.steps;
  const [idx, setIdx] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const s = stops[idx];
  if (!s) return null;

  const go = (i: number) => {
    setIdx(Math.max(0, Math.min(stops.length - 1, i)));
    setDrawer(false);
  };
  const kind = s.title.split(" — ")[0];
  const place = s.venue?.name ?? s.title;
  const startTime = s.timeLabel?.split(" – ")[0] ?? "";
  const alts = s.venue
    ? cityVenues.filter((v) => v.kind === s.venue!.kind && v.id !== s.venue!.id)
    : [];

  return (
    <div className="[font-family:var(--font-sans)] text-white">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-[36px] bg-[color:var(--color-reel-bg)] shadow-2xl ring-1 ring-white/10">
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

        <div
          className="absolute inset-0 z-0"
          style={{ background: REEL_BGS[idx % REEL_BGS.length] }}
        />
        <div className="absolute inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-t from-[color:var(--color-reel-bg)] via-[color:var(--color-reel-bg)]/60 to-transparent" />

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
            {s.venue?.area && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
                📍 {s.venue.area}
              </span>
            )}
          </div>

          <div className="mt-auto">
            {s.venue && alts.length > 0 && !drawer && (
              <button
                onClick={() => setDrawer(true)}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur"
              >
                ↺ Swap this spot
              </button>
            )}
          </div>
        </div>

        {drawer && s.venue && alts.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-[color:var(--color-reel-surface)] p-5 pb-6 ring-1 ring-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => setDrawer(false)}
              className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/20"
              aria-label="Close"
            />
            <p className="[font-family:var(--font-mono)] mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
              Prefer somewhere else?
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {alts.slice(0, 8).map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onSwap(s.order, v);
                    setDrawer(false);
                  }}
                  className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm hover:bg-white/[0.06] transition flex items-center justify-between gap-2"
                >
                  <span>{v.name}</span>
                  {v.area && <span className="text-xs text-white/50">{v.area}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center [font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-muted-foreground">
        Tap the sides to move · {idx + 1}/{stops.length}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>;
}
