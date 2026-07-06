import type { Question } from "./types";

// ── Conversation bank ─────────────────────────────────────────────────────────
// Hand-authored, tagged by stage (opener → mid → late) and tone. The engine
// pulls by the block's position in the date, so early stops get icebreakers and
// the last sit-down gets the deeper/warmer ones. No AI generation.

export const QUESTIONS: Question[] = [
  // ── Openers (light, safe, easy to answer) ──────────────────
  {
    text: "What's something you'd happily do every weekend and never get bored of?",
    stage: "opener",
    tone: "light",
  },
  {
    text: "Are you more of a plan-everything or figure-it-out-as-you-go person?",
    stage: "opener",
    tone: "light",
  },
  { text: "What made you pick this city — or did it pick you?", stage: "opener", tone: "light" },
  { text: "Coffee, tea, or something-else person?", stage: "opener", tone: "light" },
  {
    text: "What's the last thing that genuinely made you laugh?",
    stage: "opener",
    tone: "playful",
  },
  {
    text: "If today had zero obligations, what would you actually be doing right now?",
    stage: "opener",
    tone: "light",
  },
  {
    text: "What's a small thing that instantly makes your day better?",
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
    text: "What did you want to be when you were a kid, and how far off are you?",
    stage: "mid",
    tone: "light",
  },
  {
    text: "Who's someone that completely changed how you think about something?",
    stage: "mid",
    tone: "personal",
  },
  {
    text: "What's a risk you took that you're glad you didn't talk yourself out of?",
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

  // ── Late (warmer, more romantic / meaningful) ──────────────
  {
    text: "What does a genuinely good day look like for you, start to finish?",
    stage: "late",
    tone: "personal",
  },
  {
    text: "What's something you're looking forward to in the next year?",
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
  { text: "Honestly — how's this been for you so far?", stage: "late", tone: "playful" },
];

// Deterministic pick: same (stage, seed) → same question, so a given plan is stable.
export function pickQuestion(
  stage: Question["stage"],
  seed: number,
  preferPlayful: boolean,
): Question {
  const pool = QUESTIONS.filter((q) => q.stage === stage);
  if (pool.length === 0) return QUESTIONS[0];
  // Younger daters lean playful; nudge the ordering but stay deterministic.
  const ordered = preferPlayful
    ? [...pool].sort((a, b) => (a.tone === "playful" ? -1 : 0) - (b.tone === "playful" ? -1 : 0))
    : pool;
  return ordered[seed % ordered.length];
}
