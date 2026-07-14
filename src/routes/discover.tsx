import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, AppLoading } from "@/components/AppShell";
import { useStore } from "@/lib/datedata/store";
import { getCountry } from "@/lib/country";
import { COUNTRY_CONFIG, type CountryCode } from "@/lib/datedata/countries";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover dating costs | WhoAmIDating" },
      {
        name: "description",
        content:
          "Search any first name to see what the community really spends on dates, in which cities — and the costliest names.",
      },
    ],
  }),
  component: Discover,
});

const TABS: CountryCode[] = ["all", "DE", "IN", "US"];

function Discover() {
  const { entries, profileChecked } = useStore();
  const [cc, setCc] = useState<CountryCode>(() => getCountry());
  const [q, setQ] = useState("");
  const cfg = COUNTRY_CONFIG[cc];
  const sym = cfg.currencySymbol;

  // Scope entries to the selected country by its cities ("all" = no filter).
  const scoped = useMemo(() => {
    if (cc === "all") return entries;
    const set = new Set(cfg.cities.map((c) => c.toLowerCase()));
    return entries.filter((e) => set.has(e.city.trim().toLowerCase()));
  }, [entries, cc, cfg.cities]);

  const byName = useMemo(() => {
    const m = new Map<string, { total: number; n: number; second: number }>();
    for (const e of scoped) {
      const key = e.partnerName.trim();
      if (!key) continue;
      const cur = m.get(key) ?? { total: 0, n: 0, second: 0 };
      cur.total += e.amountCents;
      cur.n += 1;
      if (e.secondDate && e.secondDate !== "no") cur.second += 1;
      m.set(key, cur);
    }
    return m;
  }, [scoped]);

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
    const cities = new Map<string, { total: number; n: number }>();
    for (const e of scoped) {
      if (e.partnerName.trim().toLowerCase() !== name) continue;
      total += e.amountCents;
      n += 1;
      if (e.secondDate && e.secondDate !== "no") second += 1;
      const cur = cities.get(e.city) ?? { total: 0, n: 0 };
      cur.total += e.amountCents;
      cur.n += 1;
      cities.set(e.city, cur);
    }
    if (n === 0) return { found: false as const };
    const topCities = [...cities.entries()]
      .map(([city, v]) => ({ city, avg: Math.round(v.total / v.n / 100), n: v.n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 4);
    return {
      found: true as const,
      avg: Math.round(total / n / 100),
      n,
      secondPct: Math.round((second / n) * 100),
      topCities,
    };
  }, [q, scoped]);

  if (!profileChecked) return <AppLoading />;

  return (
    <AppShell>
      <div className="px-5 py-6 text-white">
        <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-white/45">
          Discover
        </p>
        <h1 className="[font-family:var(--font-display)] mt-1 text-3xl tracking-wide">
          What dating really costs
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Search any first name — see what the community actually spends, and where.
        </p>

        {/* Country switcher */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((code) => (
            <button
              key={code}
              onClick={() => setCc(code)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                cc === code
                  ? "bg-white text-neutral-950"
                  : "border border-white/15 bg-white/[0.04] text-white/70"
              }`}
            >
              {COUNTRY_CONFIG[code].flag} {COUNTRY_CONFIG[code].label}
            </button>
          ))}
        </div>

        {/* Name lookup */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a first name…"
          className="mt-4 w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />

        {result && (
          <div className="mt-3 rounded-3xl border border-white/10 bg-[color:var(--color-reel-surface)] p-5">
            {result.found ? (
              <>
                <p className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/45">
                  Dating {q.trim()} · {cfg.label}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Mini label="Avg spend" value={`${sym}${result.avg}`} accent />
                  <Mini label="Dates" value={String(result.n)} />
                  <Mini label="2nd date" value={`${result.secondPct}%`} />
                </div>
                {result.topCities.length > 0 && (
                  <div className="mt-3">
                    <p className="[font-family:var(--font-mono)] mb-1.5 text-[9px] uppercase tracking-widest text-white/40">
                      Logged most in
                    </p>
                    <div className="space-y-1.5">
                      {result.topCities.map((c) => (
                        <div key={c.city} className="flex items-center justify-between text-sm">
                          <span className="text-white/85">
                            📍 {c.city}{" "}
                            <span className="text-white/40">
                              · {c.n} date{c.n === 1 ? "" : "s"}
                            </span>
                          </span>
                          <span className="font-semibold">
                            {sym}
                            {c.avg}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.n < 8 && (
                  <p className="mt-3 text-center text-[11px] text-white/40">
                    Thin sample — {result.n} date{result.n === 1 ? "" : "s"} logged so far.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-white/60">
                No data yet for <span className="font-semibold text-white">{q.trim()}</span> in{" "}
                {cfg.label} — try Global, or be the first to log a date.
              </p>
            )}
          </div>
        )}

        {/* Costliest names */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-tight">
            💸 Costliest names · {cfg.label}
          </h2>
          {costliest.length === 0 ? (
            <p className="text-sm text-white/50">Not enough data here yet — try Global.</p>
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
