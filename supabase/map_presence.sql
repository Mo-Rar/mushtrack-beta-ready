-- Carte des mushers — présence opt-in
-- A executer dans Supabase -> SQL Editor

CREATE TABLE IF NOT EXISTS mushtrack_map_presence (
  device_id  text PRIMARY KEY,
  user_name  text NOT NULL DEFAULT 'Musher',
  region     text DEFAULT '',
  lat        numeric(8,4) NOT NULL,  -- arrondi au 0.5 degre (~50 km)
  lon        numeric(8,4) NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mushtrack_map_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read presence"   ON mushtrack_map_presence FOR SELECT USING (true);
CREATE POLICY "Anon upsert presence" ON mushtrack_map_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update presence" ON mushtrack_map_presence FOR UPDATE USING (true);
CREATE POLICY "Anon delete presence" ON mushtrack_map_presence FOR DELETE USING (true);
