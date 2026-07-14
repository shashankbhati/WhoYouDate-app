import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { useStore } from "@/lib/datedata/store";
import { useCountry } from "@/lib/country";
import { useSharedInbox } from "@/lib/dateplan/inbox";
import { ACTIVITY_META } from "@/lib/datedata/types";
import type { SharedPlan } from "@/lib/dateplan/share";

// The logged-in phone-app home: the two-person shared-date loop up top, then your
// plans, your ledger, a weekly check-in, and fresh local activity. Wired to real
// data; the only live/time-based bits are SSR-guarded (rendered client-only).

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}
function otherName(p: SharedPlan, uid: string): string {
  return p.ownerId === uid ? (p.recipientName ?? "your date") : (p.ownerName ?? "someone");
}
function needsYou(p: SharedPlan, myName: string): boolean {
  return !!p.lastActor && p.lastActor !== myName;
}
function weekKey(): number {
  return Math.floor(Date.now() / (7 * 86400000));
}

// SSR-safe countdown: null until mounted, so server and first client render match.
function useCountdown(dateISO?: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null || !dateISO) return null;
  const target = +new Date(`${dateISO}T19:00:00`);
  const diff = target - now;
  if (Number.isNaN(diff) || diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}

export function AppHome() {
  const { entries, profile, userId } = useStore();
  const { config } = useCountry();
  const { sent, received } = useSharedInbox(true);
  const sym = config.currencySymbol;

  const myName = profile?.displayName ?? "you";
  const city = profile?.city ?? "your city";

  const mine = useMemo(() => entries.filter((e) => e.userId === userId), [entries, userId]);
  const plans = useMemo(
    () =>
      [...sent, ...received].sort(
        (a, b) => +new Date(b.updatedAt ?? 0) - +new Date(a.updatedAt ?? 0),
      ),
    [sent, received],
  );
  // Focus = the soonest upcoming dated plan, else the most recently active.
  const focus = useMemo(() => {
    const upcoming = plans
      .filter((p) => p.date && +new Date(`${p.date}T23:59:59`) >= Date.now())
      .sort((a, b) => +new Date(a.date!) - +new Date(b.date!));
    return upcoming[0] ?? plans[0];
  }, [plans]);

  const totalCents = mine.reduce((a, e) => a + e.amountCents, 0);
  const secondPct = mine.length
    ? Math.round((mine.filter((e) => e.secondDate && e.secondDate !== "no").length / mine.length) * 100)
    : 0;

  const fresh = useMemo(
    () =>
      [...entries]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [entries],
  );

  return (
    <AppShell>
      <div className="px-5 pt-safe">
        <div className="pt-5">
          <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/45">
            {greeting()}, {myName}
          </p>
          <h1 className="[font-family:var(--font-display)] mt-1 text-4xl tracking-wide">{city}</h1>
        </div>
      </div>

      <FocusCard focus={focus} uid={userId} myName={myName} />

      {plans.length > 0 && (
        <Section title="Your plans" action={{ label: "Open inbox →", to: "/dates" }}>
          <div className="space-y-2.5">
            {plans.slice(0, 3).map((p) => (
              <PlanRow key={p.id} p={p} uid={userId} myName={myName} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Your dating ledger" action={{ label: "See all →", to: "/stats" }}>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Dates" value={String(mine.length)} />
          <Stat label="Spent" value={`${sym}${Math.round(totalCents / 100)}`} />
          <Stat label="2nd-date" value={mine.length ? `${secondPct}%` : "—"} accent />
        </div>
        <div className="mt-2.5 space-y-2">
          {mine.slice(0, 2).map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
            >
              <span className="text-lg">{ACTIVITY_META[e.activity]?.emoji ?? "💫"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.partnerName}</p>
                <p className="truncate text-[11px] uppercase tracking-wider text-white/40">
                  {ACTIVITY_META[e.activity]?.label ?? e.activity} · {relTime(e.createdAt)}
                </p>
              </div>
              <span className="text-sm font-bold">
                {sym}
                {Math.round(e.amountCents / 100)}
              </span>
            </div>
          ))}
          {mine.length === 0 && (
            <Link
              to="/log"
              className="block rounded-2xl border border-dashed border-white/15 px-3.5 py-3 text-center text-sm text-white/60"
            >
              Log your first date →
            </Link>
          )}
        </div>
      </Section>

      <div className="mx-4 mt-7">
        <Link
          to="/discover"
          className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-5 transition hover:border-white/20"
        >
          <div>
            <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-white/45">
              Discover
            </p>
            <h3 className="mt-1 text-lg font-bold">What does dating cost?</h3>
            <p className="mt-0.5 text-sm text-white/55">Search any name · the costliest names</p>
          </div>
          <span className="text-3xl">💸</span>
        </Link>
      </div>

      <div className="mx-4 mt-3">
        <Link
          to="/feed"
          className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-5 transition hover:border-white/20"
        >
          <div>
            <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-white/45">
              Community
            </p>
            <h3 className="mt-1 text-lg font-bold">Share a dating story</h3>
            <p className="mt-0.5 text-sm text-white/55">Confessions & advice · anonymous</p>
          </div>
          <span className="text-3xl">✍️</span>
        </Link>
      </div>

      <WeeklyCheckin />

      {fresh.length > 0 && (
        <Section title={`Fresh in ${city}`}>
          <div className="space-y-2">
            {fresh.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate text-white/80">
                  {e.userId === userId ? "you logged" : "someone logged"}{" "}
                  <span className="font-semibold text-white">
                    {sym}
                    {Math.round(e.amountCents / 100)} {ACTIVITY_META[e.activity]?.label ?? e.activity}
                  </span>{" "}
                  in {e.city}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">
                  {relTime(e.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </AppShell>
  );
}

function FocusCard({ focus, uid, myName }: { focus?: SharedPlan; uid: string; myName: string }) {
  const cd = useCountdown(focus?.date);

  if (!focus) {
    return (
      <div className="mx-4 mt-4">
        <Link
          to="/plan"
          className="block rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-6 text-center"
        >
          <p className="text-3xl">💌</p>
          <p className="mt-2 font-semibold">Plan your first date</p>
          <p className="mt-1 text-sm text-white/60">
            Map it out, share it, and it'll live right here.
          </p>
          <span className="mt-4 inline-block rounded-full bg-[color:var(--color-reel-rose)] px-5 py-2 text-sm font-semibold text-neutral-950">
            Plan a date →
          </span>
        </Link>
      </div>
    );
  }

  const other = otherName(focus, uid);
  const waiting = needsYou(focus, myName);
  const lastMsg = focus.messages?.length ? focus.messages[focus.messages.length - 1] : undefined;
  const title = focus.steps[0]?.venue?.name
    ? `${focus.steps[0].venue?.name}${focus.steps[1]?.venue?.name ? ` → ${focus.steps[1]?.venue?.name}` : ""}`
    : `Your date in ${focus.city}`;

  return (
    <Link
      to="/p/$id"
      params={{ id: focus.id }}
      className="mx-4 mt-4 block overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.3 0.11 15), oklch(0.17 0.05 300))",
      }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-white/60">
            with {other}
          </p>
          {waiting && (
            <span className="rounded-full bg-[color:var(--color-reel-rose)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-neutral-950">
              Waiting on you
            </span>
          )}
        </div>

        <h2 className="mt-2 text-xl font-bold leading-tight text-balance">{title}</h2>
        <p className="mt-1 text-xs text-white/60">
          {focus.date ? fmtLong(focus.date) : "date to be set"}
          {focus.steps[0]?.timeLabel ? ` · ${focus.steps[0].timeLabel.split(" – ")[0]}` : ""}
        </p>

        {cd && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { n: cd.d, l: "days" },
              { n: cd.h, l: "hrs" },
              { n: cd.m, l: "min" },
              { n: cd.s, l: "sec" },
            ].map((x) => (
              <div
                key={x.l}
                className="rounded-2xl bg-black/25 py-2 text-center backdrop-blur"
              >
                <div className="[font-family:var(--font-display)] text-2xl leading-none">
                  {String(x.n).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-widest text-white/50">{x.l}</div>
              </div>
            ))}
          </div>
        )}

        {lastMsg && (
          <div className="mt-4 rounded-2xl bg-black/25 p-3 backdrop-blur">
            <p className="[font-family:var(--font-mono)] text-[9px] uppercase tracking-widest text-white/45">
              {lastMsg.actor} · just now
            </p>
            <p className="mt-1 text-sm">{lastMsg.text}</p>
            <p className="mt-2 text-right text-xs font-semibold text-[color:var(--color-reel-rose)]">
              Reply →
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function PlanRow({ p, uid, myName }: { p: SharedPlan; uid: string; myName: string }) {
  const other = otherName(p, uid);
  const waiting = needsYou(p, myName);
  const lastMsg = p.messages?.length ? p.messages[p.messages.length - 1] : undefined;
  const tag =
    p.status === "accepted" ? "On ✓" : waiting ? "Their move" : "Your move";
  return (
    <Link
      to="/p/$id"
      params={{ id: p.id }}
      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3 transition hover:bg-white/[0.06]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--color-reel-rose-soft)] text-sm font-semibold text-[color:var(--color-reel-rose)]">
        {other[0]?.toUpperCase() ?? "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{other}</p>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/60">
            {tag}
          </span>
        </div>
        <p className="truncate text-[11px] text-white/45">
          {lastMsg ? lastMsg.text : `${p.city}${p.date ? ` · ${fmtLong(p.date)}` : ""}`}
        </p>
      </div>
      {waiting && <span className="size-2 shrink-0 rounded-full bg-[color:var(--color-reel-rose)]" />}
    </Link>
  );
}

const WK_KEY = "wad_weekly_mood";
const MOODS = [
  { key: "lit", label: "lit", emoji: "🔥" },
  { key: "steady", label: "steady", emoji: "😊" },
  { key: "quiet", label: "quiet", emoji: "😌" },
  { key: "rough", label: "rough", emoji: "😮‍💨" },
];

function WeeklyCheckin() {
  const [mood, setMood] = useState<string | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(WK_KEY) || "null");
      if (v && v.week === weekKey()) setMood(v.mood);
    } catch {
      /* ignore */
    }
  }, []);
  function pick(m: string) {
    setMood(m);
    try {
      localStorage.setItem(WK_KEY, JSON.stringify({ week: weekKey(), mood: m }));
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="mx-4 mt-7 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-5">
      <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-white/45">
        Weekly check-in
      </p>
      <h3 className="mt-1 text-lg font-bold">How's dating going this week?</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => pick(m.key)}
            className={`rounded-2xl border py-3 text-sm font-medium transition ${
              mood === m.key
                ? "border-[color:var(--color-reel-rose)] bg-[color:var(--color-reel-rose)]/15"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
      {mood && <p className="mt-3 text-center text-xs text-white/45">Logged for this week 🙌</p>}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 px-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        {action && (
          <Link
            to={action.to}
            className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/45 hover:text-white"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3 text-center">
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${accent ? "text-[color:var(--color-reel-rose)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const ms = Date.now() - +new Date(iso);
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtLong(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}
