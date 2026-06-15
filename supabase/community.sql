-- Tables communauté MushTrack
-- À exécuter dans Supabase → SQL Editor

-- ── Intérêts / inscriptions aux courses ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS mushtrack_race_interests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id     text NOT NULL,
  race_name   text,
  device_id   text NOT NULL,
  profile_name text,
  region      text,
  level       text,
  disciplines text,
  status      text DEFAULT 'interesse', -- 'interesse' ou 'participe'
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (race_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_race_interests_race_id ON mushtrack_race_interests(race_id);

ALTER TABLE mushtrack_race_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read race interests"   ON mushtrack_race_interests FOR SELECT USING (true);
CREATE POLICY "Anon insert race interests" ON mushtrack_race_interests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update race interests" ON mushtrack_race_interests FOR UPDATE USING (true);
CREATE POLICY "Anon delete race interests" ON mushtrack_race_interests FOR DELETE USING (true);

-- ── Sorties ouvertes (open runs) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mushtrack_open_runs (
  id              text PRIMARY KEY,
  title           text NOT NULL,
  date            date NOT NULL,
  type            text,
  level           text,
  distance        numeric DEFAULT 0,
  location        text,
  region          text,
  notes           text,
  owner_device_id text,
  owner_name      text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_open_runs_date   ON mushtrack_open_runs(date);
CREATE INDEX IF NOT EXISTS idx_open_runs_region ON mushtrack_open_runs(region);

ALTER TABLE mushtrack_open_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read open runs"   ON mushtrack_open_runs FOR SELECT USING (true);
CREATE POLICY "Anon insert open runs" ON mushtrack_open_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update open runs" ON mushtrack_open_runs FOR UPDATE USING (true);
CREATE POLICY "Anon delete open runs" ON mushtrack_open_runs FOR DELETE USING (true);

-- ── Participants aux sorties ouvertes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mushtrack_open_run_participants (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  open_run_id text NOT NULL REFERENCES mushtrack_open_runs(id) ON DELETE CASCADE,
  device_id   text NOT NULL,
  profile_name text,
  region      text,
  level       text,
  disciplines text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (open_run_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_open_run_participants_run ON mushtrack_open_run_participants(open_run_id);

ALTER TABLE mushtrack_open_run_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read participants"   ON mushtrack_open_run_participants FOR SELECT USING (true);
CREATE POLICY "Anon insert participants" ON mushtrack_open_run_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update participants" ON mushtrack_open_run_participants FOR UPDATE USING (true);
CREATE POLICY "Anon delete participants" ON mushtrack_open_run_participants FOR DELETE USING (true);
