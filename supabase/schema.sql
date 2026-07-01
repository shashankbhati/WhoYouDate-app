-- ============================================================
-- WhoAmIDating — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Settings (seed guard)
CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name         text NOT NULL,
  partner_display_name text,
  age_range            text NOT NULL DEFAULT '25-34',
  city                 text NOT NULL DEFAULT 'Berlin',
  country              text NOT NULL DEFAULT 'Germany',
  relationship_stage   text NOT NULL DEFAULT 'Dating',
  created_at           timestamptz DEFAULT now()
);

-- Entries
CREATE TABLE IF NOT EXISTS entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity     text NOT NULL,
  amount_cents integer NOT NULL,
  currency     text NOT NULL DEFAULT 'EUR',
  partner_name text NOT NULL,
  mood         integer NOT NULL CHECK (mood BETWEEN 1 AND 5),
  meet_via     text,
  second_date  text CHECK (second_date IN ('yes', 'no', 'together')),
  note         text,
  turning_point text,
  city         text NOT NULL DEFAULT 'Berlin',
  lat          double precision,
  lon          double precision,
  entry_date   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author     text NOT NULL DEFAULT 'anon',
  type       text NOT NULL DEFAULT 'experience',
  content    text NOT NULL,
  tags       text[] DEFAULT '{}',
  upvotes    integer DEFAULT 1,
  downvotes  integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author     text NOT NULL DEFAULT 'anon',
  content    text NOT NULL,
  upvotes    integer DEFAULT 1,
  downvotes  integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Votes (prevents duplicate votes)
CREATE TABLE IF NOT EXISTS votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_id   uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  vote        integer NOT NULL CHECK (vote IN (1, -1)),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, target_id, target_type)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes     ENABLE ROW LEVEL SECURITY;

-- settings: readable by all (seed guard check), writable by anon users
CREATE POLICY "read_settings"   ON settings FOR SELECT USING (true);
CREATE POLICY "insert_settings" ON settings FOR INSERT WITH CHECK (true);

-- profiles
CREATE POLICY "read_all_profiles"   ON profiles FOR SELECT USING (true);
CREATE POLICY "insert_own_profile"  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_profile"  ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- entries: everyone reads (for analytics), only own user writes
CREATE POLICY "read_all_entries"  ON entries FOR SELECT USING (true);
CREATE POLICY "insert_own_entry"  ON entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_entry"  ON entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_entry"  ON entries FOR DELETE USING (auth.uid() = user_id);

-- posts
CREATE POLICY "read_all_posts"   ON posts FOR SELECT USING (true);
CREATE POLICY "insert_own_post"  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_any_post"  ON posts FOR UPDATE USING (true);  -- vote counts
CREATE POLICY "delete_own_post"  ON posts FOR DELETE USING (auth.uid() = user_id);

-- comments
CREATE POLICY "read_all_comments"  ON comments FOR SELECT USING (true);
CREATE POLICY "insert_own_comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_any_comment" ON comments FOR UPDATE USING (true);  -- vote counts

-- votes
CREATE POLICY "read_own_votes"   ON votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_vote"  ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_vote"  ON votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_vote"  ON votes FOR DELETE USING (auth.uid() = user_id);

-- ── Indexes for analytics queries ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS entries_city_idx          ON entries (city);
CREATE INDEX IF NOT EXISTS entries_partner_name_idx  ON entries (partner_name);
CREATE INDEX IF NOT EXISTS entries_activity_idx      ON entries (activity);
CREATE INDEX IF NOT EXISTS entries_created_at_idx    ON entries (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx      ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS comments_post_id_idx      ON comments (post_id);
