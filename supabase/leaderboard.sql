-- Table classement mensuel MushTrack
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS mushtrack_leaderboard (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id  text NOT NULL,
  name       text NOT NULL,
  region     text DEFAULT '',
  month_km   numeric(8,1) NOT NULL DEFAULT 0,
  month      text NOT NULL,  -- format YYYY-MM
  updated_at timestamptz DEFAULT now(),
  UNIQUE (device_id, month)
);

CREATE INDEX IF NOT EXISTS leaderboard_month_idx ON mushtrack_leaderboard(month);
CREATE INDEX IF NOT EXISTS leaderboard_km_idx    ON mushtrack_leaderboard(month_km DESC);

ALTER TABLE mushtrack_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON mushtrack_leaderboard
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anon can insert" ON mushtrack_leaderboard
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update own" ON mushtrack_leaderboard
  FOR UPDATE USING (true);

CREATE POLICY "Anon can read all" ON mushtrack_leaderboard
  FOR SELECT USING (true);
