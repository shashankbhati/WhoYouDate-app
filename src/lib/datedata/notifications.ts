import type { Entry, Post } from "./types";
import { ACTIVITY_META } from "./types";
import { computeInsights } from "./insights";

export interface Notif {
  id: string;
  icon: string;
  title: string;
  sub?: string;
  ts: number;        // sort key
  countsUnread: boolean; // whether it contributes to the unread badge
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Build the in-app notification feed shown in the header bell. Mirrors the
 * email content (recent activity, trending name, an insight) plus personal
 * replies, all computed client-side from already-loaded data — no new tables.
 * Keeps the bell full even when the community is still small.
 */
export function buildNotifications(
  entries: Entry[],
  posts: Post[],
  myId: string,
  currencySymbol: string
): Notif[] {
  const out: Notif[] = [];
  const now = Date.now();

  // 1. Replies to my posts (personal, time-based, counts toward unread)
  posts.filter((p) => p.userId === myId).forEach((p) => {
    p.comments.filter((c) => c.userId !== myId).forEach((c) => {
      out.push({
        id: "r" + c.id,
        icon: "💬",
        title: `u/${c.author} replied`,
        sub: `"${p.content.slice(0, 50)}${p.content.length > 50 ? "…" : ""}"`,
        ts: +new Date(c.createdAt),
        countsUnread: true,
      });
    });
  });

  // 2. Recent community activity — dates logged in the last week
  entries
    .filter((e) => now - +new Date(e.createdAt) <= WEEK_MS)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .forEach((e) => {
      const meta = ACTIVITY_META[e.activity];
      out.push({
        id: "a" + e.id,
        icon: meta?.emoji ?? "💫",
        title: `New ${meta?.label ?? e.activity} in ${e.city}`,
        sub: `${currencySymbol}${(e.amountCents / 100).toFixed(0)} · mood ${e.mood}/5`,
        ts: +new Date(e.createdAt),
        countsUnread: true,
      });
    });

  out.sort((a, b) => b.ts - a.ts);

  // 3. Pinned info (does not inflate the unread badge) — trending name + insight.
  //    ts = 0 so these sink to the bottom of the list.
  const pinned: Notif[] = [];

  const nameCounts: Record<string, number> = {};
  entries.forEach((e) => { nameCounts[e.partnerName] = (nameCounts[e.partnerName] ?? 0) + 1; });
  const topName = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0];
  if (topName) {
    pinned.push({ id: "trend", icon: "🔥", title: `${topName[0]} is the most-tracked name`, sub: `${topName[1]} dates logged`, ts: 0, countsUnread: false });
  }

  const insights = computeInsights(entries, { currencySymbol, includeCost: true });
  if (insights[0]) {
    pinned.push({ id: "insight", icon: insights[0].emoji, title: "Community insight", sub: insights[0].text, ts: 0, countsUnread: false });
  }

  return [...out, ...pinned];
}
