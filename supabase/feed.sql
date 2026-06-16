-- Réseau social MushTrack — fil d'activité
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS mushtrack_feed (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id   text NOT NULL,
  user_name   text NOT NULL DEFAULT 'Musher',
  region      text DEFAULT '',
  level       text DEFAULT '',
  km          numeric DEFAULT 0,
  duration    integer DEFAULT 0,   -- secondes
  type        text DEFAULT '',
  dog_names   text DEFAULT '',     -- "Rex, Luna, Max"
  dog_count   integer DEFAULT 0,
  notes       text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_created ON mushtrack_feed(created_at DESC);

ALTER TABLE mushtrack_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read feed"   ON mushtrack_feed FOR SELECT USING (true);
CREATE POLICY "Anon insert feed" ON mushtrack_feed FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete feed" ON mushtrack_feed FOR DELETE USING (true);

-- Réactions 🐕
CREATE TABLE IF NOT EXISTS mushtrack_feed_reactions (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id   uuid NOT NULL REFERENCES mushtrack_feed(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  UNIQUE (post_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_post ON mushtrack_feed_reactions(post_id);

ALTER TABLE mushtrack_feed_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read reactions"   ON mushtrack_feed_reactions FOR SELECT USING (true);
CREATE POLICY "Anon insert reactions" ON mushtrack_feed_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete reactions" ON mushtrack_feed_reactions FOR DELETE USING (true);
