-- Commentaires sur les activites du fil MushTrack
-- A executer dans Supabase -> SQL Editor

CREATE TABLE IF NOT EXISTS mushtrack_feed_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid NOT NULL REFERENCES mushtrack_feed(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  user_name  text NOT NULL DEFAULT 'Musher',
  text       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON mushtrack_feed_comments(post_id, created_at);

ALTER TABLE mushtrack_feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read comments"   ON mushtrack_feed_comments FOR SELECT USING (true);
CREATE POLICY "Anon insert comments" ON mushtrack_feed_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete comments" ON mushtrack_feed_comments FOR DELETE USING (true);
