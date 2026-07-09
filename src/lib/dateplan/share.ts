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

// Create a shareable link. Requires a real (non-anonymous) login.
export async function sharePlan(
  plan: DatePlan,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (typeof window === "undefined") return { ok: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "login" };

  const ownerName =
    (user.user_metadata?.full_name || user.user_metadata?.name || "").toString().trim() || null;
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  const { error } = await supabase.from("shared_plans").insert({
    id,
    owner_id: user.id,
    owner_name: ownerName,
    city: plan.city,
    weather_banner: plan.weatherBanner ?? null,
    steps: sanitize(plan),
  });
  if (error) {
    const msg = /does not exist|schema cache/i.test(error.message)
      ? "shared_plans table not found — run migration_shared_plans.sql in Supabase."
      : error.message;
    return { ok: false, error: msg };
  }
  return { ok: true, url: `${window.location.origin}/p/${id}` };
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
