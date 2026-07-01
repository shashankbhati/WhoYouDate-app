import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// Weekly digest + watch-a-name notification sender.
// Triggered by Vercel Cron (see vercel.json). Secured by CRON_SECRET —
// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`.
//
// Required env vars (set in Vercel → Settings → Environment Variables):
//   SUPABASE_URL                (or VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   (server-only, bypasses RLS)
//   RESEND_API_KEY
//   CRON_SECRET
//   SITE_URL                    (optional, defaults to production URL)
// ============================================================

const SITE_URL = process.env.SITE_URL ?? "https://www.whoamidating.singles";
const FROM = "WhoAmIDating <hello@whoamidating.singles>";
// Lookback window — matches the cron cadence (every 2 days) so each run reports
// only genuinely new activity and never re-notifies about the same entries.
const WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

interface EntryRow { partner_name: string; city: string; amount_cents: number; mood: number; second_date: string | null; activity: string; created_at: string; }
interface SubRow { id: string; email: string; watch_name: string; wants_digest: boolean; unsubscribe_token: string; }

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return res.ok;
}

function unsubFooter(token: string): string {
  return `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="color:#999;font-size:12px">You're getting this because you subscribed on WhoAmIDating.
    <a href="${SITE_URL}/api/unsubscribe?token=${token}" style="color:#e05533">Unsubscribe</a>.</p>`;
}

function digestHtml(opts: { trending: { name: string; count: number }[]; weekCount: number; topActivity: string | null; token: string }): string {
  const list = opts.trending.map((t, i) => `<li><b>${i + 1}. ${t.name}</b> — ${t.count} new date${t.count !== 1 ? "s" : ""}</li>`).join("");
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#e05533">Fresh on WhoAmIDating 💘</h2>
    <p><b>${opts.weekCount}</b> new dates were logged in the last couple days.</p>
    ${opts.trending.length ? `<h3>🔥 Trending names</h3><ul>${list}</ul>` : ""}
    ${opts.topActivity ? `<p>💡 <b>${opts.topActivity}</b> dates are leading to the most second dates right now.</p>` : ""}
    <p><a href="${SITE_URL}" style="display:inline-block;background:#e05533;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600">Search a name →</a></p>
    ${unsubFooter(opts.token)}
  </div>`;
}

function watchHtml(opts: { name: string; count: number; token: string }): string {
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#e05533">New activity for "${opts.name}" 👀</h2>
    <p><b>${opts.count}</b> new date${opts.count !== 1 ? "s were" : " was"} logged recently with someone named <b>${opts.name}</b>.</p>
    <p style="color:#666">Anonymous, as always — never who logged it.</p>
    <p><a href="${SITE_URL}" style="display:inline-block;background:#e05533;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600">See what people say →</a></p>
    ${unsubFooter(opts.token)}
  </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Missing env configuration" });
  }
  const db = createClient(supabaseUrl, serviceKey);

  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  // Entries logged in the window
  const { data: entries } = await db.from("entries").select("partner_name,city,amount_cents,mood,second_date,activity,created_at").gte("created_at", since).limit(5000);
  const week = (entries ?? []) as EntryRow[];

  // Trending names this week (top 5 by count)
  const nameCounts: Record<string, number> = {};
  week.forEach((e) => { const n = e.partner_name; nameCounts[n] = (nameCounts[n] ?? 0) + 1; });
  const trending = Object.entries(nameCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  // Top activity for second dates this week (simple signal for the digest)
  const actAgg: Record<string, { s: number; n: number }> = {};
  week.forEach((e) => { (actAgg[e.activity] ??= { s: 0, n: 0 }); actAgg[e.activity].n++; if (e.second_date && e.second_date !== "no") actAgg[e.activity].s++; });
  const topActivity = Object.entries(actAgg).filter(([, v]) => v.n >= 3).sort((a, b) => (b[1].s / b[1].n) - (a[1].s / a[1].n))[0]?.[0] ?? null;

  // New-entry counts per watched name this week
  const weekByName: Record<string, number> = {};
  week.forEach((e) => { const k = e.partner_name.toLowerCase(); weekByName[k] = (weekByName[k] ?? 0) + 1; });

  const { data: subs } = await db.from("subscriptions").select("id,email,watch_name,wants_digest,unsubscribe_token").eq("unsubscribed", false).limit(10000);

  let sent = 0;
  for (const s of (subs ?? []) as SubRow[]) {
    let ok = false;
    if (s.watch_name) {
      const count = weekByName[s.watch_name] ?? 0;
      if (count > 0) ok = await sendEmail(s.email, `New activity for "${s.watch_name}" on WhoAmIDating`, watchHtml({ name: s.watch_name, count, token: s.unsubscribe_token }));
    } else if (s.wants_digest && week.length > 0) {
      ok = await sendEmail(s.email, "Fresh on WhoAmIDating 💘", digestHtml({ trending, weekCount: week.length, topActivity, token: s.unsubscribe_token }));
    }
    if (ok) { sent++; await db.from("subscriptions").update({ last_notified_at: new Date().toISOString() }).eq("id", s.id); }
    await new Promise((r) => setTimeout(r, 120)); // gentle pacing for Resend
  }

  return res.status(200).json({ ok: true, subscribers: (subs ?? []).length, sent });
}
