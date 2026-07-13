import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/datedata/store";
import { useCountry } from "@/lib/country";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover dating costs | WhoAmIDating" },
      {
        name: "description",
        content:
          "Search any first name to see what the community really spends on dates — and the costliest names of all.",
      },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { entries } = useStore();
  const { config } = useCountry();
  const sym = config.currencySymbol;
  const [q, setQ] = useState("");

  // Aggregate real community entries by first name — averages, sample, 2nd-date rate.
  const byName = useMemo(() => {
    const m = new Map<string, { total: number; n: number; second: number }>();
    for (const e of entries) {
      const key = e.partnerName.trim();
      if (!key) continue;
      const cur = m.get(key) ?? { total: 0, n: 0, second: 0 };
      cur.total += e.amountCents;
      cur.n += 1;
      if (e.secondDate && e.secondDate !== "no") cur.second += 1;
      m.set(key, cur);
    }
    return m;
  }, [entries]);

  const costliest = useMemo(
    () =>
      [...byName.entries()]
        .filter(([, v]) => v.n >= 1)
        .map(([name, v]) => ({ name, avg: Math.round(v.total / v.n / 100) }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 6),
    [byName],
  );
  const maxAvg = Math.max(1, ...costliest.map((c) => c.avg));

  const result = useMemo(() => {
    const name = q.trim().toLowerCase();
    if (!name) return null;
    let total = 0,
      n = 0,
      second = 0;
    for (const [k, v] of byName) {
      if (k.toLowerCase() === name) {
        total += v.total;
        n += v.n;
        second += v.second;
      }
    }
    if (n === 0) return { found: false as const };
    return {
      found: true as const,
      avg: Math.round(total / n / 100),
      n,
      secondPct: Math.round((second / n) * 100),
    };
  }, [q, byName]);

  return (
    <AppShell>
      <div className="px-5 py-6 pt-safe text-white">
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/45">
          Discover
        </p>
        <h1 className="[font-family:var(--font-display)] mt-1 text-3xl tracking-wide">
          What dating really costs
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Search any first name — see what the community actually spends.
        </p>

        {/* Name lookup */}
        <div className="mt-5 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a first name…"
            className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        {result && (
          <div className="mt-3 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-5">
            {result.found ? (
              <>
                <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/45">
                  Dating {q.trim()}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Mini label="Avg spend" value={`${sym}${result.avg}`} accent />
                  <Mini label="Dates" value={String(result.n)} />
                  <Mini label="2nd date" value={`${result.secondPct}%`} />
                </div>
                {result.n < 8 && (
                  <p className="mt-3 text-center text-[11px] text-white/40">
                    Thin sample — {result.n} date{result.n === 1 ? "" : "s"} logged so far.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-white/60">
                No data yet for <span className="font-semibold text-white">{q.trim()}</span> — be the
                first to log a date.
              </p>
            )}
          </div>
        )}

        {/* Costliest names */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-tight">💸 Costliest names</h2>
          {costliest.length === 0 ? (
            <p className="text-sm text-white/50">Not enough data yet — log some dates to fill this in.</p>
          ) : (
            <div className="space-y-2.5">
              {costliest.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 truncate text-sm font-semibold">{c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((c.avg / maxAvg) * 100, 6)}%`,
                        background: i === 0 ? "var(--color-reel-rose)" : "rgba(255,255,255,0.35)",
                      }}
                    />
                  </div>
                  <span
                    className={`w-12 shrink-0 text-right text-sm font-bold ${i === 0 ? "text-[color:var(--color-reel-rose)]" : "text-white/70"}`}
                  >
                    {sym}
                    {c.avg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-white/40">
          All numbers are anonymous, from real dates logged by the community.
        </p>
      </div>
    </AppShell>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3 text-center">
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${accent ? "text-[color:var(--color-reel-rose)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
