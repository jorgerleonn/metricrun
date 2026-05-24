-- MetricRun — Esquema de base de datos

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default '',
  distance_km numeric(5,2) not null,
  duration_seconds integer not null,
  date date not null,
  notes text,
  cadence integer,
  stride_length_cm numeric(5,1),
  created_at timestamptz not null default now()
);

-- Migración: añadir user_id si la tabla ya existía sin ella
alter table runs add column if not exists user_id text not null default '';

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
