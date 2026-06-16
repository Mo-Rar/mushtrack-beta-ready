-- Defis hebdomadaires + Clubs MushTrack
-- A executer dans Supabase -> SQL Editor

-- ── Defis ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mushtrack_challenges (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text DEFAULT '',
  target_km   numeric NOT NULL DEFAULT 100,
  week_start  date NOT NULL,   -- lundi de la semaine
  week_end    date NOT NULL,   -- dimanche
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_week ON mushtrack_challenges(week_start);

ALTER TABLE mushtrack_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read challenges"   ON mushtrack_challenges FOR SELECT USING (true);
CREATE POLICY "Anon insert challenges" ON mushtrack_challenges FOR INSERT WITH CHECK (true);

-- Seed : defi de la semaine courante (ajuste la date si besoin)
INSERT INTO mushtrack_challenges (title, description, target_km, week_start, week_end)
VALUES (
  'Defi 100 km',
  'Atteins 100 km en sortie cette semaine avec ton attelage !',
  100,
  date_trunc('week', now())::date,
  (date_trunc('week', now()) + interval '6 days')::date
) ON CONFLICT (week_start) DO NOTHING;

CREATE TABLE IF NOT EXISTS mushtrack_challenge_entries (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES mushtrack_challenges(id) ON DELETE CASCADE,
  device_id    text NOT NULL,
  user_name    text NOT NULL DEFAULT 'Musher',
  km           numeric DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (challenge_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_challenge ON mushtrack_challenge_entries(challenge_id, km DESC);

ALTER TABLE mushtrack_challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read entries"   ON mushtrack_challenge_entries FOR SELECT USING (true);
CREATE POLICY "Anon insert entries" ON mushtrack_challenge_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update entries" ON mushtrack_challenge_entries FOR UPDATE USING (true);
CREATE POLICY "Anon delete entries" ON mushtrack_challenge_entries FOR DELETE USING (true);

-- ── Clubs ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mushtrack_clubs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  description     text DEFAULT '',
  code            text NOT NULL UNIQUE,  -- code invitation 6 chars
  owner_device_id text NOT NULL,
  owner_name      text NOT NULL DEFAULT 'Musher',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clubs_code ON mushtrack_clubs(code);

ALTER TABLE mushtrack_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read clubs"   ON mushtrack_clubs FOR SELECT USING (true);
CREATE POLICY "Anon insert clubs" ON mushtrack_clubs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mushtrack_club_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    uuid NOT NULL REFERENCES mushtrack_clubs(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  user_name  text NOT NULL DEFAULT 'Musher',
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (club_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_members_club ON mushtrack_club_members(club_id);

ALTER TABLE mushtrack_club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read members"   ON mushtrack_club_members FOR SELECT USING (true);
CREATE POLICY "Anon insert members" ON mushtrack_club_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete members" ON mushtrack_club_members FOR DELETE USING (true);
