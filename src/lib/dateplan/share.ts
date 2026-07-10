import { supabase } from "../supabase";
import type { DatePlan, RoadmapStop, VenueKind } from "./types";

// ── Shareable plans ───────────────────────────────────────────────────────────
// We persist ONLY the sanitized itinerary — venues, timing, weather. Price, the
// conversation questions, and the risk/reward moves are stripped before saving,
// so a recipient can never recover the sender's private prep.

export interface SharedVenue {
  id: string;
  name: string;
  kind: VenueKind;
  area?: string;
  rating?: number;
}
export interface SharedStep {
  order: number;
  emoji: string;
  title: string;
  scene: string;
  timeLabel?: string;
  minutes: number;
  venue?: SharedVenue;
}
export interface SharedPlan {
  id: string;
  ownerId: string;
  ownerName?: string;
  city: string;
  weatherBanner?: string;
  steps: SharedStep[];
}

function sanitize(plan: DatePlan): SharedStep[] {
  return plan.steps
    .filter((s): s is RoadmapStop => s.type === "stop") // drops decision/move steps
    .map((s, i) => ({
      order: i + 1,
      emoji: s.emoji,
      title: s.title,
      scene: s.scene,
      timeLabel: s.timeLabel,
      minutes: s.minutes,
      // note: estCents and questions are intentionally NOT copied
      venue: s.venue
        ? {
            id: s.venue.id,
            name: s.venue.name,
            kind: s.venue.kind,
            area: s.venue.area,
            rating: s.venue.rating,
          }
        : undefined,
    }));
}

// A stable short id from a string — same input always yields the same id, so
// re-sharing the same plan reuses the same link instead of minting new ones.
function stableId(s: string): string {
  let h1 = 2166136261;
  let h2 = 5381;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 = (Math.imul(h2, 33) ^ c) >>> 0;
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

// Create (or reuse) a shareable link for a plan. Idempotent: the same plan maps
// to the same link, and clicking Share again just returns it — no duplicate rows,
// and any edits the recipient made are preserved. `planKey` identifies the plan
// (its inputs + variant). Requires a real (non-anonymous) login.
export async function sharePlan(
  plan: DatePlan,
  planKey: string,
): Promise<{ ok: boolean; url?: string; error?: string; reused?: boolean }> {
  if (typeof window === "undefined") return { ok: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "login" };

  const id = stableId(`${user.id}|${planKey}`);
  const url = `${window.location.origin}/p/${id}`;

  // Already shared this exact plan → hand back the same link untouched.
  const { data: existing } = await supabase
    .from("shared_plans")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existing) return { ok: true, url, reused: true };

  const ownerName =
    (user.user_metadata?.full_name || user.user_metadata?.name || "").toString().trim() || null;
  const { error } = await supabase.from("shared_plans").insert({
    id,
    owner_id: user.id,
    owner_name: ownerName,
    city: plan.city,
    weather_banner: plan.weatherBanner ?? null,
    steps: sanitize(plan),
  });
  if (error) {
    // A concurrent double-click may race to the same id — treat as reuse.
    if ((error as { code?: string }).code === "23505") return { ok: true, url, reused: true };
    const msg = /does not exist|schema cache/i.test(error.message)
      ? "shared_plans table not found — run migration_shared_plans.sql in Supabase."
      : error.message;
    return { ok: false, error: msg };
  }
  return { ok: true, url, reused: false };
}

export async function loadSharedPlan(id: string): Promise<SharedPlan | null> {
  const { data } = await supabase.from("shared_plans").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    ownerId: data.owner_id,
    ownerName: data.owner_name ?? undefined,
    city: data.city,
    weatherBanner: data.weather_banner ?? undefined,
    steps: (data.steps ?? []) as SharedStep[],
  };
}

export async function saveSharedSteps(id: string, steps: SharedStep[]): Promise<boolean> {
  const { error } = await supabase.from("shared_plans").update({ steps }).eq("id", id);
  return !error;
}
