import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCouple,
  createCouple,
  joinCouple,
  updateTogetherSince,
  unpair,
  type Couple,
} from "@/lib/couple";
import { todaysQuestion, useQotd, submitAnswer } from "@/lib/qotd";
import {
  useJar,
  addJarItem,
  toggleJarItem,
  deleteJarItem,
  usePulse,
  setPulse,
  PULSE_OPTIONS,
} from "@/lib/coupleExtras";
import { ACTIVITY_META, type Entry } from "@/lib/datedata/types";

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}
const MOODS = ["😤", "😕", "😐", "😊", "😍"];
function moodEmoji(m: number): string {
  return MOODS[Math.min(4, Math.max(0, m - 1))] ?? "🙂";
}
function relTime(iso: string): string {
  const h = Math.floor((Date.now() - +new Date(iso)) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}w`;
}

const GOLD_CARD = {
  borderColor: "color-mix(in oklab, var(--color-couple-gold) 26%, transparent)",
  background: "color-mix(in oklab, var(--color-couple-gold) 7%, transparent)",
} as const;

export function CouplesHome({
  myName,
  myId,
  partnerFallback,
  entries,
  monthMine,
  sym,
}: {
  myName: string;
  myId: string;
  partnerFallback: string;
  entries: Entry[];
  monthMine: Entry[];
  sym: string;
}) {
  const { couple, reload } = useCouple(true);
  const paired = !!(couple && couple.memberB);
  const iAmA = couple?.memberA === myId;
  const partnerName = paired
    ? (iAmA ? couple!.memberBName : couple!.memberAName) || "your partner"
    : partnerFallback;
  const daysTogether = couple?.togetherSince
    ? Math.max(0, Math.floor((Date.now() - +new Date(`${couple.togetherSince}T00:00:00`)) / 86400000))
    : null;
  const qotd = useQotd(paired && couple ? couple.id : undefined, myId);

  const spentThisMonth = monthMine.reduce((a, e) => a + e.amountCents, 0);
  const moodMostly = (() => {
    if (monthMine.length === 0) return "🙂";
    const c: Record<number, number> = {};
    monthMine.forEach((e) => (c[e.mood] = (c[e.mood] ?? 0) + 1));
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return moodEmoji(Number(top[0]));
  })();

  return (
    <>
      {/* warm wash */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 20% -10%, color-mix(in oklab, var(--color-couple-peach) 20%, transparent), transparent 55%), radial-gradient(ellipse at 90% 8%, color-mix(in oklab, var(--color-couple-plum) 24%, transparent), transparent 60%)",
        }}
      />

      <div className="relative z-10 px-5 pt-4">
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/50">
          {greeting()}, us
        </p>
        <h1 className="[font-family:var(--font-display)] mt-0.5 text-3xl tracking-wide">
          You &amp; {partnerName}
        </h1>
      </div>

      {/* Us hero */}
      <section className="relative z-10 mt-4 px-5">
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
              {paired && daysTogether !== null ? (
                <>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    together since
                  </div>
                  <div className="[font-family:var(--font-display)] text-3xl leading-none tracking-wide">
                    {daysTogether} <span className="text-white/60">days</span>
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

          <div className="mt-5 grid grid-cols-3 gap-2">
            <UsStat k="dates / mo" v={String(monthMine.length)} hot />
            <UsStat k="spent / mo" v={`${sym}${Math.round(spentThisMonth / 100)}`} />
            <UsStat k="streak" v={`${qotd.streak}d`} />
          </div>

          {couple ? (
            <PairedFooter couple={couple} paired={paired} partnerName={partnerName} onChanged={reload} />
          ) : (
            <PairUp myName={myName} onDone={reload} />
          )}
        </div>
      </section>

      {/* Question of the day */}
      {paired && couple ? (
        <QotDCard coupleId={couple.id} partnerName={partnerName} qotd={qotd} />
      ) : (
        <QotDTeaser />
      )}

      {/* Shared jar */}
      {paired && couple && <CoupleJar coupleId={couple.id} myId={myId} />}

      {/* Us, lately */}
      <UsLately entries={entries} />

      {/* Daily pulse */}
      {paired && couple && <DailyPulse coupleId={couple.id} myId={myId} partnerName={partnerName} />}

      {/* Monthly recap */}
      <MonthRecap
        dates={monthMine.length}
        spent={spentThisMonth}
        mood={moodMostly}
        streak={qotd.streak}
        sym={sym}
      />

      {/* Milestones */}
      <Milestones daysTogether={daysTogether} datesLogged={entries.length} streak={qotd.streak} />

      {/* Keep Discover + Feed reachable */}
      <div className="relative z-10 mx-4 mt-7">
        <Link
          to="/discover"
          className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-5"
        >
          <div>
            <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-white/45">
              Discover
            </p>
            <h3 className="mt-1 text-lg font-bold">What does dating cost?</h3>
          </div>
          <span className="text-3xl">💸</span>
        </Link>
      </div>
    </>
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
          <p className="text-sm font-semibold">{couple.togetherSince ?? "Not set"}</p>
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
        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-60"
        style={{ background: "var(--color-couple-peach)" }}
      >
        {busy ? "…" : "Pair up — create our couple 🔗"}
      </button>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Have a code? e.g. US-7QK2AB"
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

function QotDTeaser() {
  return (
    <section className="relative z-10 mt-4 px-5">
      <div className="rounded-[24px] border p-5" style={GOLD_CARD}>
        <div className="flex items-center justify-between">
          <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/55">
            Question of the day
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white/60">
            pair up
          </span>
        </div>
        <p className="[font-family:var(--font-serif)] mt-2 text-lg italic leading-snug text-white/85">
          &ldquo;One tiny thing they did this week that you&apos;d never say out loud?&rdquo;
        </p>
        <p className="mt-2 text-[11px] text-white/45">Pair up above to start the streak.</p>
      </div>
    </section>
  );
}

function QotDCard({
  coupleId,
  partnerName,
  qotd,
}: {
  coupleId: string;
  partnerName: string;
  qotd: ReturnType<typeof useQotd>;
}) {
  const q = todaysQuestion();
  const { loading, mine, partner, partnerAnswered, streak, reload } = qotd;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const t = draft.trim();
    if (!t) return;
    setBusy(true);
    const ok = await submitAnswer(coupleId, t);
    setBusy(false);
    if (ok) {
      setDraft("");
      reload();
    } else toast.error("Couldn't save — try again.");
  }

  return (
    <section className="relative z-10 mt-4 px-5">
      <div className="rounded-[24px] border p-5" style={GOLD_CARD}>
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/55">
          Question of the day{streak > 0 ? ` · ${streak}-day streak 🔥` : ""}
        </p>
        <p className="[font-family:var(--font-serif)] mt-2 text-lg italic leading-snug text-white/90">
          &ldquo;{q.text}&rdquo;
        </p>
        {loading ? (
          <p className="mt-3 text-sm text-white/40">…</p>
        ) : !mine ? (
          <div className="mt-3">
            {partnerAnswered && (
              <p className="mb-2 text-[11px]" style={{ color: "var(--color-couple-peach)" }}>
                {partnerName} answered · your turn to unlock theirs 🔓
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 300))}
              placeholder="your answer, just for you two…"
              rows={2}
              className="w-full resize-none rounded-2xl border border-white/12 bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={busy || !draft.trim()}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              style={{ background: "var(--color-couple-gold)" }}
            >
              {busy ? "…" : "Answer"}
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] uppercase tracking-widest text-white/45">You said</p>
              <p className="mt-1 text-sm text-white/90">{mine}</p>
            </div>
            {partner ? (
              <div
                className="rounded-2xl border p-3"
                style={{
                  borderColor: "color-mix(in oklab, var(--color-couple-peach) 30%, transparent)",
                  background: "color-mix(in oklab, var(--color-couple-peach) 10%, transparent)",
                }}
              >
                <p className="text-[9px] uppercase tracking-widest text-white/55">
                  {partnerName} said
                </p>
                <p className="mt-1 text-sm text-white/90">{partner}</p>
              </div>
            ) : (
              <p className="text-center text-[11px] text-white/45">
                Answered ✓ — waiting for {partnerName}…
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const JAR_EMOJIS = ["🌅", "🍽️", "🚆", "🎹", "💃", "🏖️", "🎬", "🥂", "🎡", "🏔️"];

function CoupleJar({ coupleId, myId }: { coupleId: string; myId: string }) {
  const { items, reload } = useJar(coupleId);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState(JAR_EMOJIS[0]);
  const done = items.filter((i) => i.done).length;

  return (
    <section className="relative z-10 mt-6 px-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="[font-family:var(--font-display)] text-lg tracking-wide">The jar</h2>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/50">
          {done}/{items.length} done
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            style={
              it.done
                ? { background: "color-mix(in oklab, var(--color-couple-gold) 10%, transparent)" }
                : undefined
            }
          >
            <button
              onClick={async () => {
                await toggleJarItem(it.id, !it.done);
                reload();
              }}
              className="grid size-7 place-items-center rounded-full border transition-colors"
              style={{
                borderColor: it.done ? "var(--color-couple-gold)" : "rgba(255,255,255,0.2)",
                background: it.done ? "var(--color-couple-gold)" : "transparent",
                color: it.done ? "#000" : "transparent",
              }}
              aria-label={it.done ? "Mark not done" : "Mark done"}
            >
              ✓
            </button>
            <span className="text-xl">{it.emoji ?? "✨"}</span>
            <div className="min-w-0 flex-1">
              <div
                className={`[font-family:var(--font-display)] tracking-wide ${it.done ? "line-through opacity-60" : ""}`}
              >
                {it.label}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/45">
                added by {it.addedBy === myId ? "you" : "them"}
              </div>
            </div>
            <button
              onClick={async () => {
                await deleteJarItem(it.id);
                reload();
              }}
              className="shrink-0 text-white/30 hover:text-white/70"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <div className="rounded-2xl border border-white/12 bg-black/25 p-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto">
                {JAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-lg ${emoji === e ? "bg-white/20" : "bg-white/[0.04]"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value.slice(0, 80))}
                  placeholder="something to do together…"
                  className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  onClick={async () => {
                    if (!label.trim()) return;
                    await addJarItem(coupleId, label, emoji);
                    setLabel("");
                    setAdding(false);
                    reload();
                  }}
                  className="shrink-0 rounded-xl px-4 text-sm font-semibold text-neutral-950"
                  style={{ background: "var(--color-couple-gold)" }}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-sm text-white/60"
            >
              + drop something into the jar
            </button>
          )}
        </li>
      </ul>
    </section>
  );
}

const TINTS = ["peach", "plum", "gold", "blush"];

function UsLately({ entries }: { entries: Entry[] }) {
  const recent = entries.slice(0, 6);
  if (recent.length === 0) return null;
  return (
    <section className="relative z-10 mt-6">
      <div className="mb-2 flex items-baseline justify-between px-5">
        <h2 className="[font-family:var(--font-display)] text-lg tracking-wide">Us, lately</h2>
        <Link to="/stats" className="text-[10px] uppercase tracking-[0.22em] text-white/50">
          open reel →
        </Link>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {recent.map((e, i) => (
          <div
            key={e.id}
            className="w-40 shrink-0 snap-start rounded-2xl border border-white/10 p-3 pb-4"
            style={{
              background: `linear-gradient(160deg, color-mix(in oklab, var(--color-couple-${TINTS[i % TINTS.length]}) 40%, transparent), rgba(0,0,0,0.35))`,
            }}
          >
            <div className="grid aspect-square place-items-center rounded-lg bg-black/40 text-4xl">
              {moodEmoji(e.mood)}
            </div>
            <div className="mt-2 [font-family:var(--font-display)] truncate text-sm tracking-wide">
              {ACTIVITY_META[e.activity]?.label ?? e.activity}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/55">
              {relTime(e.createdAt)} ago
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyPulse({
  coupleId,
  myId,
  partnerName,
}: {
  coupleId: string;
  myId: string;
  partnerName: string;
}) {
  const { mine, partner, reload } = usePulse(coupleId, myId);
  return (
    <section className="relative z-10 mt-6 px-5">
      <div
        className="rounded-3xl border p-4"
        style={{
          borderColor: "color-mix(in oklab, var(--color-couple-blush) 30%, transparent)",
          background: "color-mix(in oklab, var(--color-couple-blush) 8%, transparent)",
        }}
      >
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/60">daily pulse</div>
          {partner && (
            <div className="text-[10px] text-white/50">
              {partnerName} said <span className="text-white/80">{partner}</span>
            </div>
          )}
        </div>
        <p className="mt-1 [font-family:var(--font-display)] text-lg tracking-wide">
          How full is your cup today?
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {PULSE_OPTIONS.map((o) => (
            <button
              key={o}
              onClick={async () => {
                await setPulse(coupleId, o);
                reload();
              }}
              className="rounded-full border px-2 py-2 text-xs transition-transform active:scale-95"
              style={
                mine === o
                  ? { borderColor: "var(--color-couple-blush)", background: "color-mix(in oklab, var(--color-couple-blush) 20%, transparent)" }
                  : { borderColor: "rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.2)" }
              }
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MonthRecap({
  dates,
  spent,
  mood,
  streak,
  sym,
}: {
  dates: number;
  spent: number;
  mood: string;
  streak: number;
  sym: string;
}) {
  return (
    <section className="relative z-10 mt-6 px-5">
      <div
        className="relative overflow-hidden rounded-3xl border p-5"
        style={{
          borderColor: "color-mix(in oklab, var(--color-couple-gold) 30%, transparent)",
          background:
            "linear-gradient(155deg, color-mix(in oklab, var(--color-couple-peach) 28%, transparent), color-mix(in oklab, var(--color-couple-plum) 30%, transparent))",
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/70">This month, together</div>
        <div className="mt-1 [font-family:var(--font-display)] text-4xl leading-none tracking-wide">
          {dates} dates · {sym}
          {Math.round(spent / 100)}
        </div>
        <div className="mt-2 text-sm text-white/75">
          mood ran mostly {mood}
          {streak > 0 ? ` · ${streak}-day question streak` : ""}
        </div>
        <button
          onClick={async () => {
            const text = `Us this month: ${dates} dates · ${sym}${Math.round(spent / 100)}${streak > 0 ? ` · ${streak}-day streak` : ""}. whoamidating.singles`;
            try {
              if (navigator.share) await navigator.share({ title: "Our month", text });
              else {
                await navigator.clipboard?.writeText(text);
                toast.success("Copied 💞");
              }
            } catch {
              /* cancelled */
            }
          }}
          className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold text-black"
          style={{ background: "var(--color-couple-gold)" }}
        >
          share our month ↗
        </button>
      </div>
    </section>
  );
}

function Milestones({
  daysTogether,
  datesLogged,
  streak,
}: {
  daysTogether: number | null;
  datesLogged: number;
  streak: number;
}) {
  const badges = [
    { icon: "💌", name: "12-day streak", earned: streak >= 12 },
    { icon: "🥂", name: "First 100 days", earned: daysTogether !== null && daysTogether >= 100 },
    { icon: "🎡", name: "10 dates logged", earned: datesLogged >= 10 },
    { icon: "🧳", name: "First trip", earned: false },
    { icon: "🎂", name: "1 year", earned: daysTogether !== null && daysTogether >= 365 },
    { icon: "🏠", name: "Moved in", earned: false },
  ];
  const got = badges.filter((b) => b.earned).length;
  return (
    <section className="relative z-10 mt-6 px-5 pb-2">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="[font-family:var(--font-display)] text-lg tracking-wide">Milestones</h2>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/50">
          {got}/{badges.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((b) => (
          <div
            key={b.name}
            className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center"
            style={{
              borderColor: b.earned
                ? "color-mix(in oklab, var(--color-couple-gold) 40%, transparent)"
                : "rgba(255,255,255,0.08)",
              background: b.earned
                ? "color-mix(in oklab, var(--color-couple-gold) 10%, transparent)"
                : "rgba(255,255,255,0.02)",
              opacity: b.earned ? 1 : 0.5,
            }}
          >
            <span className="text-2xl">{b.earned ? b.icon : "?"}</span>
            <span className="text-[9px] uppercase tracking-widest text-white/60">{b.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
