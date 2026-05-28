-- MetricRun — Esquema de base de datos

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default '',
  name text,
  distance_km numeric(5,2) not null,
  duration_seconds integer not null,
  date date not null,
  notes text,
  cadence integer,
  avg_heart_rate integer,
  stride_length_cm numeric(5,1),
  route_data jsonb,
  created_at timestamptz not null default now()
);

-- Migración: añadir columnas si la tabla ya existía sin ellas
alter table runs add column if not exists user_id text not null default '';
alter table runs add column if not exists name text;
alter table runs add column if not exists avg_heart_rate integer;
alter table runs add column if not exists route_data jsonb;

create index if not exists idx_runs_user_date on runs (user_id, date desc);

alter table runs enable row level security;

do $$ begin
  create policy "Users can read own runs"
    on runs for select
    using (user_id = current_setting('app.user_id', true));
exception
  when unique_violation then null;
end $$;

do $$ begin
  create policy "Users can insert own runs"
    on runs for insert
    with check (user_id = current_setting('app.user_id', true));
exception
  when unique_violation then null;
end $$;
