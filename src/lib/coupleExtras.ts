import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { todayKey } from "./qotd";

// ── Shared jar (bucket list) ─────────────────────────────────────────────────
export interface JarItem {
  id: string;
  label: string;
  emoji?: string;
  addedBy?: string; // user id
  done: boolean;
}

export function useJar(coupleId: string | undefined) {
  const [items, setItems] = useState<JarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!coupleId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let alive = true;
    supabase
      .from("couple_jar")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!alive) return;
        setItems(
          (data ?? []).map((d) => ({
            id: d.id,
            label: d.label,
            emoji: d.emoji ?? undefined,
            addedBy: d.added_by ?? undefined,
            done: !!d.done,
          })),
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [coupleId, nonce]);
  return { items, loading, reload: () => setNonce((n) => n + 1) };
}

export async function addJarItem(coupleId: string, label: string, emoji: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("couple_jar")
    .insert({ couple_id: coupleId, label: label.slice(0, 80), emoji, added_by: user?.id ?? null });
  return !error;
}

export async function toggleJarItem(id: string, done: boolean): Promise<boolean> {
  const { error } = await supabase.from("couple_jar").update({ done }).eq("id", id);
  return !error;
}

export async function deleteJarItem(id: string): Promise<boolean> {
  const { error } = await supabase.from("couple_jar").delete().eq("id", id);
  return !error;
}

// ── Daily pulse ──────────────────────────────────────────────────────────────
export const PULSE_OPTIONS = ["🪫 low", "🙂 ok", "💛 full", "🔥 overflowing"];

export function usePulse(coupleId: string | undefined, myId: string) {
  const [mine, setMine] = useState<string | undefined>();
  const [partner, setPartner] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }
    let alive = true;
    supabase
      .from("couple_pulse")
      .select("user_id, level")
      .eq("couple_id", coupleId)
      .eq("pdate", todayKey())
      .then(({ data }) => {
        if (!alive) return;
        const rows = data ?? [];
        setMine(rows.find((r) => r.user_id === myId)?.level);
        setPartner(rows.find((r) => r.user_id !== myId)?.level);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [coupleId, myId, nonce]);
  return { mine, partner, loading, reload: () => setNonce((n) => n + 1) };
}

export async function setPulse(coupleId: string, level: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("couple_pulse").upsert(
    { couple_id: coupleId, user_id: user.id, pdate: todayKey(), level },
    { onConflict: "couple_id,user_id,pdate" },
  );
  return !error;
}
