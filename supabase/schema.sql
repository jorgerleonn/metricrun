-- MetricRun — Esquema de base de datos

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  distance_km numeric(5,2) not null,
  duration_seconds integer not null,
  date date not null,
  notes text,
  cadence integer,
  stride_length_cm numeric(5,1),
  created_at timestamptz not null default now()
);

create index if not exists idx_runs_user_date on runs (user_id, date desc);

alter table runs enable row level security;

create policy "Users can read own runs"
  on runs for select
  using (user_id = current_setting('app.user_id', true));

create policy "Users can insert own runs"
  on runs for insert
  with check (user_id = current_setting('app.user_id', true));
