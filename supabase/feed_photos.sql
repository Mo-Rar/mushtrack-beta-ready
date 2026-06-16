-- Migration : photos dans le fil d'activité
-- À exécuter dans Supabase → SQL Editor

-- 1. Colonne photo_url dans mushtrack_feed
ALTER TABLE mushtrack_feed ADD COLUMN IF NOT EXISTS photo_url text DEFAULT '';

-- 2. Bucket de stockage public pour les photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mushtrack-photos', 'mushtrack-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Politique : tout le monde peut lire
CREATE POLICY "Public read photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mushtrack-photos');

-- 4. Politique : upload autorisé (anon)
CREATE POLICY "Anon upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mushtrack-photos');

-- 5. Politique : suppression autorisée (anon)
CREATE POLICY "Anon delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'mushtrack-photos');
