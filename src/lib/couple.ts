import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface Couple {
  id: string;
  code: string;
  memberA: string;
  memberB?: string;
  memberAName?: string;
  memberBName?: string;
  togetherSince?: string; // yyyy-mm-dd
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCouple(d: any): Couple {
  return {
    id: d.id,
    code: d.code,
    memberA: d.member_a,
    memberB: d.member_b ?? undefined,
    memberAName: d.member_a_name ?? undefined,
    memberBName: d.member_b_name ?? undefined,
    togetherSince: d.together_since ?? undefined,
  };
}

export async function getMyCouple(): Promise<Couple | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("couples")
    .select("*")
    .or(`member_a.eq.${user.id},member_b.eq.${user.id}`)
    .maybeSingle();
  return data ? rowToCouple(data) : null;
}

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  // 6 chars over a 32-char alphabet ≈ 1 billion combos — infeasible to brute-force
  // a stranger's "join by code" while still short enough to share.
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `US-${s}`;
}

export async function createCouple(
  myName: string,
  togetherSince?: string,
): Promise<{ ok: boolean; couple?: Couple; error?: string }> {
  const existing = await getMyCouple();
  if (existing) return { ok: true, couple: existing };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "login" };
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await supabase
      .from("couples")
      .insert({ code, member_a: user.id, member_a_name: myName, together_since: togetherSince ?? null })
      .select()
      .single();
    if (!error && data) return { ok: true, couple: rowToCouple(data) };
    if ((error as { code?: string })?.code !== "23505") {
      return { ok: false, error: error?.message ?? "Couldn't create." };
    }
  }
  return { ok: false, error: "Couldn't generate a code — try again." };
}

export async function joinCouple(
  code: string,
): Promise<{ ok: boolean; couple?: Couple; error?: string }> {
  const { data, error } = await supabase.rpc("join_couple", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) {
    const m = error.message || "";
    if (/not_found/.test(m)) return { ok: false, error: "That code doesn't exist." };
    if (/full|already_paired/.test(m)) return { ok: false, error: "Already paired." };
    if (/own_code/.test(m)) return { ok: false, error: "That's your own code." };
    return { ok: false, error: "Couldn't join — try again." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, couple: row ? rowToCouple(row) : undefined };
}

export async function updateTogetherSince(id: string, date: string): Promise<boolean> {
  const { error } = await supabase
    .from("couples")
    .update({ together_since: date || null })
    .eq("id", id);
  return !error;
}

export async function unpair(id: string): Promise<boolean> {
  const { error } = await supabase.from("couples").delete().eq("id", id);
  return !error;
}

// Load the current user's couple, with a manual reload trigger.
export function useCouple(enabled = true): {
  couple: Couple | null;
  loading: boolean;
  reload: () => void;
} {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setCouple(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getMyCouple().then((c) => {
      if (alive) {
        setCouple(c);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [enabled, nonce]);
  return { couple, loading, reload: () => setNonce((n) => n + 1) };
}
