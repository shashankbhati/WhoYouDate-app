import type { Entry } from "./types";
import { ACTIVITY_META } from "./types";

export interface Insight {
  emoji: string;
  text: string;
}

const MEET_LABEL: Record<string, string> = {
  bumble: "Bumble",
  hinge: "Hinge",
  tinder: "Tinder",
  friends: "friends",
  work_school: "work/school",
  in_person: "meeting in person",
  other_app: "other apps",
};

const MIN_SAMPLE = 15; // per-slice minimum to be statistically meaningful

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  const m: Record<string, T[]> = {};
  arr.forEach((x) => { const k = key(x); (m[k] ??= []).push(x); });
  return m;
}

function secondRate(list: Entry[]): number {
  if (list.length === 0) return 0;
  return list.filter((e) => e.secondDate && e.secondDate !== "no").length / list.length;
}

function avgMood(list: Entry[]): number {
  if (list.length === 0) return 0;
  return list.reduce((a, e) => a + e.mood, 0) / list.length;
}

function actLabel(act: string): string {
  return ACTIVITY_META[act as keyof typeof ACTIVITY_META]?.label ?? act;
}
function actEmoji(act: string): string {
  return ACTIVITY_META[act as keyof typeof ACTIVITY_META]?.emoji ?? "💘";
}

/**
 * Derive human-readable dating insights from the community ledger.
 * Rate/mood insights are currency-agnostic and always safe; cost insights
 * only render when includeCost is true (i.e. a single-currency country view).
 * Reused by both the in-app insights panel and the email digest.
 */
export function computeInsights(entries: Entry[], opts: { currencySymbol: string; includeCost: boolean }): Insight[] {
  const out: Insight[] = [];
  if (entries.length < MIN_SAMPLE) return out;

  const byActivity = groupBy(entries, (e) => e.activity);

  // 1. Best vs worst activity for second dates
  const actRates = Object.entries(byActivity)
    .filter(([, l]) => l.length >= MIN_SAMPLE)
    .map(([act, l]) => ({ act, rate: secondRate(l) }))
    .sort((a, b) => b.rate - a.rate);
  if (actRates.length >= 2) {
    const top = actRates[0];
    const bot = actRates[actRates.length - 1];
    if (top.rate - bot.rate >= 0.08) {
      out.push({
        emoji: actEmoji(top.act),
        text: `${actLabel(top.act)} dates lead to a second date ${Math.round(top.rate * 100)}% of the time — vs ${Math.round(bot.rate * 100)}% for ${actLabel(bot.act).toLowerCase()}.`,
      });
    }
  }

  // 2. Best way to meet for second dates
  const byMeet = groupBy(entries.filter((e) => e.meetVia), (e) => e.meetVia as string);
  const meetRates = Object.entries(byMeet)
    .filter(([, l]) => l.length >= MIN_SAMPLE)
    .map(([m, l]) => ({ m, rate: secondRate(l) }))
    .sort((a, b) => b.rate - a.rate);
  if (meetRates.length >= 2) {
    const top = meetRates[0];
    out.push({
      emoji: "💞",
      text: `People who met on ${MEET_LABEL[top.m] ?? top.m} get a second date ${Math.round(top.rate * 100)}% of the time — the highest of any way to meet.`,
    });
  }

  // 3. Happiest activity by mood
  const moodByAct = Object.entries(byActivity)
    .filter(([, l]) => l.length >= MIN_SAMPLE)
    .map(([act, l]) => ({ act, mood: avgMood(l) }))
    .sort((a, b) => b.mood - a.mood);
  if (moodByAct.length >= 1) {
    const top = moodByAct[0];
    out.push({
      emoji: "😍",
      text: `${actLabel(top.act)} dates have the highest average mood, at ${top.mood.toFixed(1)}/5.`,
    });
  }

  // 4. Cheap vs pricey happiness (cost-based)
  if (opts.includeCost) {
    const cheap = entries.filter((e) => e.amountCents <= 3000);
    const pricey = entries.filter((e) => e.amountCents >= 10000);
    if (cheap.length >= MIN_SAMPLE && pricey.length >= MIN_SAMPLE) {
      const cm = avgMood(cheap);
      const pm = avgMood(pricey);
      if (cm >= pm) {
        out.push({
          emoji: "💸",
          text: `Dates under ${opts.currencySymbol}30 are rated happier on average (${cm.toFixed(1)}/5) than dates over ${opts.currencySymbol}100 (${pm.toFixed(1)}/5). Money isn't everything.`,
        });
      } else {
        out.push({
          emoji: "💸",
          text: `Dates over ${opts.currencySymbol}100 rate a little happier (${pm.toFixed(1)}/5) than budget dates under ${opts.currencySymbol}30 (${cm.toFixed(1)}/5).`,
        });
      }
    }
  }

  // 5. Overall average spend (cost-based)
  if (opts.includeCost) {
    const avg = entries.reduce((a, e) => a + e.amountCents, 0) / entries.length / 100;
    out.push({ emoji: "🧾", text: `The average logged date costs ${opts.currencySymbol}${avg.toFixed(0)}.` });
  }

  // 6. Top reason dates ended (from the "what made or broke it" tag on failures)
  const failedTags = entries.filter((e) => e.secondDate === "no" && e.turningPoint);
  if (failedTags.length >= MIN_SAMPLE) {
    const counts = groupBy(failedTags, (e) => e.turningPoint as string);
    const top = Object.entries(counts).sort((a, b) => b[1].length - a[1].length)[0];
    if (top) out.push({ emoji: "🚩", text: `The #1 reason logged dates didn't get a second round: ${top[0]}.` });
  }

  return out;
}
