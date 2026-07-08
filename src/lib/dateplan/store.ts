import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { ensureAuth } from "../datedata/store";
import { seedDresdenVenues } from "./templates";
import type { Venue, VenueKind, TimeOfDay, AgeRange, Move } from "./types";

// Just the plan fields a review needs — decoupled from PlanInput (which also
// carries budget/currency the review doesn't record).
export interface ReviewContext {
  partnerName: string;
  city: string;
  timeOfDay: TimeOfDay;
  ageRange: AgeRange;
}

// ── Venue store (module singleton, same pattern as the ledger store) ──────────
let _venues: Venue[] = seedDresdenVenues(); // instant, never blank
let _loaded = false;
let _loading = false;
let _isAdmin = false;
let _adminChecked = false;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVenue(r: any): Venue {
  return {
    id: r.id,
    city: r.city,
    name: r.name,
    kind: r.kind,
    priceTier: r.price_tier ?? undefined,
    rating: r.rating ?? undefined,
    vibeTags: r.vibe_tags ?? [],
    goodFor: r.good_for ?? [],
    area: r.area ?? undefined,
    lat: r.lat ?? undefined,
    lon: r.lon ?? undefined,
    note: r.note ?? undefined,
    seed: false,
  };
}

async function load() {
  if (_loaded || _loading || typeof window === "undefined") return;
  _loading = true;
  try {
    const { data, error } = await supabase.from("venues").select("*").limit(2000);
    if (!error && data) {
      // Curated rows replace starters only for the exact city+KIND they cover.
      // A category the owner hasn't curated yet keeps its starter so the plan
      // still shows a named venue instead of "a great local bar".
      const curated = data.map(rowToVenue);
      const covered = new Set(curated.map((v) => `${v.city.toLowerCase()}|${v.kind}`));
      const seedKept = seedDresdenVenues().filter(
        (v) => !covered.has(`${v.city.toLowerCase()}|${v.kind}`),
      );
      _venues = [...curated, ...seedKept];
      _loaded = true;
      emit();
    }
  } catch (err) {
    console.warn("[dateplan] venue load failed (using seed):", err);
  } finally {
    _loading = false;
  }
  await checkAdmin();
}

async function checkAdmin() {
  if (_adminChecked || typeof window === "undefined") return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email;
    if (email) {
      const { data } = await supabase
        .from("admins")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      _isAdmin = !!data;
    }
  } catch {
    /* not admin */
  }
  _adminChecked = true;
  emit();
}

export function getVenues(): Venue[] {
  return _venues;
}
export function venuesForCity(city: string): Venue[] {
  const key = city.trim().toLowerCase();
  return _venues.filter((v) => v.city.toLowerCase() === key);
}

// Cities whose venues are auto-imported server-side rather than hand-curated.
const AUTO_CITIES = new Set(["berlin"]);

// For an auto-import city, ensure its venues are loaded — fetching once from
// /api/venues (which caches into Supabase) if we don't already have them. Other
// cities are unaffected and keep the existing (curated/seed) behaviour.
export async function ensureCityVenues(city: string): Promise<void> {
  if (typeof window === "undefined") return;
  const key = city.trim().toLowerCase();
  if (!AUTO_CITIES.has(key)) return;
  if (_venues.some((v) => v.city.toLowerCase() === key && !v.seed)) return;
  try {
    const res = await fetch(`/api/venues?city=${encodeURIComponent(city)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { venues?: Venue[] };
    if (data.venues && data.venues.length) {
      _venues = [...data.venues, ..._venues];
      emit();
    }
  } catch {
    /* network/provider error — falls back to the generic template */
  }
}

// ── Admin writes ──────────────────────────────────────────────────────────────
export interface VenueDraft {
  city: string;
  name: string;
  kind: VenueKind;
  priceTier?: number;
  rating?: number;
  vibeTags: string[];
  goodFor: TimeOfDay[];
  area?: string;
  lat?: number;
  lon?: number;
  note?: string;
}

export async function addVenue(d: VenueDraft): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined") return { ok: false };
  await ensureAuth();
  const { data, error } = await supabase
    .from("venues")
    .insert({
      city: d.city.trim(),
      name: d.name.trim(),
      kind: d.kind,
      price_tier: d.priceTier ?? null,
      rating: d.rating ?? null,
      vibe_tags: d.vibeTags,
      good_for: d.goodFor,
      area: d.area?.trim() || null,
      lat: d.lat ?? null,
      lon: d.lon ?? null,
      note: d.note?.trim() || null,
    })
    .select()
    .single();
  if (error) {
    const msg = /row-level security|permission/i.test(error.message)
      ? "Not authorized — add your login email to the admins table first."
      : /does not exist|schema cache/i.test(error.message)
        ? "venues table not found — run migration_dateplan.sql in Supabase."
        : error.message;
    return { ok: false, error: msg };
  }
  // Drop only the starter of the SAME city+kind (keep starters for other
  // categories so their stops still get a named venue), then prepend the real row.
  const cityKind = `${d.city.trim().toLowerCase()}|${d.kind}`;
  _venues = [
    rowToVenue(data),
    ..._venues.filter((v) => !(v.seed && `${v.city.toLowerCase()}|${v.kind}` === cityKind)),
  ];
  emit();
  return { ok: true };
}

export async function deleteVenue(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  await supabase.from("venues").delete().eq("id", id);
  _venues = _venues.filter((v) => v.id !== id);
  emit();
}

// ── Post-date review (the outcome loop) ───────────────────────────────────────
export interface ReviewDraft {
  input: ReviewContext;
  chosenMove?: Move;
  wentWell: number; // 1–5
  gotSecond?: "yes" | "no" | "maybe";
  note?: string;
}

export async function submitReview(r: ReviewDraft): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined") return { ok: false };
  const userId = await ensureAuth();
  const { error } = await supabase.from("plan_reviews").insert({
    user_id: userId,
    city: r.input.city.trim(),
    partner_name: r.input.partnerName.trim() || null,
    time_of_day: r.input.timeOfDay,
    age_range: r.input.ageRange,
    chosen_move: r.chosenMove?.id ?? null,
    went_well: r.wentWell,
    got_second: r.gotSecond ?? null,
    note: r.note?.trim() || null,
  });
  if (error) {
    const msg = /does not exist|schema cache/i.test(error.message)
      ? "plan_reviews table not found — run migration_dateplan.sql in Supabase."
      : error.message;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDatePlanStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (!_loaded && !_loading) load();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { venues: _venues, isAdmin: _isAdmin };
}
