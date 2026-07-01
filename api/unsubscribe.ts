import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// One-click unsubscribe. Linked from every email: /api/unsubscribe?token=<uuid>
// Uses the service role to flip unsubscribed=true (RLS blocks anon updates).

const SITE_URL = process.env.SITE_URL ?? "https://www.whoamidating.singles";

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title></head>
    <body style="font-family:-apple-system,Segoe UI,sans-serif;background:#0d0d18;color:#f0eef8;display:grid;place-items:center;height:100vh;margin:0">
      <div style="text-align:center;max-width:420px;padding:24px">
        <h1 style="color:#e05533">${title}</h1>
        <p style="color:#9996bb">${body}</p>
        <a href="${SITE_URL}" style="color:#e05533">← Back to WhoAmIDating</a>
      </div>
    </body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = (req.query.token as string) ?? "";
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!token) return res.status(400).send(page("Invalid link", "This unsubscribe link is missing its token."));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).send(page("Something went wrong", "Please try again later."));

  const db = createClient(supabaseUrl, serviceKey);
  const { error } = await db.from("subscriptions").update({ unsubscribed: true }).eq("unsubscribe_token", token);

  if (error) return res.status(500).send(page("Something went wrong", "We couldn't process that. Please try again."));
  return res.status(200).send(page("You're unsubscribed ✓", "You won't receive any more emails from us. You can re-subscribe anytime from the site."));
}
