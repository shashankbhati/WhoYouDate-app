import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Entry, Post, Profile } from "./types";
import { seedEntries, seedEntriesIndia, seedEntriesUS, seedEntriesDresden, seedEntriesTabeaShashank, seedPosts } from "./seed";

// ── Module-level cache (shared across all component instances) ──────────────
let _entries: Entry[] = [];
let _posts: Post[] = [];
let _profile: Profile | null = null;
let _userId = "";
let _initializing = false;
let _initialized = false;
// True only after the profile row has actually been fetched from the DB.
// Distinct from _initialized (which flips early once seed data is shown).
let _profileChecked = false;

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
    turningPoint: r.turning_point ?? undefined,
    city: r.city,
    lat: r.lat ?? undefined,
    lon: r.lon ?? undefined,
    entryDate: r.entry_date,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPost(r: any): Post {
  return {
    id: r.id,
    userId: r.user_id,
    author: r.author,
    type: r.type,
    content: r.content,
    tags: r.tags ?? [],
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comments: (r.comments ?? []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
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

// ── Seed guards (settings row per region — UNIQUE constraint blocks race conditions) ──
async function shouldSeed(): Promise<boolean> {
  const { data } = await supabase.from("settings").select("value").eq("key", "seeded").maybeSingle();
  if (data) return false;
  const { error } = await supabase.from("settings").insert({ key: "seeded", value: "1" });
  return !error;
}

async function shouldSeedCountry(key: string): Promise<boolean> {
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  if (data) return false;
  const { error } = await supabase.from("settings").insert({ key, value: "1" });
  return !error;
}

function entryToRow(e: Entry) {
  return {
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
    ...(e.lat != null ? { lat: e.lat } : {}),
    ...(e.lon != null ? { lon: e.lon } : {}),
    ...(e.turningPoint ? { turning_point: e.turningPoint } : {}),
    entry_date: e.entryDate,
    created_at: e.createdAt,
  };
}

// ── Static client-side seed (shown instantly to all visitors, even before DB loads) ──
function buildStaticSeed(): { entries: Entry[]; posts: Post[] } {
  const entries = [
    ...seedEntries(),
    ...seedEntriesIndia(),
    ...seedEntriesUS(),
    ...seedEntriesDresden(),
    ...seedEntriesTabeaShashank(),
  ];
  const posts = seedPosts();
  return { entries, posts };
}

// ── Initialize ───────────────────────────────────────────────────────────────
async function initialize() {
  if (_initialized || _initializing || typeof window === "undefined") return;
  _initializing = true;

  // Phase 1 — instant: render static seed data immediately so no visitor sees a blank page
  if (_entries.length === 0) {
    const { entries, posts } = buildStaticSeed();
    _entries = entries;
    _posts = posts;
    _initialized = true;
    emit();
  }

  try {
    await ensureAuth();

    // ── Fetch entries ──
    const { data: entryRows } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    // ── Seed entries into DB (runs once per region via settings guard) ──
    let seeded = false;

    if (!entryRows || entryRows.length < 50) {
      if (await shouldSeed()) {
        const seeds = seedEntries();
        for (let i = 0; i < seeds.length; i += 100) {
          await supabase.from("entries").insert(seeds.slice(i, i + 100).map(entryToRow));
        }
        seeded = true;
      }
    }

    if (await shouldSeedCountry("seeded_india")) {
      const seeds = seedEntriesIndia();
      for (let i = 0; i < seeds.length; i += 100) {
        await supabase.from("entries").insert(seeds.slice(i, i + 100).map(entryToRow));
      }
      seeded = true;
    }

    if (await shouldSeedCountry("seeded_us")) {
      const seeds = seedEntriesUS();
      for (let i = 0; i < seeds.length; i += 100) {
        await supabase.from("entries").insert(seeds.slice(i, i + 100).map(entryToRow));
      }
      seeded = true;
    }

    if (await shouldSeedCountry("seeded_dresden")) {
      const seeds = seedEntriesDresden();
      for (let i = 0; i < seeds.length; i += 100) {
        await supabase.from("entries").insert(seeds.slice(i, i + 100).map(entryToRow));
      }
      seeded = true;
    }

    if (await shouldSeedCountry("seeded_tabea_shashank")) {
      const seeds = seedEntriesTabeaShashank();
      for (let i = 0; i < seeds.length; i += 100) {
        await supabase.from("entries").insert(seeds.slice(i, i + 100).map(entryToRow));
      }
      seeded = true;
    }

    // Phase 2 — replace with real DB data if available (overrides static seed)
    if (seeded || !entryRows) {
      const { data: fresh } = await supabase.from("entries").select("*").order("created_at", { ascending: false }).limit(2000);
      if (fresh && fresh.length > 0) { _entries = fresh.map(rowToEntry); emit(); }
    } else if (entryRows.length > 0) {
      _entries = entryRows.map(rowToEntry);
      emit();
    }

    // ── Fetch posts ──
    const { data: postRows } = await supabase
      .from("posts")
      .select("*, comments(*)")
      .order("created_at", { ascending: false })
      .limit(100);

    const seedPostList = seedPosts();
    const needsMorePosts = !postRows || postRows.length < seedPostList.length;
    const existingContents = new Set((postRows ?? []).map((r) => r.content as string));

    if (needsMorePosts) {
      for (const p of seedPostList) {
        if (existingContents.has(p.content)) continue;
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
      if (fresh && fresh.length > 0) { _posts = fresh.map(rowToPost); emit(); }
    } else if (postRows && postRows.length > 0) {
      _posts = postRows.map(rowToPost);
      emit();
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
    _profileChecked = true;

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
      ...(e.lat != null ? { lat: e.lat } : {}),
      ...(e.lon != null ? { lon: e.lon } : {}),
      ...(e.turningPoint ? { turning_point: e.turningPoint } : {}),
      entry_date: e.entryDate,
      created_at: e.createdAt,
    })
    .select()
    .single();
  if (data && !error) { _entries = [rowToEntry(data), ..._entries]; emit(); }
}

export async function deleteEntry(id: string) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  await supabase.from("entries").delete().eq("id", id).eq("user_id", _userId);
  _entries = _entries.filter((e) => e.id !== id);
  emit();
}

export async function editEntry(id: string, patch: Partial<Pick<Entry, "amountCents" | "partnerName" | "mood" | "activity">>) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (patch.amountCents != null) row.amount_cents = patch.amountCents;
  if (patch.partnerName != null) row.partner_name = patch.partnerName;
  if (patch.mood != null) row.mood = patch.mood;
  if (patch.activity != null) row.activity = patch.activity;
  await supabase.from("entries").update(row).eq("id", id).eq("user_id", _userId);
  _entries = _entries.map((e) => e.id === id ? { ...e, ...patch } : e);
  emit();
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

export async function deletePost(id: string) {
  if (typeof window === "undefined") return;
  await supabase.from("posts").delete().eq("id", id).eq("user_id", _userId);
  _posts = _posts.filter((p) => p.id !== id);
  emit();
}

// ── Email subscriptions (weekly digest + watch-a-name notifications) ──────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribe(opts: { email: string; watchName?: string; wantsDigest?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined") return { ok: false };
  const email = opts.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  const watch_name = (opts.watchName ?? "").trim().toLowerCase();
  // Ensure we have an (anonymous) auth session so the request runs as the
  // `authenticated` role the RLS policy expects — not an unauthenticated request.
  await ensureAuth();
  // Plain insert (no upsert) to avoid ON CONFLICT interacting with RLS.
  const { error } = await supabase
    .from("subscriptions")
    .insert({ email, watch_name, wants_digest: opts.wantsDigest ?? true });
  if (error) {
    // Duplicate (already subscribed) → treat as success
    if ((error as { code?: string }).code === "23505") return { ok: true };
    console.error("[subscribe] Supabase error:", error);
    const msg = /relation .*subscriptions.* does not exist|schema cache/i.test(error.message)
      ? "Subscriptions table not found — run the migration in Supabase."
      : error.message || "Could not subscribe. Please try again.";
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function deleteComment(postId: string, commentId: string) {
  if (typeof window === "undefined") return;
  await supabase.from("comments").delete().eq("id", commentId).eq("user_id", _userId);
  _posts = _posts.map((p) => p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p);
  emit();
}

export async function editPost(id: string, content: string) {
  if (typeof window === "undefined") return;
  await supabase.from("posts").update({ content }).eq("id", id).eq("user_id", _userId);
  _posts = _posts.map((p) => p.id === id ? { ...p, content } : p);
  emit();
}

export async function editComment(postId: string, commentId: string, content: string) {
  if (typeof window === "undefined") return;
  await supabase.from("comments").update({ content }).eq("id", commentId).eq("user_id", _userId);
  _posts = _posts.map((p) => p.id === postId ? { ...p, comments: p.comments.map((c) => c.id === commentId ? { ...c, content } : c) } : p);
  emit();
}

export async function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  await ensureAuth();
  // Uniqueness check — reject if another user already has this display name
  const { data: taken } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("display_name", p.displayName)
    .neq("user_id", _userId)
    .maybeSingle();
  if (taken) throw new Error("Username already taken");
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
  return { entries: _entries, posts: _posts, profile: _profile, userId: _userId, loading: !_initialized, profileChecked: _profileChecked };
}

// ── Auth state change — reset store when user switches accounts ───────────────
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    const incomingId = session?.user?.id ?? "";
    if (incomingId !== _userId && _initialized) {
      _entries = [];
      _posts = [];
      _profile = null;
      _profileChecked = false;
      _userId = incomingId;
      _initialized = false;
      _initializing = false;
      if (incomingId) initialize();
      else emit();
    }
  });
}

// Legacy compat
export function ensureSeed() { initialize(); }
