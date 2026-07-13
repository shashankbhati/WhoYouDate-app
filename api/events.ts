import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================================
// Live events near a date — concerts, shows, sports — via the Ticketmaster
// Discovery API. Suggested in the planner so a date can ride a real event.
// Dormant (returns []) until TICKETMASTER_API_KEY is set, so the UI just hides.
//
// Env: TICKETMASTER_API_KEY (free — developer.ticketmaster.com).
// ============================================================

export const config = { maxDuration: 15 };

const KEY = process.env.TICKETMASTER_API_KEY || "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simplify(e: any) {
  return {
    id: e.id as string,
    name: e.name as string,
    url: e.url as string | undefined,
    date: e?.dates?.start?.localDate as string | undefined,
    time: (e?.dates?.start?.localTime as string | undefined)?.slice(0, 5),
    venue: e?._embedded?.venues?.[0]?.name as string | undefined,
    segment: e?.classifications?.[0]?.segment?.name as string | undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const city = String(req.query.city || "").trim();
  const date = String(req.query.date || "").trim();
  if (!KEY) return res.status(200).json({ ok: true, events: [], skipped: "no-key" });
  if (!city) return res.status(400).json({ ok: false, events: [] });

  const params = new URLSearchParams({ apikey: KEY, city, size: "10", sort: "date,asc" });
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Local date window (UTC bounds are close enough for suggestion purposes).
    params.set("startDateTime", `${date}T00:00:00Z`);
    params.set("endDateTime", `${date}T23:59:59Z`);
  }

  try {
    const r = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
    );
    if (!r.ok) return res.status(200).json({ ok: true, events: [] });
    const data = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (data?._embedded?.events ?? []) as any[];
    const events = raw.slice(0, 6).map(simplify);
    // Cache at the CDN so we don't hammer Ticketmaster for the same city/date.
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ ok: true, events });
  } catch {
    return res.status(200).json({ ok: true, events: [] });
  }
}
