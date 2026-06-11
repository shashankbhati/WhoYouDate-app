import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Entry, Post, Profile } from "./types";
import { seedEntries, seedPosts } from "./seed";

// ── Module-level cache (shared across all component instances) ──────────────
let _entries: Entry[] = [];
let _posts: Post[] = [];
let _profile: Profile | null = null;
let _userId = "";
let _initializing = false;
let _initialized = false;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

// ── Row mappers ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(r: any): Entry {
  return {
    id: r.id,
    userId: r.user_id,
    activity: r.activity,
    amountCents: r.amount_cents,
    currency: r.currency,
    partnerName: r.partner_name,
    mood: r.mood,
    meetVia: r.meet_via ?? undefined,
    secondDate: r.second_date ?? undefined,
    note: r.note ?? undefined,
    city: r.city,
    entryDate: r.entry_date,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPost(r: any): Post {
  return {
    id: r.id,
    author: r.author,
    type: r.type,
    content: r.content,
    tags: r.tags ?? [],
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comments: (r.comments ?? []).map((c: any) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      createdAt: c.created_at,
    })),
    createdAt: r.created_at,
  };
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function ensureAuth(): Promise<string> {
  if (_userId) return _userId;
  if (typeof window === "undefined") return "ssr";

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) { _userId = session.user.id; return _userId; }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  _userId = data.user!.id;
  return _userId;
}

export function getUserId(): string { return _userId; }
export function getProfile(): Profile | null { return _profile; }
export function getEntries(): Entry[] { return _entries; }
export function getPosts(): Post[] { return _posts; }

// ── Seed guard (uses a settings row to avoid duplicate seeding) ───────────────
async function shouldSeed(): Promise<boolean> {
  const { data } = await supabase.from("settings").select("value").eq("key", "seeded").maybeSingle();
  if (data) return false;
  // Try to claim the slot — if another client races us, the UNIQUE constraint blocks them
  const { error } = await supabase.from("settings").insert({ key: "seeded", value: "1" });
  return !error;
}

// ── Initialize ───────────────────────────────────────────────────────────────
async function initialize() {
  if (_initialized || _initializing || typeof window === "undefined") return;
  _initializing = true;

  try {
    await ensureAuth();

    // ── Fetch entries ──
    const { data: entryRows } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    // ── Seed entries if DB is empty ──
    if (!entryRows || entryRows.length < 50) {
      if (await shouldSeed()) {
        const seeds = seedEntries();
        for (let i = 0; i < seeds.length; i += 100) {
          await supabase.from("entries").insert(
            seeds.slice(i, i + 100).map((e) => ({
              user_id: _userId,
              activity: e.activity,
              amount_cents: e.amountCents,
              currency: e.currency,
              partner_name: e.partnerName,
              mood: e.mood,
              meet_via: e.meetVia ?? null,
              second_date: e.secondDate ?? null,
              note: e.note ?? null,
              city: e.city,
              entry_date: e.entryDate,
              created_at: e.createdAt,
            }))
          );
        }
      }
      const { data: fresh } = await supabase.from("entries").select("*").order("created_at", { ascending: false }).limit(2000);
      _entries = (fresh ?? []).map(rowToEntry);
    } else {
      _entries = entryRows.map(rowToEntry);
    }

    // ── Fetch posts ──
    const { data: postRows } = await supabase
      .from("posts")
      .select("*, comments(*)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!postRows || postRows.length === 0) {
      for (const p of seedPosts()) {
        const { data: inserted } = await supabase
          .from("posts")
          .insert({ user_id: _userId, author: p.author, type: p.type, content: p.content, tags: p.tags, upvotes: p.upvotes, downvotes: p.downvotes, created_at: p.createdAt })
          .select()
          .single();
        if (inserted && p.comments.length > 0) {
          await supabase.from("comments").insert(
            p.comments.map((c) => ({ post_id: inserted.id, user_id: _userId, author: c.author, content: c.content, upvotes: c.upvotes, downvotes: c.downvotes, created_at: c.createdAt }))
          );
        }
      }
      const { data: fresh } = await supabase.from("posts").select("*, comments(*)").order("created_at", { ascending: false }).limit(100);
      _posts = (fresh ?? []).map(rowToPost);
    } else {
      _posts = postRows.map(rowToPost);
    }

    // ── Fetch profile ──
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", _userId)
      .maybeSingle();

    if (profileRow) {
      _profile = {
        id: profileRow.user_id,
        displayName: profileRow.display_name,
        partnerDisplayName: profileRow.partner_display_name ?? undefined,
        ageRange: profileRow.age_range,
        city: profileRow.city,
        country: profileRow.country,
        relationshipStage: profileRow.relationship_stage,
      };
    }

    _initialized = true;
    emit();
  } catch (err) {
    console.error("[store] init error:", err);
    _initializing = false;
  }
}

// ── Write operations ──────────────────────────────────────────────────────────
export async function addEntry(e: Entry) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: _userId,
      activity: e.activity,
      amount_cents: e.amountCents,
      currency: e.currency,
      partner_name: e.partnerName,
      mood: e.mood,
      meet_via: e.meetVia ?? null,
      second_date: e.secondDate ?? null,
      note: e.note ?? null,
      city: e.city,
      entry_date: e.entryDate,
      created_at: e.createdAt,
    })
    .select()
    .single();
  if (data && !error) { _entries = [rowToEntry(data), ..._entries]; emit(); }
}

export async function addPost(p: Post) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: _userId, author: p.author, type: p.type, content: p.content, tags: p.tags, upvotes: 1, downvotes: 0, created_at: p.createdAt })
    .select()
    .single();
  if (data && !error) { _posts = [{ ...rowToPost(data), comments: [] }, ..._posts]; emit(); }
}

export async function addComment(postId: string, content: string, author: string) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: _userId, author, content, upvotes: 1, downvotes: 0 })
    .select()
    .single();
  if (data && !error) {
    const comment = { id: data.id, author: data.author, content: data.content, upvotes: data.upvotes, downvotes: data.downvotes, createdAt: data.created_at };
    _posts = _posts.map((p) => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p);
    emit();
  }
}

export async function voteOnPost(id: string, delta: 1 | -1) {
  if (typeof window === "undefined") return;
  // Optimistic update
  _posts = _posts.map((p) =>
    p.id === id
      ? { ...p, upvotes: delta === 1 ? p.upvotes + 1 : p.upvotes, downvotes: delta === -1 ? p.downvotes + 1 : p.downvotes }
      : p
  );
  emit();
  const post = _posts.find((p) => p.id === id);
  if (post) await supabase.from("posts").update({ upvotes: post.upvotes, downvotes: post.downvotes }).eq("id", id);
}

export async function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  await supabase.from("profiles").upsert(
    { user_id: _userId, display_name: p.displayName, partner_display_name: p.partnerDisplayName ?? null, age_range: p.ageRange, city: p.city, country: p.country, relationship_stage: p.relationshipStage },
    { onConflict: "user_id" }
  );
  _profile = p;
  emit();
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    if (!_initialized && !_initializing) initialize();
    return () => { listeners.delete(listener); };
  }, []);
  return { entries: _entries, posts: _posts, profile: _profile, userId: _userId, loading: !_initialized };
}

// Legacy compat
export function ensureSeed() { initialize(); }
