import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuthState, openAuthModal } from "@/lib/auth";
import { useDatePlanStore, venuesForCity, ensureCityVenues } from "@/lib/dateplan/store";
import {
  loadSharedPlan,
  saveSharedSteps,
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

  // ── Login gate (recipient must sign in — like needing the app to open a chat) ──
  if (!isReal) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-4xl">💌</p>
          <h1 className="mt-3 text-xl font-bold">Someone planned a date for you</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Sign in to open the plan — you'll be able to see where you're going and tweak anything
            you like.
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
  const { venues } = useDatePlanStore();
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSwap, setOpenSwap] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadSharedPlan(id);
      if (!alive) return;
      setPlan(p);
      setLoading(false);
      if (p) ensureCityVenues(p.city); // load alternatives for swapping (auto-cities)
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // `venues` is a trigger: recompute alternatives once the store finishes loading
  // this city's venues (venuesForCity reads module state, not the array directly).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cityVenues = useMemo(() => (plan ? venuesForCity(plan.city) : []), [plan, venues]);

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
    setPlan({ ...plan, steps });
    setOpenSwap(null);
    const ok = await saveSharedSteps(id, steps);
    if (!ok) toast.error("Couldn't save the change — try again.");
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
      <div className="text-center mb-6">
        <p className="text-3xl">💌</p>
        <h1 className="mt-2 text-2xl font-bold">
          {plan.ownerName ? `${plan.ownerName} planned a date` : "A date, planned for you"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          in {plan.city} · tweak anything you like
        </p>
      </div>

      {plan.weatherBanner && (
        <p className="text-sm rounded-xl bg-muted px-3 py-2 mb-5 text-center">
          {plan.weatherBanner}
        </p>
      )}

      <ol className="relative ml-3 border-l border-border/70 pl-6 space-y-5">
        {plan.steps.map((s) => {
          const alts = s.venue
            ? cityVenues.filter((v) => v.kind === s.venue!.kind && v.id !== s.venue!.id)
            : [];
          return (
            <li key={s.order} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-background" />
              {s.timeLabel && (
                <div className="text-xs font-mono text-muted-foreground mb-1">{s.timeLabel}</div>
              )}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">
                    <span className="mr-1.5">{s.emoji}</span>
                    {s.title}
                  </h3>
                  <span className="text-xs text-muted-foreground shrink-0">{s.minutes} min</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.scene}</p>
                {s.venue && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {s.venue.rating != null && (
                      <span className="text-amber-500 font-semibold">
                        ★ {s.venue.rating.toFixed(1)}
                      </span>
                    )}
                    {s.venue.area && (
                      <span className="text-muted-foreground">📍 {s.venue.area}</span>
                    )}
                    {alts.length > 0 && (
                      <button
                        onClick={() => setOpenSwap(openSwap === s.order ? null : s.order)}
                        className="text-primary hover:underline font-medium"
                      >
                        {openSwap === s.order ? "close" : "swap ↺"}
                      </button>
                    )}
                  </div>
                )}

                {openSwap === s.order && alts.length > 0 && (
                  <div className="mt-3 rounded-xl border border-border bg-background/50 p-2 space-y-1">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground px-1">
                      Prefer somewhere else?
                    </p>
                    {alts.slice(0, 6).map((v) => (
                      <button
                        key={v.id}
                        onClick={() => swap(s.order, v)}
                        className="w-full text-left rounded-lg px-2.5 py-2 text-sm hover:bg-muted transition flex items-center justify-between gap-2"
                      >
                        <span>{v.name}</span>
                        {v.area && <span className="text-xs text-muted-foreground">{v.area}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Want to plan your own?{" "}
        <Link to="/plan" className="text-primary hover:underline">
          Make a date plan →
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>;
}
