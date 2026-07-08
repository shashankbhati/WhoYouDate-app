import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// Auto-import venues for supported cities from Foursquare, cache them in
// Supabase, and serve from cache thereafter. Called by the client the first
// time someone plans a date in a supported city; idempotent and rate-safe.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_URL (or VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   (server-only, bypasses RLS to write venues)
//   FOURSQUARE_API_KEY          (Foursquare *Service* API Key — used as a Bearer
//                                token against the new places-api.foursquare.com)
//
// Whitelist keeps API cost bounded: only these cities can be fetched, so nobody
// can rack up calls by requesting arbitrary cities.
// ============================================================

const SUPPORTED: Record<string, { near: string }> = {
  berlin: { near: "Berlin, Germany" },
};

// Refresh cadence — venues barely change, and Foursquare's terms expect refresh
// rather than permanent storage. 25 days keeps us well within that.
const MAX_AGE_MS = 25 * 24 * 60 * 60 * 1000;

// Our roadmap slots → a Foursquare free-text query + when the venue fits.
// (Free-text `query` is more robust than category IDs, which change.)
const KINDS: { kind: string; query: string; goodFor: string[] }[] = [
  { kind: "cafe", query: "coffee", goodFor: ["morning", "afternoon"] },
  { kind: "bar", query: "cocktail bar", goodFor: ["evening", "night"] },
  { kind: "restaurant", query: "restaurant", goodFor: ["evening", "night"] },
  { kind: "dessert", query: "ice cream dessert", goodFor: ["afternoon", "evening"] },
  { kind: "activity", query: "billiards bowling", goodFor: ["evening", "night"] },
];

interface FsqPlace {
  name?: string;
  rating?: number; // 0–10
  price?: number; // 1–4
  latitude?: number; // new API may return coords flat…
  longitude?: number;
  location?: { neighborhood?: string[]; locality?: string; region?: string };
  geocodes?: { main?: { latitude?: number; longitude?: number } }; // …or nested
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

interface KindResult {
  rows: Record<string, unknown>[];
  err?: { status: number; body: string };
}

async function fetchKind(
  near: string,
  q: { kind: string; query: string; goodFor: string[] },
  key: string,
): Promise<KindResult> {
  // New Foursquare Places API (the old api.foursquare.com/v3 was retired May 2026).
  // Only free/core fields — `rating` and `price` are Premium and require paid
  // credits (they 429 the whole call on the free tier). We keep parsing them in
  // case billing is enabled later, but don't request them by default.
  const url =
    `https://places-api.foursquare.com/places/search?near=${encodeURIComponent(near)}` +
    `&query=${encodeURIComponent(q.query)}&limit=10` +
    `&fields=${encodeURIComponent("name,location,geocodes")}`;
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
      city: "Berlin",
      name,
      kind: q.kind,
      // Foursquare rates 0–10; our scale is 0–5.
      rating: p.rating != null ? Math.round((p.rating / 2) * 10) / 10 : null,
      price_tier: p.price ?? null,
      vibe_tags: [],
      good_for: q.goodFor,
      area: p.location?.neighborhood?.[0] ?? p.location?.locality ?? p.location?.region ?? null,
      lat: p.geocodes?.main?.latitude ?? p.latitude ?? null,
      lon: p.geocodes?.main?.longitude ?? p.longitude ?? null,
      note: null,
      source: "foursquare",
    });
  }
  return { rows: out };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cityParam = String(req.query.city ?? "")
    .trim()
    .toLowerCase();
  const supported = SUPPORTED[cityParam];
  if (!supported) return res.status(400).json({ error: "City not supported" });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fsqKey = process.env.FOURSQUARE_API_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: "Missing Supabase env" });
  const db = createClient(supabaseUrl, serviceKey);

  // Serve from cache if we have fresh auto-imported venues for this city.
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data: fresh } = await db
    .from("venues")
    .select("*")
    .ilike("city", cityParam)
    .eq("source", "foursquare")
    .gte("created_at", cutoff);
  if (fresh && fresh.length > 0) {
    return res.status(200).json({ venues: fresh.map(rowToVenue), cached: true });
  }

  if (!fsqKey) return res.status(500).json({ error: "Missing FOURSQUARE_API_KEY" });

  // Fetch fresh from Foursquare.
  let batches: KindResult[] = [];
  try {
    batches = await Promise.all(KINDS.map((k) => fetchKind(supported.near, k, fsqKey)));
  } catch (err) {
    return res.status(502).json({ error: "Provider fetch threw", detail: String(err) });
  }
  const rows = batches.flatMap((b) => b.rows);
  if (rows.length === 0) {
    // Surface Foursquare's actual response so we can see auth/version/param issues.
    const firstErr = batches.find((b) => b.err)?.err ?? null;
    return res.status(502).json({ error: "No venues returned", provider: firstErr });
  }

  // Replace this city's previous auto rows, then insert the fresh set.
  await db.from("venues").delete().ilike("city", cityParam).eq("source", "foursquare");
  const { data: inserted, error } = await db.from("venues").insert(rows).select();
  if (error) {
    // `source` column missing → migration not run yet.
    const msg = /source/.test(error.message)
      ? "Run migration_venues_source.sql in Supabase first."
      : error.message;
    return res.status(500).json({ error: msg });
  }

  return res.status(200).json({ venues: (inserted ?? []).map(rowToVenue), cached: false });
}
