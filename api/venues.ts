import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// Auto-import venues for whitelisted cities and cache them in Supabase.
//   • Cafés/bars/restaurants/dessert/activity  → Foursquare (new Places API)
//   • Walk landmarks (parks, viewpoints, rivers) → OpenStreetMap / Overpass (free)
// The whitelist lives in the `plan_cities` table (managed in /plan-admin), so new
// cities need no code change. Called by the client the first time someone plans a
// date in a supported city; idempotent, cached ~25 days, rate-safe.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//      FOURSQUARE_API_KEY (Service API key → Bearer on places-api.foursquare.com).
// ============================================================

export const config = { maxDuration: 30 };

const MAX_AGE_MS = 25 * 24 * 60 * 60 * 1000;

const KINDS: { kind: string; query: string; goodFor: string[] }[] = [
  { kind: "cafe", query: "coffee", goodFor: ["morning", "afternoon"] },
  { kind: "bar", query: "cocktail bar", goodFor: ["evening", "night"] },
  { kind: "restaurant", query: "restaurant", goodFor: ["evening", "night"] },
  { kind: "dessert", query: "ice cream dessert", goodFor: ["afternoon", "evening"] },
  { kind: "activity", query: "billiards bowling", goodFor: ["evening", "night"] },
];

const ALL_TIMES = ["morning", "afternoon", "evening", "night"];

interface FsqPlace {
  name?: string;
  latitude?: number;
  longitude?: number;
  location?: { neighborhood?: string[]; locality?: string; region?: string };
}
interface KindResult {
  rows: Record<string, unknown>[];
  err?: { status: number; body: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVenue(r: any) {
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

// ── Foursquare (paid-free core fields only: name, location, coords) ───────────
async function fetchKind(
  city: string,
  near: string,
  q: { kind: string; query: string; goodFor: string[] },
  key: string,
): Promise<KindResult> {
  const url =
    `https://places-api.foursquare.com/places/search?near=${encodeURIComponent(near)}` +
    `&query=${encodeURIComponent(q.query)}&limit=10` +
    `&fields=${encodeURIComponent("name,location,latitude,longitude")}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Places-Api-Version": "2025-02-05",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { rows: [], err: { status: res.status, body: body.slice(0, 400) } };
  }
  const data = (await res.json()) as { results?: FsqPlace[] };
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const p of data.results ?? []) {
    const name = p.name?.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      city,
      name,
      kind: q.kind,
      rating: null, // Premium field — omitted on the free tier
      price_tier: null,
      vibe_tags: [],
      good_for: q.goodFor,
      area: p.location?.neighborhood?.[0] ?? p.location?.locality ?? p.location?.region ?? null,
      lat: p.latitude ?? null,
      lon: p.longitude ?? null,
      note: null,
      source: "foursquare",
    });
  }
  return { rows: out };
}

// ── OpenStreetMap / Overpass (free landmarks: parks, viewpoints, rivers) ──────
interface OverpassEl {
  tags?: { name?: string; leisure?: string; tourism?: string; waterway?: string };
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
}
async function fetchOsm(
  city: string,
  lat: number,
  lon: number,
): Promise<{ rows: Record<string, unknown>[]; note?: string }> {
  // A bounding box (~7 km) uses Overpass's spatial index and returns in <1s —
  // an `around:radius` query does per-element distance math and takes 15s+.
  const dLat = 0.035;
  const dLon = 0.05;
  const bbox =
    `${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},` +
    `${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)}`;
  const q =
    `[out:json][timeout:20];(` +
    `way["leisure"="park"]["name"](${bbox});` +
    `node["tourism"="viewpoint"]["name"](${bbox});` +
    `);out center 25;`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000); // plenty for a bbox query
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: q,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { rows: [], note: `http ${res.status}: ${body.slice(0, 120)}` };
    }
    const data = (await res.json()) as { elements?: OverpassEl[] };
    const seen = new Set<string>();
    const out: Record<string, unknown>[] = [];
    for (const el of data.elements ?? []) {
      const name = el.tags?.name?.trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      const kind = el.tags?.tourism === "viewpoint" ? "view" : el.tags?.waterway ? "walk" : "park";
      const elat = el.lat ?? el.center?.lat ?? null;
      const elon = el.lon ?? el.center?.lon ?? null;
      seen.add(name.toLowerCase());
      out.push({
        city,
        name,
        kind,
        rating: null,
        price_tier: null,
        vibe_tags: [],
        good_for: ALL_TIMES, // a walk works any time of day
        area: null,
        lat: elat,
        lon: elon,
        note: null,
        source: "osm",
      });
      if (out.length >= 15) break;
    }
    return { rows: out, note: out.length === 0 ? "0 elements" : undefined };
  } catch (err) {
    // best-effort: an OSM failure never blocks the venue import
    return { rows: [], note: `error: ${String(err).slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cityParam = String(req.query.city ?? "")
    .trim()
    .toLowerCase();
  if (!cityParam) return res.status(400).json({ error: "Missing city" });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: "Missing Supabase env" });
  const db = createClient(supabaseUrl, serviceKey);

  // Whitelist check (admin-managed table, not code).
  const { data: cityRow } = await db
    .from("plan_cities")
    .select("*")
    .ilike("city", cityParam)
    .eq("enabled", true)
    .maybeSingle();
  if (!cityRow) return res.status(400).json({ error: "City not supported" });
  const displayCity: string = cityRow.city;

  // Serve from cache if we already have fresh auto rows for this city.
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data: fresh } = await db
    .from("venues")
    .select("*")
    .ilike("city", displayCity)
    .in("source", ["foursquare", "osm"])
    .gte("created_at", cutoff);
  if (fresh && fresh.length > 0) {
    const landmarks = fresh.filter((r) => r.source === "osm").length;
    return res.status(200).json({ venues: fresh.map(rowToVenue), cached: true, landmarks });
  }

  const fsqKey = process.env.FOURSQUARE_API_KEY;
  if (!fsqKey) return res.status(500).json({ error: "Missing FOURSQUARE_API_KEY" });

  // Fetch venues (Foursquare) and landmarks (OSM) in parallel.
  const emptyOsm = {
    rows: [] as Record<string, unknown>[],
    note: "no coords" as string | undefined,
  };
  const [batches, osm] = await Promise.all([
    Promise.all(KINDS.map((k) => fetchKind(displayCity, cityRow.near, k, fsqKey))),
    cityRow.lat != null && cityRow.lon != null
      ? fetchOsm(displayCity, cityRow.lat, cityRow.lon)
      : Promise.resolve(emptyOsm),
  ]);

  const rows = [...batches.flatMap((b) => b.rows), ...osm.rows];
  if (rows.length === 0) {
    const firstErr = batches.find((b) => b.err)?.err ?? null;
    return res.status(502).json({ error: "No venues returned", provider: firstErr });
  }

  // Replace this city's previous auto rows, then insert the fresh set.
  await db.from("venues").delete().ilike("city", displayCity).in("source", ["foursquare", "osm"]);
  const { data: inserted, error } = await db.from("venues").insert(rows).select();
  if (error) {
    const msg = /source/.test(error.message)
      ? "Run migration_venues_source.sql in Supabase first."
      : error.message;
    return res.status(500).json({ error: msg });
  }

  return res.status(200).json({
    venues: (inserted ?? []).map(rowToVenue),
    cached: false,
    landmarks: osm.rows.length,
    osmNote: osm.note ?? null,
  });
}
