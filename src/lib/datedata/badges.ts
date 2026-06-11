import type { Entry } from "./types";

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  test: (entries: Entry[]) => boolean;
}

const sum = (entries: Entry[]) => entries.reduce((a, e) => a + e.amountCents, 0);
const countByActivity = (entries: Entry[], a: string) => entries.filter((e) => e.activity === a).length;

export const BADGES: BadgeDef[] = [
  { id: "getting_started", name: "Getting Started", emoji: "🎉", desc: "Logged your first date", test: (e) => e.length >= 1 },
  { id: "big_spender", name: "Big Spender", emoji: "🏦", desc: "Total spending $500+", test: (e) => sum(e) >= 50000 },
  { id: "luxury_lover", name: "Luxury Lover", emoji: "💎", desc: "Single entry $200+", test: (e) => e.some((x) => x.amountCents >= 20000) },
  { id: "budget_master", name: "Budget Master", emoji: "🎯", desc: "Average entry < $20", test: (e) => e.length >= 5 && sum(e) / e.length < 2000 },
  { id: "consistent_investor", name: "Consistent Investor", emoji: "💰", desc: "50+ logged entries", test: (e) => e.length >= 50 },
  { id: "foodie", name: "Foodie", emoji: "🍽️", desc: "20+ food date entries", test: (e) => countByActivity(e, "food_date") >= 20 },
  { id: "cinephile", name: "Cinephile", emoji: "🎬", desc: "10+ movie entries", test: (e) => countByActivity(e, "movie") >= 10 },
  { id: "gift_giver", name: "Gift Giver", emoji: "🎁", desc: "15+ gift entries", test: (e) => countByActivity(e, "gift") >= 15 },
  { id: "adventure_seeker", name: "Adventure Seeker", emoji: "✈️", desc: "5+ trip entries", test: (e) => countByActivity(e, "trip") >= 5 },
  { id: "coffee_connoisseur", name: "Coffee Connoisseur", emoji: "☕", desc: "15+ coffee date entries", test: (e) => countByActivity(e, "coffee") >= 15 },
  { id: "dedicated", name: "Dedicated", emoji: "🔥", desc: "30+ total entries", test: (e) => e.length >= 30 },
  { id: "regular", name: "Regular", emoji: "⭐", desc: "5+ days logged this month", test: (e) => {
    const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
    const days = new Set(e.filter((x) => { const d = new Date(x.entryDate); return d.getMonth() === m && d.getFullYear() === y; }).map((x) => x.entryDate.slice(0, 10)));
    return days.size >= 5;
  }},
  { id: "streak", name: "Streak", emoji: "🎊", desc: "3+ days in a row", test: (e) => {
    const days = [...new Set(e.map((x) => x.entryDate.slice(0, 10)))].sort();
    let best = 1, cur = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]); const next = new Date(days[i]);
      if ((next.getTime() - prev.getTime()) / 86400000 === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
    }
    return best >= 3;
  }},
  { id: "in_love", name: "In Love", emoji: "😍", desc: "80%+ happy entries", test: (e) => e.length >= 5 && e.filter((x) => x.mood >= 4).length / e.length >= 0.8 },
  { id: "real_talk", name: "Real Talk", emoji: "🤔", desc: "Diverse mood mix", test: (e) => new Set(e.map((x) => x.mood)).size >= 4 },
  { id: "loyal", name: "Loyal", emoji: "💕", desc: "20+ entries same partner", test: (e) => {
    const counts: Record<string, number> = {};
    e.forEach((x) => { counts[x.partnerName.toLowerCase()] = (counts[x.partnerName.toLowerCase()] ?? 0) + 1; });
    return Object.values(counts).some((c) => c >= 20);
  }},
  { id: "player", name: "Player", emoji: "🌟", desc: "3+ different partner names", test: (e) => new Set(e.map((x) => x.partnerName.toLowerCase())).size >= 3 },
];

export function earnedBadges(entries: Entry[]): BadgeDef[] {
  return BADGES.filter((b) => b.test(entries));
}