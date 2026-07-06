import type { AgeRange, Question, Tone } from "./types";

// ── Conversation bank ─────────────────────────────────────────────────────────
// Hand-authored, tagged by stage (opener → mid → late) and tone. The engine
// pulls by the block's position in the date, so early stops get icebreakers and
// the last sit-down gets the deeper/warmer ones. No AI generation.

export const QUESTIONS: Question[] = [
  // ── Openers (light, safe, easy to answer) ──────────────────

  {
    text: "Are you more of a plan-everything or figure-it-out-as-you-go person?",
    stage: "opener",
    tone: "light",
  },
  { text: "What made you pick this city — or did it pick you?", stage: "opener", tone: "light" },
  { text: "Coffee, tea, or something-else person?", stage: "opener", tone: "light" },
  {
    text: "So... what made you swipe right on me?",
    stage: "opener",
    tone: "playful",
  },
  {
    text: "What made you agree to this date?",
    stage: "opener",
    tone: "playful",
  },
  {
    text: "Were you nervous before coming here?",
    stage: "opener",
    tone: "light",
  },
  {
    text: "Do you go on dates often?",
    stage: "opener",
    tone: "light",
  },
  {
    text: "How's Hinge/Tinder been treating you?",
    stage: "opener",
    tone: "playful",
  },
  {
    text: "What's been your funniest dating app experience?",
    stage: "opener",
    tone: "playful",
  },
  {
    text: "What's your usual Sunday look like?",
    stage: "opener",
    tone: "light",
  },
  {
    text: "Outside of work and the gym... what actually takes up your time?",
    stage: "opener",
    tone: "light",
  },
  {
    text: "If I asked your friends what you're obsessed with, what would they say?",
    stage: "opener",
    tone: "playful",
  },
  {
    text: "Are you usually the planner or the spontaneous one?",
    stage: "opener",
    tone: "light",
  },

  // ── Mid (a bit more personal, playful) ─────────────────────
  {
    text: "What's something you're weirdly good at that never comes up?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What did you want to be when you were a kid",
    stage: "mid",
    tone: "light",
  },
  {
    text: "Who's someone that completely changed how you think about something?",
    stage: "mid",
    tone: "personal",
  },
  {
    text: "What's the most spontaneous thing you've done recently?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "Is there something you've always wanted to try but keep putting off?",
    stage: "mid",
    tone: "light",
  },
  {
    text: "What's a strong opinion you have about something totally trivial?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What's your biggest green flag?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "Okay... what's your biggest red flag?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What's your type usually?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What's one thing that's an instant turn-off for you?",
    stage: "mid",
    tone: "personal",
  },
  {
    text: "What's the worst first date you've ever had?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "And the best one?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What's the weirdest thing someone's done on a date?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What's something people do while dating that gives you the ick?",
    stage: "mid",
    tone: "playful",
  },
  {
    text: "What's something you wish people stopped pretending on first dates?",
    stage: "mid",
    tone: "personal",
  },
  {
    text: "How do you know you're actually interested in someone?",
    stage: "mid",
    tone: "personal",
  },

  // ── Late (warmer, more romantic / meaningful) ──────────────
  {
    text: "What does a genuinely good day look like for you, start to finish?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "What's something you're looking forward to in the near future?",
    stage: "late",
    tone: "personal",
  },
  { text: "What makes you feel most like yourself?", stage: "late", tone: "personal" },
  {
    text: "What's the kind of connection you're actually hoping to find?",
    stage: "late",
    tone: "personal",
  },
  { text: "When do you feel most at ease with someone?", stage: "late", tone: "personal" },
  { text: "Honestly — how's this date been for you so far?", stage: "late", tone: "playful" },
  {
    text: "So... what are you actually hoping comes out of dating right now?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "What's your ideal relationship look like?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "What's something you learned from your last relationship?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "What's something you're not willing to compromise on anymore?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "How do you usually show someone you like them?",
    stage: "late",
    tone: "romantic",
  },
  {
    text: "When do you normally know there's going to be a second date?",
    stage: "late",
    tone: "playful",
  },
  {
    text: "What's something people misunderstand about you once they start dating you?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "Would your ex describe you as an easy person to date?",
    stage: "late",
    tone: "playful",
  },
  {
    text: "What's one thing you wish more people asked you on dates?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "Be honest... how do you think this date's going?",
    stage: "late",
    tone: "playful",
  },
];

// How well each tone fits each age band (higher = preferred). This is the
// weighting that makes questions "connect": younger daters lean playful, older
// daters lean personal/romantic. Tune freely.
const TONE_BY_AGE: Record<AgeRange, Record<Tone, number>> = {
  "18-24": { playful: 3, light: 2, personal: 1, romantic: 1 },
  "25-34": { playful: 3, light: 2, personal: 2, romantic: 2 },
  "35-44": { personal: 3, romantic: 3, light: 2, playful: 1 },
  "45+": { personal: 3, romantic: 3, light: 2, playful: 0 },
};

/**
 * Pick a question for one stop. It (1) matches the stop's stage, (2) fits the
 * date's age via tone weighting, and (3) never repeats within a plan — the
 * caller passes a shared `used` set so each stop gets a distinct line and the
 * conversation escalates opener → mid → late instead of feeling random.
 * Deterministic: same inputs → same question.
 */
export function pickQuestion(
  stage: Question["stage"],
  ageRange: AgeRange,
  used: Set<string>,
  seed: number,
): Question {
  const weights = TONE_BY_AGE[ageRange];
  let pool = QUESTIONS.filter((q) => q.stage === stage && !used.has(q.text));
  if (pool.length === 0) pool = QUESTIONS.filter((q) => q.stage === stage); // exhausted — allow reuse
  if (pool.length === 0) return QUESTIONS[0];

  // Best tone fit first; rotate deterministically among equally-good options so
  // different dates don't always surface the identical line.
  const ranked = [...pool].sort(
    (a, b) => weights[b.tone] - weights[a.tone] || a.text.localeCompare(b.text),
  );
  const topFit = weights[ranked[0].tone];
  const best = ranked.filter((q) => weights[q.tone] === topFit);
  const chosen = best[seed % best.length];
  used.add(chosen.text);
  return chosen;
}
