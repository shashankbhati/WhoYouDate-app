import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// ============================================================
// Send a Web Push to the OTHER party on a shared plan when the caller messages /
// accepts / reacts / edits. Called (fire-and-forget) from the client after the
// action succeeds. Verifies the caller's JWT and that they're on the plan.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//      VITE_VAPID_PUBLIC_KEY (or VAPID_PUBLIC_KEY), VAPID_PRIVATE_KEY,
//      VAPID_SUBJECT (e.g. mailto:hello@whoamidating.singles).
// ============================================================

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@whoamidating.singles";

const TITLES: Record<string, (n: string) => string> = {
  message: (n) => `${n} messaged you 💬`,
  accept: (n) => `${n} accepted your date 💗`,
  react: (n) => `${n} reacted to your date 💞`,
  change: (n) => `${n} tweaked the date ✏️`,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!SUPA_URL || !SERVICE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(200).json({ ok: false, skipped: "not-configured" });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const admin = createClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Authenticate the caller.
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return res.status(401).json({ ok: false });

  const { planId, kind, text } = (req.body || {}) as {
    planId?: string;
    kind?: string;
    text?: string;
  };
  if (!planId || !kind) return res.status(400).json({ ok: false });

  const { data: plan } = await admin
    .from("shared_plans")
    .select("id, owner_id, recipient_id, owner_name, recipient_name, city")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return res.status(404).json({ ok: false });

  // Caller must be part of the plan.
  if (user.id !== plan.owner_id && user.id !== plan.recipient_id) {
    return res.status(403).json({ ok: false });
  }
  const targetId = user.id === plan.owner_id ? plan.recipient_id : plan.owner_id;
  if (!targetId) return res.status(200).json({ ok: true, skipped: "no-target" });

  const actorName =
    user.id === plan.owner_id
      ? plan.owner_name || "Your date"
      : plan.recipient_name || "Your date";

  const payload = JSON.stringify({
    title: (TITLES[kind] || (() => "New activity on your date"))(actorName),
    body: text ? String(text).slice(0, 100) : `In ${plan.city}`,
    url: `/p/${plan.id}`,
    tag: `plan-${plan.id}`,
  });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("user_id", targetId);

  await Promise.all(
    (subs || []).map(async (s) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await webpush.sendNotification(s.subscription as any, payload);
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        // Expired/invalid subscription → clean it up.
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );

  return res.status(200).json({ ok: true, sent: (subs || []).length });
}
