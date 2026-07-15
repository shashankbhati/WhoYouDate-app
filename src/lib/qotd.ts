import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Question of the Day — a daily couple prompt. Both answer independently; the
// partner's answer is revealed only once you've answered. Deterministic by date
// (no table needed for the questions), so both partners get the same one.
export const QUESTIONS = [
  "One tiny thing they did this week that you'd never say out loud?",
  "What's a moment with them you keep replaying?",
  "When did you last feel proud to be with them?",
  "What's something you want more of, together?",
  "A small habit of theirs you've secretly grown to love?",
  "Where do you most want to take them?",
  "What made you smile about them today?",
  "One thing you'd relive from your first month?",
  "What do you feel for them but rarely say?",
  "A tiny way they make an ordinary day better?",
  "What's a date you two keep meaning to do?",
  "When do you feel closest to them?",
  "Something you're grateful they put up with?",
  "A song that's quietly become 'yours'?",
  "What would your ideal lazy Sunday together look like?",
  "One thing you'd love them to know right now?",
  "The last time they genuinely surprised you?",
  "What does 'home' feel like with them?",
  "A small promise you want to make this week?",
  "What's changed in you since you got together?",
  "Something silly only the two of you find funny?",
  "When did you last laugh together till it hurt?",
  "What are you most looking forward to, together?",
  "What's one thing about them you hope never changes?",
];

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todaysQuestion(): { id: string; text: string } {
  const key = todayKey();
  const dayNum = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000);
  const index = ((dayNum % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  return { id: `qod_${key}`, text: QUESTIONS[index] };
}

export interface QotdState {
  loading: boolean;
  mine?: string; // my answer today
  partner?: string; // partner's answer today — only present once I've answered
  partnerAnswered: boolean;
  streak: number;
}

// Load today's answers + the both-answered streak for a couple.
export function useQotd(coupleId: string | undefined, myId: string) {
  const [state, setState] = useState<QotdState>({
    loading: true,
    partnerAnswered: false,
    streak: 0,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!coupleId) {
      setState({ loading: false, partnerAnswered: false, streak: 0 });
      return;
    }
    let alive = true;
    (async () => {
      const since = todayKey(new Date(Date.now() - 45 * 86400000));
      const { data } = await supabase
        .from("couple_answers")
        .select("user_id, qdate, answer")
        .eq("couple_id", coupleId)
        .gte("qdate", since);
      if (!alive) return;
      const rows = data ?? [];
      const today = todayKey();
      const mineRow = rows.find((r) => r.qdate === today && r.user_id === myId);
      const partnerRow = rows.find((r) => r.qdate === today && r.user_id !== myId);

      // Streak: consecutive days (back from today) where BOTH answered. Today only
      // counting mine-so-far doesn't break the run.
      const byDate = new Map<string, Set<string>>();
      for (const r of rows) {
        const s = byDate.get(r.qdate) ?? new Set<string>();
        s.add(r.user_id);
        byDate.set(r.qdate, s);
      }
      let streak = 0;
      for (let i = 0; i < 45; i++) {
        const d = todayKey(new Date(Date.now() - i * 86400000));
        const s = byDate.get(d);
        if (s && s.size >= 2) streak++;
        else if (i === 0) continue;
        else break;
      }

      setState({
        loading: false,
        mine: mineRow?.answer,
        partner: mineRow ? partnerRow?.answer : undefined, // reveal gate
        partnerAnswered: !!partnerRow,
        streak,
      });
    })();
    return () => {
      alive = false;
    };
  }, [coupleId, myId, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}

export async function submitAnswer(coupleId: string, text: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return false;
  const { error } = await supabase.from("couple_answers").upsert(
    { couple_id: coupleId, user_id: user.id, qdate: todayKey(), answer: text.slice(0, 300) },
    { onConflict: "couple_id,user_id,qdate" },
  );
  if (error) return false;
  // Nudge the partner (fire-and-forget).
  try {
    void fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({ kind: "qotd" }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  return true;
}
