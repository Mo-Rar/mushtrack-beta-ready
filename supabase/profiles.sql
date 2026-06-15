-- Table profils publics MushTrack
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS mushtrack_profiles (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug       text NOT NULL UNIQUE,
  data       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_slug_idx ON mushtrack_profiles(slug);

ALTER TABLE mushtrack_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture publique (page /musher.html accessible à tous)
CREATE POLICY "Anon can read profiles" ON mushtrack_profiles
  FOR SELECT USING (true);

-- Insertion/mise à jour via service role uniquement (depuis l'API)
CREATE POLICY "Service role full access" ON mushtrack_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anon can insert profiles" ON mushtrack_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update profiles" ON mushtrack_profiles
  FOR UPDATE USING (true);
