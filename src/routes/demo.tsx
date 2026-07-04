import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/datedata/store";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Tap-a-name demo" }] }),
  component: Demo,
});

function Demo() {
  const { entries } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  // Most-logged names — these become tappable (that's the whole change)
  const names = useMemo(() => {
    const m: Record<string, number> = {};
    entries.forEach((e) => { m[e.partnerName] = (m[e.partnerName] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n);
  }, [entries]);

  const stat = useMemo(() => {
    if (!selected) return null;
    const rows = entries.filter((e) => e.partnerName.toLowerCase() === selected.toLowerCase());
    if (rows.length === 0) return null;
    const count = rows.length;
    return {
      count,
      avg: rows.reduce((a, e) => a + e.amountCents, 0) / count,
      happy: rows.filter((e) => e.mood >= 4).length / count,
      second: rows.filter((e) => e.secondDate && e.secondDate !== "no").length / count,
      mood: rows.reduce((a, e) => a + e.mood, 0) / count,
    };
  }, [entries, selected]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted-foreground mb-3">
        <Link to="/" className="hover:text-foreground">← home</Link> · demo preview (not live yet)
      </p>
      <h1 className="text-2xl font-bold">Tap a name 👆</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-6">
        The change: names become tappable buttons — no typing. Tap one to instantly see what dating them is like.
      </p>

      {/* ↓↓↓ THE ACTUAL CHANGE: names as tap buttons ↓↓↓ */}
      <div className="flex flex-wrap gap-2">
        {names.map((n) => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            className={`px-4 py-2 rounded-full border text-sm font-semibold transition ${selected === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary hover:text-primary"}`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Result appears on tap */}
      {selected && stat ? (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-bold text-lg">Dating {selected}</h2>
          <p className="text-xs text-muted-foreground mb-4">{stat.count} dates logged by the community</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DemoStat label="Avg / date" value={`€${(stat.avg / 100).toFixed(0)}`} />
            <DemoStat label="Happy rate" value={`${Math.round(stat.happy * 100)}%`} />
            <DemoStat label="2nd date" value={`${Math.round(stat.second * 100)}%`} />
            <DemoStat label="Avg mood" value={`${stat.mood.toFixed(1)}/5`} />
          </div>
          <button className="mt-5 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition">
            Curious how YOU compare? Log your last date →
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          👆 tap any name above
        </div>
      )}
    </main>
  );
}

function DemoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
