import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, AppLoading } from "./AppShell";
import { useStore } from "@/lib/datedata/store";
import { useCountry } from "@/lib/country";
import { useSharedInbox } from "@/lib/dateplan/inbox";
import { useCouplesMode } from "@/lib/useCouplesMode";
import {
  useCouple,
  createCouple,
  joinCouple,
  updateTogetherSince,
  unpair,
  type Couple,
} from "@/lib/couple";
import { ACTIVITY_META } from "@/lib/datedata/types";
import type { SharedPlan } from "@/lib/dateplan/share";
import { toast } from "sonner";

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
  const { entries, profile, userId, profileChecked } = useStore();
  const { config } = useCountry();
  const { sent, received, loading: inboxLoading } = useSharedInbox(true);
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

  // Couples mode — warmer skin + a couple header, wired to real data.
  const { couples, mounted, toggle } = useCouplesMode();
  const partner = profile?.partnerDisplayName?.trim() || "your partner";
  const monthMine = useMemo(() => {
    const now = new Date();
    return mine.filter((e) => {
      const d = new Date(e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [mine]);
  const spentThisMonth = monthMine.reduce((a, e) => a + e.amountCents, 0);

  if (!profileChecked || inboxLoading) return <AppLoading />;

  return (
    <AppShell>
      {couples && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 20% -10%, color-mix(in oklab, var(--color-couple-peach) 20%, transparent), transparent 55%), radial-gradient(ellipse at 90% 8%, color-mix(in oklab, var(--color-couple-plum) 24%, transparent), transparent 60%)",
          }}
        />
      )}

      {mounted && <ModePill couples={couples} onToggle={toggle} />}

      {couples ? (
        <CoupleHeader
          myName={myName}
          myId={userId}
          partnerFallback={partner}
          datesThisMonth={monthMine.length}
          spentThisMonth={spentThisMonth}
          secondPct={secondPct}
          hasDates={mine.length > 0}
          sym={sym}
        />
      ) : (
        <div className="px-5 pt-safe">
          <div className="pt-5">
            <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/45">
              {greeting()}, {myName}
            </p>
            <h1 className="[font-family:var(--font-display)] mt-1 text-4xl tracking-wide">{city}</h1>
          </div>
        </div>
      )}

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

function ModePill({ couples, onToggle }: { couples: boolean; onToggle: () => void }) {
  return (
    <div className="relative z-10 flex justify-center px-5 pt-3">
      <button
        onClick={onToggle}
        aria-label="Toggle relationship mode"
        className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] p-0.5 text-[10px] uppercase tracking-[0.22em]"
      >
        <span
          className="rounded-full px-3 py-1.5 transition-colors"
          style={
            !couples
              ? { background: "var(--color-reel-rose)", color: "#000" }
              : { color: "rgba(255,255,255,0.55)" }
          }
        >
          I'm dating
        </span>
        <span
          className="rounded-full px-3 py-1.5 transition-colors"
          style={
            couples
              ? { background: "var(--color-couple-peach)", color: "#1a0d0a" }
              : { color: "rgba(255,255,255,0.55)" }
          }
        >
          We're together
        </span>
      </button>
    </div>
  );
}

function CoupleHeader({
  myName,
  myId,
  partnerFallback,
  datesThisMonth,
  spentThisMonth,
  secondPct,
  hasDates,
  sym,
}: {
  myName: string;
  myId: string;
  partnerFallback: string;
  datesThisMonth: number;
  spentThisMonth: number;
  secondPct: number;
  hasDates: boolean;
  sym: string;
}) {
  const { couple, loading, reload } = useCouple(true);
  const paired = !!(couple && couple.memberB);
  const iAmA = couple?.memberA === myId;
  const partnerName = paired
    ? (iAmA ? couple!.memberBName : couple!.memberAName) || "your partner"
    : partnerFallback;
  const days = couple?.togetherSince
    ? Math.max(0, Math.floor((Date.now() - +new Date(`${couple.togetherSince}T00:00:00`)) / 86400000))
    : null;

  return (
    <div className="relative z-10">
      <div className="px-5 pt-4">
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/50">
          {greeting()}, us
        </p>
        <h1 className="[font-family:var(--font-display)] mt-0.5 text-3xl tracking-wide">
          You &amp; {partnerName}
        </h1>
      </div>

      {/* Us hero */}
      <section className="mt-4 px-5">
        <div
          className="relative overflow-hidden rounded-[28px] border p-5"
          style={{
            borderColor: "color-mix(in oklab, var(--color-couple-peach) 30%, transparent)",
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--color-couple-peach) 20%, transparent) 0%, color-mix(in oklab, var(--color-couple-plum) 20%, transparent) 60%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <div
                className="grid size-14 place-items-center rounded-full border-2 border-black/40 [font-family:var(--font-display)] text-xl"
                style={{ background: "var(--color-couple-plum)", color: "#fff" }}
              >
                {(myName[0] ?? "Y").toUpperCase()}
              </div>
              <div
                className="grid size-14 place-items-center rounded-full border-2 border-black/40 [font-family:var(--font-display)] text-xl text-black"
                style={{ background: "var(--color-couple-peach)" }}
              >
                {(partnerName[0] ?? "P").toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {paired && days !== null ? (
                <>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    together since
                  </div>
                  <div className="[font-family:var(--font-display)] text-3xl leading-none tracking-wide">
                    {days} <span className="text-white/60">days</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    the two of you
                  </div>
                  <div className="[font-family:var(--font-display)] truncate text-2xl leading-none tracking-wide">
                    You &amp; {partnerName}
                  </div>
                </>
              )}
            </div>
            {couple && <CodeChip code={couple.code} />}
          </div>

          {/* Real couple stats, this month */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <UsStat k="dates / mo" v={String(datesThisMonth)} hot />
            <UsStat k="spent / mo" v={`${sym}${Math.round(spentThisMonth / 100)}`} />
            <UsStat k="2nd-date" v={hasDates ? `${secondPct}%` : "—"} />
          </div>

          {/* Pairing / paired footer */}
          {loading ? null : couple ? (
            <PairedFooter
              couple={couple}
              paired={paired}
              partnerName={partnerName}
              onChanged={reload}
            />
          ) : (
            <PairUp myName={myName} onDone={reload} />
          )}
        </div>
      </section>

      {/* Question of the day teaser (Phase C) */}
      <section className="mt-4 px-5">
        <div
          className="rounded-[24px] border p-5"
          style={{
            borderColor: "color-mix(in oklab, var(--color-couple-gold) 26%, transparent)",
            background: "color-mix(in oklab, var(--color-couple-gold) 7%, transparent)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/55">
              Question of the day
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white/60">
              soon
            </span>
          </div>
          <p className="[font-family:var(--font-serif)] mt-2 text-lg italic leading-snug text-white/85">
            &ldquo;One tiny thing they did this week that you&apos;d never say out loud?&rdquo;
          </p>
          <p className="mt-2 text-[11px] text-white/45">
            A daily question you both answer — the reveal unlocks when you&apos;re both in.
          </p>
        </div>
      </section>
    </div>
  );
}

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(code);
        } catch {
          /* ignore */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="shrink-0 rounded-full border border-white/20 bg-black/25 px-2.5 py-1.5 [font-family:var(--font-mono)] text-[10px] tracking-wider"
      aria-label="Copy couple code"
    >
      {copied ? "copied ✓" : code}
    </button>
  );
}

// Footer when a couple exists — waiting for the partner, or fully paired.
function PairedFooter({
  couple,
  paired,
  partnerName,
  onChanged,
}: {
  couple: Couple;
  paired: boolean;
  partnerName: string;
  onChanged: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {!paired && (
        <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm">
          <p className="font-semibold">Waiting for them to join 💫</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            Share your code <span className="font-mono text-white/80">{couple.code}</span> — they
            enter it in their app to pair.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="[font-family:var(--font-mono)] text-[9px] uppercase tracking-widest text-white/45">
            Together since
          </p>
          <p className="text-sm font-semibold">
            {couple.togetherSince ? couple.togetherSince : "Not set"}
          </p>
        </div>
        <input
          type="date"
          value={couple.togetherSince ?? ""}
          onChange={async (e) => {
            await updateTogetherSince(couple.id, e.target.value);
            onChanged();
          }}
          className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-sm text-white [color-scheme:dark]"
        />
      </div>
      <button
        onClick={async () => {
          if (window.confirm(paired ? `Unpair from ${partnerName}?` : "Cancel pairing?")) {
            await unpair(couple.id);
            onChanged();
          }
        }}
        className="text-[11px] text-white/45 underline"
      >
        {paired ? "Unpair" : "Cancel"}
      </button>
    </div>
  );
}

// Footer when there's no couple — create one, or join with a code.
function PairUp({ myName, onDone }: { myName: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={async () => {
          setBusy(true);
          const r = await createCouple(myName);
          setBusy(false);
          if (r.ok) {
            toast.success("Couple created — share your code 💞");
            onDone();
          } else toast.error(r.error ?? "Couldn't create.");
        }}
        disabled={busy}
        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-neutral-950 transition active:scale-[0.99] disabled:opacity-60"
        style={{ background: "var(--color-couple-peach)" }}
      >
        {busy ? "…" : "Pair up — create our couple 🔗"}
      </button>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Have a code? e.g. US-7QK2"
          className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-black/25 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
        />
        <button
          onClick={async () => {
            if (!code.trim()) return;
            setBusy(true);
            const r = await joinCouple(code);
            setBusy(false);
            if (r.ok) {
              toast.success("Paired 💞");
              onDone();
            } else toast.error(r.error ?? "Couldn't join.");
          }}
          disabled={busy || !code.trim()}
          className="shrink-0 rounded-2xl border border-white/15 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Join
        </button>
      </div>
    </div>
  );
}

function UsStat({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-2 py-3 text-center">
      <div
        className="[font-family:var(--font-display)] text-xl"
        style={hot ? { color: "var(--color-couple-peach)" } : undefined}
      >
        {v}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-widest text-white/45">{k}</div>
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
