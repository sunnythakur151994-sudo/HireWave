-- Production-oriented Postgres schema for HireWave v0.1.1.
-- The included MVP runtime still uses the JSON FileStorage adapter.
-- Before production, implement a Postgres storage adapter and use a managed secret store/KMS for connector credentials.

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'trial',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  name text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists plugin_connections (
  org_id uuid not null references organizations(id) on delete cascade,
  plugin_id text not null,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  primary key (org_id, plugin_id)
);

create table if not exists connector_credentials (
  org_id uuid not null references organizations(id) on delete cascade,
  plugin_id text not null,
  encrypted_secret text not null,
  updated_at timestamptz not null default now(),
  primary key (org_id, plugin_id)
);

create table if not exists jobs (
  org_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  title text not null, raw_text text not null,
  must_have jsonb not null default '[]',
  nice_to_have jsonb not null default '[]',
  min_years int, seniority text,
  remote boolean not null default false,
  location text, salary text,
  created_at timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists sourcing_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  job_id text not null,
  plugin_ids jsonb not null,
  status text not null default 'running',
  total_found int not null default 0, slate_size int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists candidates (
  org_id uuid not null references organizations(id) on delete cascade,
  id text not null, name text not null,
  title text, headline text, company text, location text,
  skills jsonb not null default '[]',
  years_experience numeric, email text,
  links jsonb not null default '[]',
  summary text,
  sources jsonb not null default '[]',
  profile_fields jsonb not null default '[]', -- v0.3 field-level provenance; schema not yet wired
  created_at timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists candidate_scores (
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid not null references sourcing_runs(id) on delete cascade,
  candidate_id text not null,
  score int not null,
  breakdown jsonb not null,
  matched jsonb not null default '[]',
  missing jsonb not null default '[]',
  reasons jsonb not null default '[]',
  primary key (run_id, candidate_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id text not null, job_id text not null,
  channel text not null, subject text, body text not null,
  created_at timestamptz not null default now()
);

create table if not exists suppressed (
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id text not null,
  email_hash text,
  created_at timestamptz not null default now(),
  primary key (org_id, candidate_id)
);

create table if not exists usage_counters (
  org_id uuid not null references organizations(id) on delete cascade,
  month text not null,
  searches_used int not null default 0,
  primary key (org_id, month)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_candidates_org on candidates(org_id);
create index if not exists idx_runs_org_job on sourcing_runs(org_id, job_id, created_at desc);
create index if not exists idx_audit_org_time on audit_events(org_id, created_at desc);
