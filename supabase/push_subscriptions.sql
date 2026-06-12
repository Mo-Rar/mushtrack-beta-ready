-- Table pour stocker les abonnements push Web
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint    text UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index pour rechercher par user_id
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- RLS : la clé service_role (côté API) peut tout lire/écrire
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture : service_role uniquement (cron job)
CREATE POLICY "Service role full access" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Insert public : l'app (anon) peut s'abonner
CREATE POLICY "Anon can insert subscription" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Upsert via anon key
CREATE POLICY "Anon can update own subscription" ON push_subscriptions
  FOR UPDATE USING (true);
