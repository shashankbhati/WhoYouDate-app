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
  markRecipient,
  markRecipientSeen,
  subscribeSharedPlan,
  whoAmI,
  type SharedPlan,
  type SharedStep,
} from "@/lib/dateplan/share";
import type { Venue } from "@/lib/dateplan/types";
import { JourneyMap } from "@/components/JourneyMap";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$id")({
  head: () => ({ meta: [{ title: "A date plan for you 💌", name: "robots", content: "noindex" }] }),
  component: SharedPlanPage,
});

function SharedPlanPage() {
  const { id } = Route.useParams();
  const { isReal, loading: authLoading } = useAuthState();
  // Reading a shared plan requires a real login (the link is the capability, the
  // login is the gate).
  if (!isReal) return <SignInWall authLoading={authLoading} />;
  return <SharedPlanView id={id} />;
}

function SignInWall({ authLoading }: { authLoading: boolean }) {
  return (
    <Shell>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-8 text-center text-white">
        <p className="text-4xl">💌</p>
        <h1 className="mt-3 text-xl font-bold">Someone planned a date for you</h1>
        <p className="mt-2 text-sm text-white/60">
          Sign in to open the plan — you'll see where you're going and can tweak anything you like.
        </p>
        <button
          onClick={() => openAuthModal("Sign in to open this date plan.")}
          className="mt-5 rounded-full bg-[color:var(--color-reel-rose)] px-6 py-2.5 font-semibold text-neutral-950 transition hover:opacity-90"
        >
          Sign in to open
        </button>
        {authLoading && <p className="mt-3 text-xs text-white/40">Checking your session…</p>}
      </div>
    </Shell>
  );
}

function SharedPlanView({ id }: { id: string }) {
  useDatePlanStore(); // subscribe so alternatives re-render once this city's venues load
  const { isReal, loading: authLoading } = useAuthState();
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
        if (who && p.ownerId === who.id) {
          markOwnerSeen(id); // clear owner's "new update" flag
        } else if (who) {
          // A logged-in non-owner opened it. Record who they are for the owner's
          // inbox (written once), and clear their own "new update" flag.
          if (!p.recipientId) {
            markRecipient(id, who.id, who.name);
            setPlan({ ...p, recipientId: who.id, recipientName: who.name });
          }
          markRecipientSeen(id);
        }
      }
    })();
    // Live updates from the other side (edits, messages, accept).
    const unsub = subscribeSharedPlan(id, (fresh) => {
      if (alive) setPlan(fresh);
    });
    // Fallback poll every 6s — so chat/edits still sync even if Realtime isn't
    // enabled on the project yet.
    const poll = setInterval(async () => {
      const fresh = await loadSharedPlan(id);
      if (alive && fresh) setPlan(fresh);
    }, 6000);
    return () => {
      alive = false;
      unsub();
      clearInterval(poll);
    };
  }, [id, isReal]); // reload + re-identify after a sign-in

  const cityVenues = plan ? venuesForCity(plan.city) : [];

  async function swap(stepOrder: number, v: Venue) {
    if (!isReal) return openAuthModal("Sign in to change this plan.");
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
    if (!isReal) return openAuthModal("Sign in to accept this plan.");
    if (!plan) return;
    setPlan({ ...plan, status: "accepted" });
    const ok = await acceptSharedPlan(id);
    if (ok) toast.success("Plan accepted 💗");
    else toast.error("Couldn't save — try again.");
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-white/50">Opening the plan…</p>
      </Shell>
    );
  }
  if (!plan) {
    // Logged out + nothing loaded → most likely viewing needs a login (or dead link).
    if (!isReal) return <SignInWall authLoading={authLoading} />;
    return (
      <Shell>
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-8 text-center text-white">
          <p className="text-3xl">🕳️</p>
          <p className="mt-3 font-semibold">This plan couldn't be found</p>
          <p className="mt-1 text-sm text-white/60">The link may be wrong or removed.</p>
        </div>
      </Shell>
    );
  }

  return (
    <SharedReelScreen
      plan={plan}
      isReal={isReal}
      isOwner={isOwner}
      cityVenues={cityVenues}
      onSwap={swap}
      onAccept={accept}
      onPosted={(msgs) => setPlan({ ...plan, messages: msgs })}
      id={id}
    />
  );
}

// ── Full-screen shared reel (recipient's app view) ────────────────────────────
const REEL_BGS = [
  "linear-gradient(160deg, oklch(0.35 0.12 30), oklch(0.18 0.05 285))",
  "linear-gradient(160deg, oklch(0.28 0.08 40), oklch(0.16 0.03 260))",
  "linear-gradient(180deg, oklch(0.22 0.05 260), oklch(0.14 0.02 260))",
  "linear-gradient(160deg, oklch(0.3 0.09 350), oklch(0.16 0.04 300))",
];

function SharedReelScreen({
  plan,
  isReal,
  isOwner,
  cityVenues,
  onSwap,
  onAccept,
  onPosted,
  id,
}: {
  plan: SharedPlan;
  isReal: boolean;
  isOwner: boolean;
  cityVenues: Venue[];
  onSwap: (order: number, v: Venue) => void;
  onAccept: () => void;
  onPosted: (m: SharedPlan["messages"]) => void;
  id: string;
}) {
  const stops = plan.steps;
  const total = stops.length + 1; // stops + the details/chat chapter
  const [idx, setIdx] = useState(0);
  const touchX = useRef(0);
  const isDetails = idx >= stops.length;
  const s = stops[idx];
  const go = (i: number) => setIdx(Math.max(0, Math.min(total - 1, i)));

  const heading = isOwner
    ? "Your shared plan"
    : plan.ownerName
      ? `${plan.ownerName} planned a date`
      : "A date, planned for you";

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-black [font-family:var(--font-sans)] text-white">
      <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[color:var(--color-reel-bg)] shadow-2xl sm:my-auto sm:h-[min(920px,100svh)] sm:rounded-[40px] sm:ring-1 sm:ring-white/10">
        {/* Top bar */}
        <div className="relative z-40 px-4 pt-safe">
          <div className="flex items-center gap-2 pb-2.5 pt-3">
            <Link
              to="/"
              aria-label="Home"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/15"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="size-[18px]"
              >
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-white/80">
              {plan.city}
              {plan.date ? ` · ${fmtDate(plan.date)}` : ""}
            </p>
            <StatusDot status={plan.status} />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"
                aria-label={`Chapter ${i + 1}`}
              >
                <span
                  className={`block h-full rounded-full bg-white ${i <= idx ? "w-full" : "w-0"}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -45) go(idx + 1);
            else if (dx > 45) go(idx - 1);
          }}
        >
          <div
            className="absolute inset-0 z-0"
            style={{ background: REEL_BGS[idx % REEL_BGS.length] }}
          />
          <JourneyMap total={total} idx={idx} />
          <div className="absolute inset-x-0 bottom-0 z-[2] h-2/3 bg-gradient-to-t from-[color:var(--color-reel-bg)] via-[color:var(--color-reel-bg)]/50 to-transparent" />

          <button
            className="absolute left-0 top-0 z-10 h-full w-1/5"
            aria-label="Previous"
            onClick={() => go(idx - 1)}
          />
          <button
            className="absolute right-0 top-0 z-10 h-full w-1/5"
            aria-label="Next"
            onClick={() => go(idx + 1)}
          />

          {isDetails ? (
            <SharedDetails
              plan={plan}
              isReal={isReal}
              isOwner={isOwner}
              heading={heading}
              onAccept={onAccept}
              onPosted={onPosted}
              id={id}
            />
          ) : (
            s && (
              <SharedChapter
                key={idx}
                s={s}
                idx={idx}
                total={total}
                cityVenues={cityVenues}
                onSwap={onSwap}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function SharedChapter({
  s,
  idx,
  total,
  cityVenues,
  onSwap,
}: {
  s: SharedStep;
  idx: number;
  total: number;
  cityVenues: Venue[];
  onSwap: (order: number, v: Venue) => void;
}) {
  const [drawer, setDrawer] = useState(false);
  const kind = s.title.split(" — ")[0];
  const place = s.venue?.name ?? s.title;
  const startTime = s.timeLabel?.split(" – ")[0] ?? "";
  const alts = s.venue
    ? cityVenues.filter((v) => v.kind === s.venue!.kind && v.id !== s.venue!.id)
    : [];

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-6">
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
              className="pointer-events-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur"
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
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {alts.slice(0, 8).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  onSwap(s.order, v);
                  setDrawer(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.06]"
              >
                <span>{v.name}</span>
                {v.area && <span className="text-xs text-white/50">{v.area}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <span className="absolute bottom-3 left-0 right-0 z-20 text-center [font-family:var(--font-mono)] text-[9px] uppercase tracking-widest text-white/40">
        {idx + 1}/{total} · swipe sides to move
      </span>
    </>
  );
}

// The closing chapter for the recipient: date, status, accept, and chat.
function SharedDetails({
  plan,
  isReal,
  isOwner,
  heading,
  onAccept,
  onPosted,
  id,
}: {
  plan: SharedPlan;
  isReal: boolean;
  isOwner: boolean;
  heading: string;
  onAccept: () => void;
  onPosted: (m: SharedPlan["messages"]) => void;
  id: string;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto px-6 pb-8 pt-6">
      <p className="text-3xl">💌</p>
      <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-balance">{heading}</h2>
      <p className="mt-1 text-sm text-white/60">
        {plan.city}
        {plan.date ? ` · ${fmtDate(plan.date)}` : ""} · tweak anything you like
      </p>

      <div className="mt-4">
        <StatusStrip plan={plan} isOwner={isOwner} />
      </div>

      {plan.weatherBanner && (
        <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-center text-sm text-white/80">
          {plan.weatherBanner}
        </p>
      )}

      {!isOwner && plan.status !== "accepted" && (
        <button
          onClick={onAccept}
          className="mt-4 w-full rounded-full bg-[color:var(--color-reel-rose)] py-3 font-semibold text-neutral-950 transition hover:opacity-90"
        >
          💗 Accept this plan
        </button>
      )}

      <MessageThread plan={plan} isReal={isReal} isOwner={isOwner} onPosted={onPosted} id={id} />

      <p className="mt-6 text-center text-xs text-white/50">
        Want to plan your own?{" "}
        <Link to="/plan" className="text-[color:var(--color-reel-rose)] hover:underline">
          Make a date plan →
        </Link>
      </p>
    </div>
  );
}

function StatusDot({ status }: { status: SharedPlan["status"] }) {
  const tone =
    status === "accepted"
      ? "bg-[color:var(--color-reel-rose)]"
      : status === "changed"
        ? "bg-amber-400"
        : "bg-white/30";
  const label =
    status === "accepted" ? "Accepted" : status === "changed" ? "Edited" : "Pending";
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70 ring-1 ring-white/10">
      <span className={`size-1.5 rounded-full ${tone}`} />
      {label}
    </span>
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
      ? "border-[color:var(--color-reel-rose)]/40 bg-[color:var(--color-reel-rose)]/10"
      : plan.status === "changed"
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-white/10 bg-white/[0.04]";
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-center text-sm text-white/80 ${tone}`}>
      {label}
    </div>
  );
}

function MessageThread({
  plan,
  isReal,
  isOwner,
  onPosted,
  id,
}: {
  plan: SharedPlan;
  isReal: boolean;
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
    if (!isReal) return openAuthModal("Sign in to chat about this plan.");
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
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-bold">Chat about it</p>
      {plan.messages.length === 0 ? (
        <p className="mb-3 text-xs text-white/50">No messages yet — say hi or ask about a spot.</p>
      ) : (
        <div className="mb-3 max-h-56 space-y-2 overflow-y-auto">
          {plan.messages.map((m, i) => {
            const mine = m.owner === isOwner;
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-[color:var(--color-reel-rose)] text-neutral-950" : "bg-white/10 text-white"}`}
                >
                  {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.actor}</p>}
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
          className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-full bg-[color:var(--color-reel-rose)] px-4 font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--color-reel-bg)] px-4 py-10 [font-family:var(--font-sans)]">
      {children}
    </main>
  );
}
