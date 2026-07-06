import type { Move } from "./types";

// ── The moves bank ────────────────────────────────────────────────────────────
// Hand-tagged risk/reward for launch. Once plan_reviews has volume, these labels
// get replaced by REAL success rates from outcomes (see engine + store).
//
// Tone rule: every move is something the USER proposes about their OWN plan —
// never a tactic to pressure the other person. Hints stay read-the-room / consent-positive.

export const MOVES: Move[] = [
  // ── Low risk ────────────────────────────────────────────────
  {
    id: "second_date",
    label: "Lock in a second date before you split",
    risk: "low",
    reward: "high",
    stage: "late",
    times: ["morning", "afternoon", "evening", "night"],
    hint: "If it went well, naming a concrete next plan is the highest-return low-risk move there is.",
  },
  {
    id: "walk_more",
    label: "Suggest one more short walk instead of ending it",
    risk: "low",
    reward: "med",
    stage: "mid",
    times: ["morning", "afternoon", "evening"],
    hint: "Buys more time together with zero pressure.",
  },
  {
    id: "dessert",
    label: "Grab dessert or an ice cream nearby",
    risk: "low",
    reward: "med",
    stage: "mid",
    times: ["afternoon", "evening", "night"],
    hint: "Light, sweet, easy — extends the date without raising the stakes.",
  },
  {
    id: "swap_numbers",
    label: "Make sure you've actually swapped numbers / socials",
    risk: "low",
    reward: "med",
    stage: "opener",
    times: ["morning", "afternoon", "evening", "night"],
    hint: "Basic, but people forget. No downside.",
  },

  // ── Medium risk ─────────────────────────────────────────────
  {
    id: "billiards",
    label: "Go for billiards or a bar game",
    risk: "med",
    reward: "high",
    stage: "mid",
    times: ["afternoon", "evening", "night"],
    hint: "A shared activity kills awkward silences and creates playful contact.",
  },
  {
    id: "live_music",
    label: "Catch live music or head to a livelier spot",
    risk: "med",
    reward: "med",
    stage: "mid",
    times: ["evening", "night"],
    hint: "Raises the energy — good if the vibe is warming up.",
  },
  {
    id: "cook_class_museum",
    label: "Do something with your hands — a gallery, market, or tasting",
    risk: "med",
    reward: "med",
    stage: "mid",
    times: ["morning", "afternoon"],
    hint: "Gives you both something to react to and talk about.",
  },
  {
    id: "compliment_direct",
    label: "Say directly that you're enjoying this and want to see them again",
    risk: "med",
    reward: "high",
    stage: "late",
    times: ["afternoon", "evening", "night"],
    hint: "Honest and disarming. Only if you mean it — read whether it's mutual first.",
  },

  // ── High risk ───────────────────────────────────────────────
  {
    id: "movie_home",
    label: "Invite them back to watch a movie at your place",
    risk: "high",
    reward: "high",
    stage: "late",
    times: ["evening", "night"],
    hint: "Only if the night's clearly gone well and the interest is mutual — read the room, and take a no gracefully.",
  },
  {
    id: "nightcap",
    label: "Suggest one last drink somewhere with a view",
    risk: "high",
    reward: "high",
    stage: "late",
    times: ["evening", "night"],
    hint: "Signals real interest without going all-in. Have a graceful exit ready either way.",
  },
  {
    id: "spontaneous_plan",
    label: "Ditch the plan and improvise something they mentioned wanting to do",
    risk: "high",
    reward: "high",
    stage: "mid",
    times: ["morning", "afternoon", "evening"],
    hint: "Memorable if you listened well; falls flat if you're guessing.",
  },
];
