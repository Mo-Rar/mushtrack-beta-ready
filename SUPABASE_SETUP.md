# MushTrack - Base communautaire beta

Cette beta peut fonctionner sans base de donnees, mais les interets de course et les sorties ouvertes resteront locaux.
Pour partager ces informations entre utilisateurs, creer un projet Supabase puis ajouter ces tables.

```sql
create table if not exists public.mushtrack_race_interests (
  id bigint generated always as identity primary key,
  race_id text not null,
  race_name text,
  device_id text not null,
  profile_name text,
  region text,
  level text,
  disciplines text,
  status text default 'interesse',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (race_id, device_id)
);

alter table public.mushtrack_race_interests enable row level security;

create table if not exists public.mushtrack_open_runs (
  id text primary key,
  title text not null,
  date date not null,
  type text,
  level text,
  distance numeric,
  location text,
  region text,
  notes text,
  owner_device_id text,
  owner_name text,
  created_at timestamptz default now()
);

create table if not exists public.mushtrack_open_run_participants (
  id bigint generated always as identity primary key,
  open_run_id text not null references public.mushtrack_open_runs(id) on delete cascade,
  device_id text not null,
  profile_name text,
  region text,
  level text,
  disciplines text,
  created_at timestamptz default now(),
  unique (open_run_id, device_id)
);

alter table public.mushtrack_open_runs enable row level security;
alter table public.mushtrack_open_run_participants enable row level security;
```

Dans Vercel, ajouter ces variables d'environnement :

```text
SUPABASE_URL=https://TON-PROJET.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ta_cle_service_role
```

Important : `SUPABASE_SERVICE_ROLE_KEY` reste uniquement cote API Vercel. Ne jamais la mettre dans `app.js`.

Routes utilisees :

- `GET /api/community?raceIds=id1,id2`
- `GET /api/community?kind=open-runs&region=Jura`
- `POST /api/community`
- `GET /api/races`
- `GET /api/races-refresh`
