import type { Entry } from "./types";
import { ACTIVITY_META } from "./types";
import type { Insight } from "./insights";

const MEET_LABEL: Record<string, string> = {
  bumble: "Bumble", hinge: "Hinge", tinder: "Tinder", friends: "through friends",
  work_school: "at work/school", in_person: "in person", other_app: "another app",
};

function actLabel(a: string) { return ACTIVITY_META[a as keyof typeof ACTIVITY_META]?.label ?? a; }
function groupBy<T>(arr: T[], key: (t: T) => string) {
  const m: Record<string, T[]> = {};
  arr.forEach((x) => { const k = key(x); (m[k] ??= []).push(x); });
  return m;
}
function avgMood(l: Entry[]) { return l.length ? l.reduce((a, e) => a + e.mood, 0) / l.length : 0; }
function secondRate(l: Entry[]) { return l.length ? l.filter((e) => e.secondDate && e.secondDate !== "no").length / l.length : 0; }
function season(iso: string): string {
  const m = new Date(iso).getMonth(); // 0=Jan
  if (m === 11 || m <= 1) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Personalized "Your Playbook" — specific, non-generic advice derived from the
 * user's OWN dating history. Returns [] when there isn't enough personal data
 * (caller falls back to the community playbook). Requires ≥3 personal entries.
 */
export function computePlaybook(mine: Entry[], currencySymbol: string): Insight[] {
  if (mine.length < 3) return [];
  const out: Insight[] = [];
  const MIN = 2; // per-slice minimum (it's the user's own data, so a low bar)

  const byActivity = groupBy(mine, (e) => e.activity);

  // 1. Your happiest activity
  const happyByAct = Object.entries(byActivity)
    .filter(([, l]) => l.length >= MIN)
    .map(([act, l]) => ({ act, rate: l.filter((e) => e.mood >= 4).length / l.length }))
    .sort((a, b) => b.rate - a.rate);
  if (happyByAct[0] && happyByAct[0].rate >= 0.5) {
    out.push({ emoji: "⭐", text: `Your ${actLabel(happyByAct[0].act).toLowerCase()} dates land a 4–5 mood ${Math.round(happyByAct[0].rate * 100)}% of the time — that's your strong suit. Do more of them.` });
  }

  // 2. Spending efficiency (median split)
  const amounts = mine.map((e) => e.amountCents);
  const med = median(amounts);
  const cheap = mine.filter((e) => e.amountCents <= med);
  const pricey = mine.filter((e) => e.amountCents > med);
  if (cheap.length >= MIN && pricey.length >= MIN) {
    const cm = avgMood(cheap), pm = avgMood(pricey);
    const medDisp = `${currencySymbol}${Math.round(med / 100)}`;
    if (pm <= cm + 0.1) {
      out.push({ emoji: "💸", text: `Spending more isn't paying off — your dates under ${medDisp} feel just as good (${cm.toFixed(1)}/5) as pricier ones (${pm.toFixed(1)}/5). Keep it cheap.` });
    } else {
      out.push({ emoji: "💸", text: `For you, pricier dates over ${medDisp} do rate higher (${pm.toFixed(1)}/5 vs ${cm.toFixed(1)}/5). When it counts, spending pays off.` });
    }
  }

  // 3. Best way you meet (for second dates)
  const byMeet = Object.entries(groupBy(mine.filter((e) => e.meetVia), (e) => e.meetVia as string))
    .filter(([, l]) => l.length >= MIN)
    .map(([m, l]) => ({ m, rate: secondRate(l) }))
    .sort((a, b) => b.rate - a.rate);
  if (byMeet[0] && byMeet[0].rate > 0) {
    out.push({ emoji: "💞", text: `Dates you started ${MEET_LABEL[byMeet[0].m] ?? byMeet[0].m} lead to a second date most often for you (${Math.round(byMeet[0].rate * 100)}%).` });
  }

  // 4. Best season
  const bySeason = Object.entries(groupBy(mine, (e) => season(e.entryDate)))
    .filter(([, l]) => l.length >= MIN)
    .map(([s, l]) => ({ s, mood: avgMood(l) }))
    .sort((a, b) => b.mood - a.mood);
  if (bySeason.length >= 2 && bySeason[0].mood - bySeason[bySeason.length - 1].mood >= 0.5) {
    out.push({ emoji: "🗓️", text: `Your ${bySeason[0].s} dates rate highest (${bySeason[0].mood.toFixed(1)}/5). Lean into that season.` });
  }

  // 5. Most reliable activity for a second date (if different from #1)
  const secondByAct = Object.entries(byActivity)
    .filter(([, l]) => l.length >= MIN)
    .map(([act, l]) => ({ act, rate: secondRate(l) }))
    .sort((a, b) => b.rate - a.rate);
  if (secondByAct[0] && secondByAct[0].rate > 0 && secondByAct[0].act !== happyByAct[0]?.act) {
    out.push({ emoji: "🎯", text: `${actLabel(secondByAct[0].act)} dates get you a second date most reliably (${Math.round(secondByAct[0].rate * 100)}%).` });
  }

  return out.slice(0, 5);
}
