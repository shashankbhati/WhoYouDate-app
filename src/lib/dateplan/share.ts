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
export type SharedStatus = "pending" | "changed" | "accepted";
export interface SharedMessage {
  actor: string; // display name
  text: string;
  at: string; // ISO
  owner: boolean; // true = sent by the plan's owner
}
export interface SharedPlan {
  id: string;
  ownerId: string;
  ownerName?: string;
  city: string;
  date?: string; // the actual date of the date (yyyy-mm-dd)
  weatherBanner?: string;
  steps: SharedStep[];
  status: SharedStatus;
  messages: SharedMessage[];
  lastActor?: string;
  updatedAt?: string;
  ownerSeenAt?: string;
  recipientId?: string; // who opened the plan (the date), if a logged-in non-owner
  recipientName?: string; // their chosen display name — for the owner's inbox
  recipientSeenAt?: string; // recipient's "seen" stamp — powers their unread dot
  reactions?: Reactions; // per-stop reactions: order → { o?: emoji, r?: emoji }
}

// stop order (as string) → the owner's (o) and recipient's (r) chosen emoji
export type Reactions = Record<string, { o?: string; r?: string }>;

const MAX_MESSAGES = 30; // embedded thread cap — one row, never a chat table

// Fire-and-forget: ask the server to push the OTHER party on this plan. No-ops if
// the viewer is logged out or push isn't configured (endpoint returns skipped).
async function notifyOther(
  planId: string,
  kind: "message" | "accept" | "react" | "change",
  text?: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    void fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ planId, kind, text }),
    }).catch(() => {});
  } catch {
    /* never block the UI on a notification */
  }
}

// The name the user chose for themselves (their profile display name / username).
async function displayNameFor(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.display_name ?? "").toString().trim();
}

// Who's viewing (id + best display name), for attributing edits/messages. Prefer
// the name they set in their profile, never the raw email.
async function whoAmI(): Promise<{ id: string; name: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const name =
    (await displayNameFor(user.id)) ||
    (user.user_metadata?.full_name || user.user_metadata?.name || "").toString().trim() ||
    (user.email ? user.email.split("@")[0] : "Someone");
  return { id: user.id, name };
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
  planDate?: string,
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
    (await displayNameFor(user.id)) ||
    (user.user_metadata?.full_name || user.user_metadata?.name || "").toString().trim() ||
    null;
  // Include plan_date if the column exists; retry without it if the comms
  // migration hasn't been run yet, so sharing still works.
  const base = {
    id,
    owner_id: user.id,
    owner_name: ownerName,
    city: plan.city,
    weather_banner: plan.weatherBanner ?? null,
    steps: sanitize(plan),
  };
  let error = (await supabase.from("shared_plans").insert({ ...base, plan_date: planDate ?? null }))
    .error;
  if (error && /plan_date/.test(error.message)) {
    error = (await supabase.from("shared_plans").insert(base)).error;
  }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToShared(data: any): SharedPlan {
  return {
    id: data.id,
    ownerId: data.owner_id,
    ownerName: data.owner_name ?? undefined,
    city: data.city,
    date: data.plan_date ?? undefined,
    weatherBanner: data.weather_banner ?? undefined,
    steps: (data.steps ?? []) as SharedStep[],
    status: (data.status ?? "pending") as SharedStatus,
    messages: (data.messages ?? []) as SharedMessage[],
    lastActor: data.last_actor ?? undefined,
    updatedAt: data.updated_at ?? undefined,
    ownerSeenAt: data.owner_seen_at ?? undefined,
    recipientId: data.recipient_id ?? undefined,
    recipientName: data.recipient_name ?? undefined,
    recipientSeenAt: data.recipient_seen_at ?? undefined,
    reactions: (data.reactions ?? {}) as Reactions,
  };
}

export async function loadSharedPlan(id: string): Promise<SharedPlan | null> {
  const { data } = await supabase.from("shared_plans").select("*").eq("id", id).maybeSingle();
  return data ? rowToShared(data) : null;
}

// The owner's inbox: every plan they've shared, newest activity first.
export async function listMySharedPlans(): Promise<SharedPlan[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("shared_plans")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(rowToShared);
}

// The recipient's inbox: plans shared WITH me (that I've opened), newest first.
export async function listReceivedSharedPlans(): Promise<SharedPlan[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("shared_plans")
    .select("*")
    .eq("recipient_id", user.id)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(rowToShared);
}

// Record who opened the plan (first logged-in non-owner viewer), so the owner's
// inbox can show a name. Written once — never overwrites an existing recipient.
// Ignores errors (e.g. the recipient columns not migrated yet).
export async function markRecipient(id: string, userId: string, name: string): Promise<void> {
  await supabase
    .from("shared_plans")
    .update({ recipient_id: userId, recipient_name: name })
    .eq("id", id)
    .is("recipient_id", null);
}

// Save the whole reactions map + stamp who did it, so the other side is notified.
export async function setReactions(
  id: string,
  reactions: Reactions,
  actorName: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("shared_plans")
    .update({ reactions, last_actor: actorName, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) void notifyOther(id, "react");
  return !error;
}

// Recipient opened the plan → clear their "new update" indicator.
export async function markRecipientSeen(id: string): Promise<void> {
  await supabase
    .from("shared_plans")
    .update({ recipient_seen_at: new Date().toISOString() })
    .eq("id", id);
}

// Save an edit (e.g. a venue swap) + stamp who did it, so the other side sees it.
export async function saveSharedSteps(
  id: string,
  steps: SharedStep[],
  actorName: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("shared_plans")
    .update({
      steps,
      status: "changed",
      last_actor: actorName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (!error) void notifyOther(id, "change");
  return !error;
}

// Recipient accepts the plan.
export async function acceptSharedPlan(id: string): Promise<boolean> {
  const me = await whoAmI();
  const { error } = await supabase
    .from("shared_plans")
    .update({
      status: "accepted",
      last_actor: me?.name ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (!error) void notifyOther(id, "accept");
  return !error;
}

// Append a short message to the embedded thread (capped, single row).
export async function postSharedMessage(
  id: string,
  text: string,
  isOwner: boolean,
): Promise<SharedMessage[] | null> {
  const me = await whoAmI();
  const { data } = await supabase
    .from("shared_plans")
    .select("messages")
    .eq("id", id)
    .maybeSingle();
  const current = ((data?.messages ?? []) as SharedMessage[]).slice(-MAX_MESSAGES + 1);
  const msg: SharedMessage = {
    actor: me?.name ?? "Someone",
    text: text.slice(0, 240),
    at: new Date().toISOString(),
    owner: isOwner,
  };
  const messages = [...current, msg];
  const { error } = await supabase
    .from("shared_plans")
    .update({ messages, last_actor: msg.actor, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (!error) void notifyOther(id, "message", text);
  return error ? null : messages;
}

// Owner opened the plan → clear their "new update" indicator.
export async function markOwnerSeen(id: string): Promise<void> {
  await supabase
    .from("shared_plans")
    .update({ owner_seen_at: new Date().toISOString() })
    .eq("id", id);
}

// Live updates: the other side's edits/messages/accept arrive without a refresh.
export function subscribeSharedPlan(id: string, onChange: (p: SharedPlan) => void): () => void {
  const ch = supabase
    .channel(`shared_plan_${id}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "shared_plans", filter: `id=eq.${id}` },
      (payload) => onChange(rowToShared(payload.new)),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

export { whoAmI };
